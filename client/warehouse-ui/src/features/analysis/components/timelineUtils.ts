import { HandshakeRecord } from '../types';

export interface ParsedEvent {
  ts: string;
  timeMs: number;
  direction: 'READ' | 'WRITE' | 'SYSTEM';
  tag: string;
  name: string;
  val: string;
  originalIndex: number;
}

export interface Milestone {
  timeMs: number;
  label: string; // HH:MM:SS.mmm
  relativeSec: string; // +X.XXXs
  color: string;
  sublabel: string;
}

export interface StaggeredMilestone extends Milestone {
  x: number;
  badgeX: number;
  badgeY: number;
  guideY1: number;
}

export interface TimeTick {
  x: number;
  timeStr: string; // HH:MM:SS.mmm
  relativeStr: string; // +X.XXXs
  ms: number;
}

/**
 * Parses timestamp string into exact epoch milliseconds (0.001s resolution).
 * Handles ISO strings and standard industrial PLC log timestamps: "YYYY-MM-DD HH:MM:SS.mmm"
 */
export function parseTs(tsStr?: string | null): number {
  if (!tsStr) return 0;
  const cleaned = tsStr.trim().replace(' ', 'T');
  const t = new Date(cleaned).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Formats epoch milliseconds into wall-clock time string "HH:MM:SS.mmm" (0.001s precision).
 */
export function formatWallClock(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Formats duration / offset in milliseconds to seconds with 0.001s resolution:
 * e.g. 108 ms -> "+0.108s", 7462 ms -> "+7.462s"
 */
export function formatDeltaSec(deltaMs: number): string {
  const sign = deltaMs >= 0 ? '+' : '-';
  const absSec = (Math.abs(deltaMs) / 1000).toFixed(3);
  return `${sign}${absSec}s`;
}

/**
 * Formats duration in milliseconds to seconds with 3 decimal places (0.001s precision):
 * e.g. 108 -> "0.108s"
 */
export function formatSeconds3Dec(ms: number): string {
  return `${(ms / 1000).toFixed(3)}s`;
}

/**
 * Extracts key lifecycle milestones from handshake record and parsed events.
 */
export function extractMilestones(
  _record: HandshakeRecord,
  parsedEvents: ParsedEvent[],
  cycleStartMs: number,
  cycleEndMs: number,
  hsStartMs: number,
  hsEndMs: number
): Milestone[] {
  const res: Milestone[] = [];

  const add = (timeMs: number, color: string, sublabel: string) => {
    if (timeMs <= 0) return;
    const relMs = timeMs - cycleStartMs;
    res.push({
      timeMs,
      label: formatWallClock(timeMs),
      relativeSec: formatDeltaSec(relMs),
      color,
      sublabel
    });
  };

  // 1. Cycle Start (State 4 or 5)
  if (cycleStartMs > 0) {
    add(cycleStartMs, '#3b82f6', 'Docked (S=4/5)');
  }

  // 2. PLC Req=1
  const evReq1 = parsedEvents.find(e => e.name === 'Request_For_Destination' && e.val === '1');
  const tReq1 = evReq1 ? evReq1.timeMs : hsStartMs;
  if (tReq1 > cycleStartMs) {
    add(tReq1, '#f59e0b', 'PLC Req=1');
  }

  // 3. mWCS Destination write
  const evDest = parsedEvents.find(e => e.direction === 'WRITE' && e.name === 'Destination' && e.val !== '0');
  if (evDest && evDest.timeMs >= tReq1) {
    add(evDest.timeMs, '#38bdf8', `mWCS Dest=${evDest.val}`);
  }

  // 4. mWCS Request_For_Destination_Ack write
  const evAck = parsedEvents.find(e => e.direction === 'WRITE' && e.name === 'Request_For_Destination_Ack' && e.val !== '0');
  if (evAck && evAck.timeMs >= tReq1 && (!evDest || Math.abs(evAck.timeMs - evDest.timeMs) > 2)) {
    add(evAck.timeMs, '#06b6d4', `mWCS Ack=${evAck.val}`);
  }

  // 5. PLC Req=99 (Acknowledge)
  const evReq99 = parsedEvents.find(e => e.name === 'Request_For_Destination' && e.val === '99');
  if (evReq99 && evReq99.timeMs > tReq1) {
    add(evReq99.timeMs, '#f97316', 'PLC Req=99');
  }

  // 6. PLC Req=0 (Handshake Cleared)
  const evReq0 = parsedEvents.find(e => e.name === 'Request_For_Destination' && e.val === '0' && e.timeMs > tReq1);
  const tReq0 = evReq0 ? evReq0.timeMs : hsEndMs;
  if (tReq0 > tReq1) {
    add(tReq0, '#10b981', 'PLC Req=0');
  }

  // 7. Physical Transfer (State=8)
  const evState8 = parsedEvents.find(e => e.name === 'State' && e.val === '8');
  if (evState8 && evState8.timeMs >= tReq0) {
    add(evState8.timeMs, '#8b5cf6', 'Transfer (S=8)');
  }

  // 8. Cycle Complete (State=1)
  if (cycleEndMs > tReq0) {
    add(cycleEndMs, '#10b981', 'Cleared (S=1)');
  }

  // Sort by timeMs ascending
  res.sort((a, b) => a.timeMs - b.timeMs);
  return res;
}

/**
 * Vertically staggers top milestone badges if adjacent badges are within minSpacingPx.
 * This guarantees that close events (e.g. 1ms - 108ms apart) never visually overlap!
 */
export function computeStaggeredMilestones(
  milestones: Milestone[],
  timeToX: (t: number) => number,
  chartLeft: number,
  chartRight: number,
  minSpacingPx = 64
): StaggeredMilestone[] {
  const result: StaggeredMilestone[] = [];
  let lastX = -9999;
  let currentTier = 0;

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    const x = timeToX(m.timeMs);
    if (x < chartLeft - 25 || x > chartRight + 25) continue;

    // Check collision with previous badge
    if (Math.abs(x - lastX) < minSpacingPx) {
      currentTier = (currentTier + 1) % 2;
    } else {
      currentTier = 0;
    }
    lastX = x;

    const badgeW = 66;
    const badgeH = 22;
    const badgeX = Math.max(chartLeft, Math.min(chartRight - badgeW, x - badgeW / 2));
    // Tier 0 at Y = 2, Tier 1 at Y = 16
    const badgeY = currentTier === 0 ? 2 : 16;
    const guideY1 = badgeY + badgeH;

    result.push({
      ...m,
      x,
      badgeX,
      badgeY,
      guideY1
    });
  }

  return result;
}

/**
 * Computes wall-clock time ticks for the visible range with 0.001s measuring resolution.
 */
export function computeTimeTicks(
  viewStartMs: number,
  viewSpanMs: number,
  chartLeft: number,
  chartW: number,
  count = 6
): TimeTick[] {
  const ticks: TimeTick[] = [];
  const step = viewSpanMs / (count - 1);
  for (let i = 0; i < count; i++) {
    const ms = viewStartMs + i * step;
    ticks.push({
      x: chartLeft + (i / (count - 1)) * chartW,
      timeStr: formatWallClock(ms),
      relativeStr: formatDeltaSec(ms - viewStartMs),
      ms
    });
  }
  return ticks;
}
