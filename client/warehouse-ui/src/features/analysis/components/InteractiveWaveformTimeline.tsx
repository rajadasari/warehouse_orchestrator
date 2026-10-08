import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { HandshakeRecord } from '../types';
import {
  ParsedEvent,
  parseTs,
  formatWallClock,
  formatDeltaSec,
  extractMilestones,
  computeStaggeredMilestones,
  computeTimeTicks,
  formatSeconds3Dec
} from './timelineUtils';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineLatencyCards } from './TimelineLatencyCards';
import { WaveformTrackState } from './WaveformTrackState';
import { WaveformTrackHandshake } from './WaveformTrackHandshake';

interface InteractiveWaveformTimelineProps {
  record: HandshakeRecord;
  activeEventIndex: number | null;
  onHoverEventIndex: (index: number | null) => void;
  onSelectEventIndex?: (index: number) => void;
}

export const InteractiveWaveformTimeline: React.FC<InteractiveWaveformTimelineProps> = ({
  record,
  activeEventIndex,
  onHoverEventIndex,
  onSelectEventIndex
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const waveformWrapperRef = useRef<HTMLDivElement | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [panRatio, setPanRatio] = useState<number>(0.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMinimapDragging, setIsMinimapDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialPanRatio, setInitialPanRatio] = useState<number>(0);
  const [cursorX, setCursorX] = useState<number | null>(null);

  // Reset zoom on record change
  useEffect(() => {
    setZoom(1.0);
    setPanRatio(0.0);
    setCursorX(null);
  }, [record.id]);

  // Extract parsed events with 0.001s millisecond resolution
  const parsedEvents: ParsedEvent[] = useMemo(() => {
    const list = record.events || [];
    return list.map((e, idx) => ({
      ...e,
      originalIndex: idx,
      timeMs: parseTs(e.ts)
    })).filter(e => e.timeMs > 0);
  }, [record.events]);

  // Calculate overall time bounds for this transaction cycle
  const { cycleStartMs, cycleEndMs, totalCycleSpanMs } = useMemo(() => {
    const tCycleStart = parseTs(record.cycle_start_time || record.start_time);
    const tCycleEnd = parseTs(record.cycle_end_time || record.end_time);
    
    let minT = tCycleStart > 0 ? tCycleStart : (parsedEvents.length > 0 ? parsedEvents[0].timeMs : Date.now());
    let maxT = tCycleEnd > 0 ? tCycleEnd : (parsedEvents.length > 0 ? parsedEvents[parsedEvents.length - 1].timeMs : minT + 10000);

    if (parsedEvents.length > 0) {
      const minEv = Math.min(...parsedEvents.map(e => e.timeMs));
      const maxEv = Math.max(...parsedEvents.map(e => e.timeMs));
      if (minEv < minT) minT = minEv;
      if (maxEv > maxT) maxT = maxEv;
    }

    if (maxT <= minT) {
      maxT = minT + Math.max(record.cycle_duration_ms || 10000, 2000);
    }

    return {
      cycleStartMs: minT,
      cycleEndMs: maxT,
      totalCycleSpanMs: Math.max(maxT - minT, 1000)
    };
  }, [record, parsedEvents]);

  // Max zoom allows inspecting down to 2ms window (0.001s sub-millisecond edge inspection)
  const maxZoom = useMemo(() => {
    return Math.max(1000, Math.ceil(totalCycleSpanMs / 2));
  }, [totalCycleSpanMs]);

  // Visible time window based on Zoom & Pan (min span 2ms)
  const { viewStartMs, viewSpanMs } = useMemo(() => {
    const span = Math.max(2, totalCycleSpanMs / zoom);
    const maxOffset = totalCycleSpanMs - span;
    const currentStart = cycleStartMs + panRatio * maxOffset;
    return {
      viewStartMs: currentStart,
      viewSpanMs: span
    };
  }, [cycleStartMs, totalCycleSpanMs, zoom, panRatio]);

  // Chart layout dimensions
  const svgW = 880;
  const svgH = 340;
  const chartLeft = 145;
  const chartRight = 855;
  const chartW = chartRight - chartLeft;

  // Coordinate conversion functions (floating point with 0.001s resolution)
  const timeToX = useCallback((tMs: number): number => {
    return chartLeft + ((tMs - viewStartMs) / viewSpanMs) * chartW;
  }, [chartLeft, chartW, viewStartMs, viewSpanMs]);

  const xToTime = useCallback((x: number): number => {
    const ratio = Math.max(0, Math.min(1, (x - chartLeft) / chartW));
    return viewStartMs + ratio * viewSpanMs;
  }, [chartLeft, chartW, viewStartMs, viewSpanMs]);

  // Generate wall-clock & relative time ticks across visible X axis
  const timeTicks = useMemo(() => {
    return computeTimeTicks(viewStartMs, viewSpanMs, chartLeft, chartW, 6);
  }, [chartLeft, chartW, viewStartMs, viewSpanMs]);

  // Handshake and State Phase Boundaries
  const hsStartMs = parseTs(record.start_time) || (cycleStartMs + (record.dwell_duration_ms || 1000));
  const hsEndMs = parseTs(record.end_time) || (hsStartMs + (record.protocol_duration_ms || 2000));

  // Key milestones with staggered badges to prevent overlap on close events
  const rawMilestones = useMemo(() => {
    return extractMilestones(record, parsedEvents, cycleStartMs, cycleEndMs, hsStartMs, hsEndMs);
  }, [record, parsedEvents, cycleStartMs, cycleEndMs, hsStartMs, hsEndMs]);

  const staggeredMilestones = useMemo(() => {
    return computeStaggeredMilestones(rawMilestones, timeToX, chartLeft, chartRight, 64);
  }, [rawMilestones, timeToX, chartLeft, chartRight]);

  // Timestamps for Track 2 handshake signal steps
  const evReq1 = parsedEvents.find(e => e.name === 'Request_For_Destination' && e.val === '1');
  const tReq1 = evReq1 ? evReq1.timeMs : hsStartMs;

  const evReq99 = parsedEvents.find(e => e.name === 'Request_For_Destination' && e.val === '99');
  const tReq99 = evReq99 ? evReq99.timeMs : (tReq1 + (hsEndMs - tReq1) * 0.6);

  const evReq0 = parsedEvents.find(e => e.name === 'Request_For_Destination' && e.val === '0' && e.timeMs > tReq1);
  const tReq0 = evReq0 ? evReq0.timeMs : hsEndMs;

  const evDest = parsedEvents.find(e => e.direction === 'WRITE' && e.name === 'Destination' && e.val !== '0');
  const tDest = evDest ? evDest.timeMs : (tReq1 + 1000);

  const evDestClear = parsedEvents.find(e => e.direction === 'WRITE' && e.name === 'Destination' && e.val === '0' && e.timeMs > tDest);
  const tDestClear = evDestClear ? evDestClear.timeMs : tReq0;

  // X-coordinates with minimum step separation (guarantees discrete visual steps for 0.001s changes)
  const x0 = timeToX(cycleStartMs);
  const xReq1 = timeToX(tReq1);
  const xDest = timeToX(tDest);
  const xReq99 = timeToX(tReq99);
  const xReq0 = timeToX(tReq0);
  const xDestClear = timeToX(tDestClear);
  const x3 = timeToX(cycleEndMs);

  // Effective coordinates ensuring minimum plateau of 4px for rapid transitions
  const effXDest = Math.min(chartRight, Math.max(chartLeft, xDest));
  const effXDestClear = Math.min(chartRight, Math.max(effXDest + 4, xDestClear));
  const effXReq1 = Math.min(chartRight, Math.max(chartLeft, xReq1));
  const effXReq99 = Math.min(chartRight, Math.max(effXReq1 + 4, xReq99));
  const effXReq0 = Math.min(chartRight, Math.max(effXReq99 + 4, xReq0));

  const isMidFault = record.failure_reason?.includes('MID_CYCLE_FAULT');

  // Focus zoom on active handshake window (Req=1 -> Ack/Dest -> Req=0)
  const handleZoomHandshake = useCallback(() => {
    const hsSpan = Math.max(hsEndMs - hsStartMs, 500);
    const targetZoom = Math.min(maxZoom, Math.max(1.0, totalCycleSpanMs / (hsSpan * 1.5)));
    const targetSpan = Math.max(2, totalCycleSpanMs / targetZoom);
    const centerTime = (hsStartMs + hsEndMs) / 2;
    const targetStart = centerTime - targetSpan / 2;
    const maxOffset = totalCycleSpanMs - targetSpan;
    const targetPan = maxOffset > 0 ? (targetStart - cycleStartMs) / maxOffset : 0;
    setZoom(targetZoom);
    setPanRatio(Math.max(0, Math.min(1, targetPan)));
  }, [hsStartMs, hsEndMs, totalCycleSpanMs, cycleStartMs, maxZoom]);

  // High-precision focal zoom & horizontal pan native wheel handler
  const handleNativeWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Horizontal Scroll (Shift + Wheel, or horizontal trackpad delta)
    const isHorizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (isHorizontal) {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      setZoom(currZoom => {
        const curSpan = Math.max(2, totalCycleSpanMs / currZoom);
        const maxOffset = totalCycleSpanMs - curSpan;
        if (maxOffset > 0) {
          const timeOffset = (delta / 250) * curSpan;
          const deltaPan = timeOffset / maxOffset;
          setPanRatio(p => Math.max(0, Math.min(1, p + deltaPan)));
        }
        return currZoom;
      });
      return;
    }

    // 2. Vertical Wheel: Focal Zoom centered at mouse cursor position
    const rect = svgRef.current?.getBoundingClientRect();
    let chartRatio = 0.5;
    if (rect && rect.width > 0) {
      const clientX = e.clientX - rect.left;
      const svgScale = svgW / rect.width;
      const scaledX = clientX * svgScale;
      if (scaledX >= chartLeft && scaledX <= chartRight) {
        chartRatio = (scaledX - chartLeft) / chartW;
      }
    }

    // Zoom multiplier
    const factor = e.deltaY < 0 ? 1.25 : 0.8;

    setZoom(prevZoom => {
      const nextZoom = Math.min(maxZoom, Math.max(1.0, prevZoom * factor));
      if (nextZoom === prevZoom) return prevZoom;

      const curSpan = Math.max(2, totalCycleSpanMs / prevZoom);
      const curMaxOffset = totalCycleSpanMs - curSpan;
      const curStart = cycleStartMs + panRatio * curMaxOffset;
      const focalTime = curStart + chartRatio * curSpan;

      const nextSpan = Math.max(2, totalCycleSpanMs / nextZoom);
      const nextMaxOffset = totalCycleSpanMs - nextSpan;
      if (nextMaxOffset > 0) {
        const nextStart = focalTime - chartRatio * nextSpan;
        const nextPan = (nextStart - cycleStartMs) / nextMaxOffset;
        setPanRatio(Math.max(0, Math.min(1, nextPan)));
      } else {
        setPanRatio(0);
      }

      return nextZoom;
    });
  }, [totalCycleSpanMs, cycleStartMs, panRatio, maxZoom, chartLeft, chartRight, chartW, svgW]);

  // Non-passive wheel event listener to completely eliminate vertical page scrolling
  useEffect(() => {
    const el = waveformWrapperRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [handleNativeWheel]);

  // Mouse drag handlers for scrubbing & panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const svgScale = svgW / rect.width;
    const scaledX = clientX * svgScale;
    const scaledY = clientY * svgScale;

    // Check if clicking on bottom minimap rail (Y: 290 to 320)
    if (scaledY >= 290 && scaledY <= 320 && scaledX >= chartLeft && scaledX <= chartRight) {
      setIsMinimapDragging(true);
      const thumbW = Math.max(20, chartW / zoom);
      const availableW = chartW - thumbW;
      if (availableW > 0) {
        const targetX = scaledX - chartLeft - thumbW / 2;
        const newPan = Math.max(0, Math.min(1, targetX / availableW));
        setPanRatio(newPan);
      }
      return;
    }

    // Main chart 1:1 drag
    if (scaledX >= chartLeft && scaledX <= chartRight) {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setInitialPanRatio(panRatio);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgScale = svgW / rect.width;
    const scaledX = clientX * svgScale;

    if (scaledX >= chartLeft && scaledX <= chartRight) {
      setCursorX(scaledX);
      const curTime = xToTime(scaledX);
      
      // Find closest event
      if (parsedEvents.length > 0) {
        let closestIdx = parsedEvents[0].originalIndex;
        let minDiff = Math.abs(parsedEvents[0].timeMs - curTime);
        for (const ev of parsedEvents) {
          const diff = Math.abs(ev.timeMs - curTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = ev.originalIndex;
          }
        }
        onHoverEventIndex(closestIdx);
      }
    } else {
      setCursorX(null);
      onHoverEventIndex(null);
    }

    if (isMinimapDragging) {
      const thumbW = Math.max(20, chartW / zoom);
      const availableW = chartW - thumbW;
      if (availableW > 0) {
        const targetX = scaledX - chartLeft - thumbW / 2;
        const newPan = Math.max(0, Math.min(1, targetX / availableW));
        setPanRatio(newPan);
      }
      return;
    }

    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const pxScale = rect.width / svgW;
      const chartWidthPx = chartW * pxScale;
      const maxOffset = totalCycleSpanMs - viewSpanMs;
      if (maxOffset > 0 && chartWidthPx > 0) {
        const timeDelta = - (dx / chartWidthPx) * viewSpanMs;
        const panDelta = timeDelta / maxOffset;
        setPanRatio(Math.max(0, Math.min(1, initialPanRatio + panDelta)));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsMinimapDragging(false);
    if (activeEventIndex != null && onSelectEventIndex) {
      onSelectEventIndex(activeEventIndex);
    }
  };

  // Keyboard navigation for horizontal precision
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const panStep = 0.1 / zoom;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPanRatio(p => Math.max(0, p - panStep));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPanRatio(p => Math.min(1, p + panStep));
    } else if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoom(z => Math.min(maxZoom, z * 1.3));
    } else if (e.key === 'ArrowDown' || e.key === '-') {
      e.preventDefault();
      setZoom(z => Math.max(1, z / 1.3));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPanRatio(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPanRatio(1);
    } else if (e.key === '0') {
      e.preventDefault();
      setZoom(1.0);
      setPanRatio(0.0);
    }
  };

  // Active event coordinate for crosshair synchronization
  const activeEvtTime = activeEventIndex != null && record.events && record.events[activeEventIndex]
    ? parseTs(record.events[activeEventIndex].ts)
    : null;
  const activeEvtX = activeEvtTime ? timeToX(activeEvtTime) : null;

  // Track 2 Vertical Geometry
  const yCenter = 150;
  const yMwcsBase = 144;
  const yMwcsPulse = 114;
  const yPlcBase = 156;
  const yPlcStep1 = 176;   // Req = 1
  const yPlcStep99 = 196;  // Req = 99

  // Cursor scrub time info
  const cursorTime = cursorX != null ? xToTime(cursorX) : null;
  const cursorDeltaSec = cursorTime != null ? formatDeltaSec(cursorTime - cycleStartMs) : '';

  return (
    <div 
      ref={containerRef}
      style={{
        backgroundColor: '#090d16',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Waveform Controls Toolbar */}
      <TimelineToolbar
        zoom={zoom}
        maxZoom={maxZoom}
        panRatio={panRatio}
        viewSpanMs={viewSpanMs}
        totalCycleSpanMs={totalCycleSpanMs}
        onZoomIn={() => setZoom(z => Math.min(maxZoom, z * 1.5))}
        onZoomOut={() => setZoom(z => Math.max(1, z / 1.5))}
        onZoomSet={(z) => setZoom(z)}
        onPanLeft={() => setPanRatio(p => Math.max(0, p - 0.15 / zoom))}
        onPanRight={() => setPanRatio(p => Math.min(1, p + 0.15 / zoom))}
        onPanSet={(p) => setPanRatio(p)}
        onZoomHandshake={handleZoomHandshake}
        onReset={() => { setZoom(1.0); setPanRatio(0.0); }}
      />

      {/* Interactive SVG Canvas with Non-Passive Mousewheel & Drag/Pan */}
      <div 
        ref={waveformWrapperRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          overflowX: 'hidden',
          backgroundColor: '#030712',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          cursor: isDragging ? 'grabbing' : isMinimapDragging ? 'ew-resize' : 'crosshair',
          userSelect: 'none',
          touchAction: 'none',
          overscrollBehavior: 'contain',
          outline: 'none'
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); setCursorX(null); }}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Background Canvas */}
          <rect x="0" y="0" width={svgW} height={svgH} fill="#090d16" />

          {/* Top Thin Dotted Milestone Guidelines with Staggered Badges */}
          {staggeredMilestones.map((m, idx) => (
            <g key={idx}>
              {/* Thin dotted line spanning the tracks from badge base down to 250 */}
              <line 
                x1={m.x} 
                y1={m.guideY1} 
                x2={m.x} 
                y2={250} 
                stroke={m.color} 
                strokeDasharray="2 3" 
                strokeWidth="1" 
                opacity="0.65" 
              />
              {/* Milestone Marker Badge at Top */}
              <rect 
                x={m.badgeX} 
                y={m.badgeY} 
                width={66} 
                height={20} 
                rx={3} 
                fill="#0b1120" 
                stroke={m.color} 
                strokeWidth="1" 
              />
              <text 
                x={m.badgeX + 33} 
                y={m.badgeY + 9} 
                fill={m.color} 
                fontSize="7.5" 
                fontWeight="700" 
                textAnchor="middle" 
                fontFamily="monospace"
              >
                {m.label.split(' ')[0] ? m.label.split(' ')[0] : m.label}
              </text>
              <text 
                x={m.badgeX + 33} 
                y={m.badgeY + 17} 
                fill="#cbd5e1" 
                fontSize="6.8" 
                fontWeight="600" 
                textAnchor="middle"
              >
                {m.sublabel}
              </text>
            </g>
          ))}

          {/* ================= TRACK 1: STATION STATE ================= */}
          <WaveformTrackState
            chartLeft={chartLeft}
            chartRight={chartRight}
            x0={x0}
            xReq1={xReq1}
            xReq0={xReq0}
            x3={x3}
            isMidFault={Boolean(isMidFault)}
          />

          {/* ================= TRACK 2: BI-DIRECTIONAL HANDSHAKE SPLIT ================= */}
          <WaveformTrackHandshake
            chartLeft={chartLeft}
            chartRight={chartRight}
            effXDest={effXDest}
            effXDestClear={effXDestClear}
            effXReq1={effXReq1}
            effXReq99={effXReq99}
            effXReq0={effXReq0}
            yCenter={yCenter}
            yMwcsBase={yMwcsBase}
            yMwcsPulse={yMwcsPulse}
            yPlcBase={yPlcBase}
            yPlcStep1={yPlcStep1}
            yPlcStep99={yPlcStep99}
            destination={record.destination}
          />

          {/* ================= TRACK 3: PALLET PRESENCE ================= */}
          <g>
            <text x="10" y="230" fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="sans-serif">Track 3: Pallet</text>
            <text x="10" y="242" fill="#64748b" fontSize="9" fontFamily="sans-serif">Presence Bar</text>

            {/* Pallet Presence Bar */}
            <rect 
              x={Math.max(chartLeft, x0)} 
              y="222" 
              width={Math.max(2, Math.min(chartRight, x3) - Math.max(chartLeft, x0))} 
              height="20" 
              fill="rgba(14, 165, 233, 0.2)" 
              rx="3" 
              stroke="#0ea5e9" 
              strokeWidth="1" 
            />
            <text 
              x={(Math.max(chartLeft, x0) + Math.min(chartRight, x3)) / 2} 
              y="236" 
              fill="#38bdf8" 
              fontSize="9.5" 
              fontWeight="600" 
              textAnchor="middle"
            >
              Pallet Present [{record.pallet_id}] (Docked → Transfer Complete)
            </text>
          </g>

          {/* Synchronized Active Event Line (from table/hover) */}
          {activeEvtX && activeEvtX >= chartLeft && activeEvtX <= chartRight && (
            <g>
              <line 
                x1={activeEvtX} 
                y1={32} 
                x2={activeEvtX} 
                y2={250} 
                stroke="#10b981" 
                strokeWidth="2" 
              />
              <circle cx={activeEvtX} cy="32" r="4" fill="#10b981" />
            </g>
          )}

          {/* Interactive Scrubbing Crosshair Cursor with 0.001s readout */}
          {cursorX && cursorX >= chartLeft && cursorX <= chartRight && cursorTime != null && (
            <g>
              <line 
                x1={cursorX} 
                y1={30} 
                x2={cursorX} 
                y2={250} 
                stroke="#38bdf8" 
                strokeWidth="1.5" 
                strokeDasharray="3 3" 
              />
              <rect 
                x={Math.max(chartLeft, Math.min(chartRight - 110, cursorX - 55))} 
                y={2} 
                width={110} 
                height={20} 
                rx={3} 
                fill="#0f172a" 
                stroke="#38bdf8" 
                strokeWidth="1" 
              />
              <text 
                x={Math.max(chartLeft + 55, Math.min(chartRight - 55, cursorX))} 
                y={11} 
                fill="#38bdf8" 
                fontSize="8.5" 
                fontWeight="700" 
                fontFamily="monospace" 
                textAnchor="middle"
              >
                {formatWallClock(cursorTime)}
              </text>
              <text 
                x={Math.max(chartLeft + 55, Math.min(chartRight - 55, cursorX))} 
                y={19} 
                fill="#94a3b8" 
                fontSize="7.5" 
                fontFamily="monospace" 
                textAnchor="middle"
              >
                Δ {cursorDeltaSec} [0.001s]
              </text>
            </g>
          )}

          {/* ================= HORIZONTAL TIME AXIS AT BOTTOM ================= */}
          <g>
            <line x1={chartLeft} y1={255} x2={chartRight} y2={255} stroke="#334155" strokeWidth="1" />
            {timeTicks.map((tick, idx) => (
              <g key={idx}>
                <line 
                  x1={tick.x} 
                  y1={255} 
                  x2={tick.x} 
                  y2={261} 
                  stroke="#64748b" 
                  strokeWidth="1" 
                />
                {/* Wall clock timestamp */}
                <text 
                  x={tick.x} 
                  y={271} 
                  fill="#94a3b8" 
                  fontSize="9.5" 
                  textAnchor="middle" 
                  fontFamily="monospace"
                >
                  {tick.timeStr}
                </text>
                {/* Relative offset with 0.001s resolution */}
                <text 
                  x={tick.x} 
                  y={282} 
                  fill="#64748b" 
                  fontSize="8" 
                  textAnchor="middle" 
                  fontFamily="monospace"
                >
                  {tick.relativeStr}
                </text>
              </g>
            ))}
          </g>

          {/* Bottom Timeline Interactive Minimap / Overview Scrub Track */}
          <g style={{ cursor: isMinimapDragging ? 'ew-resize' : 'pointer' }}>
            <text x="10" y="306" fill="#64748b" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">Overview Track</text>
            <text x="10" y="316" fill="#475569" fontSize="7.5" fontFamily="sans-serif">Drag to scrub full cycle</text>

            {/* Background Rail */}
            <rect 
              x={chartLeft} 
              y="298" 
              width={chartW} 
              height="14" 
              fill="#0f172a" 
              stroke="#334155"
              strokeWidth="1"
              rx="3" 
            />
            {/* Start & End labels on Rail */}
            <text x={chartLeft + 4} y="309" fill="#64748b" fontSize="8" fontFamily="monospace">0.000s</text>
            <text x={chartRight - 4} y="309" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">
              {formatSeconds3Dec(totalCycleSpanMs)}
            </text>

            {/* Draggable Viewport Window Thumb */}
            <rect 
              x={chartLeft + (panRatio * Math.max(0, chartW - (chartW / zoom)))} 
              y="296" 
              width={Math.max(20, chartW / zoom)} 
              height="18" 
              fill="rgba(56, 189, 248, 0.35)" 
              stroke="#38bdf8" 
              strokeWidth="2" 
              rx="4" 
            />
            {/* Center grip lines */}
            <line 
              x1={chartLeft + (panRatio * Math.max(0, chartW - (chartW / zoom))) + Math.max(20, chartW / zoom) / 2 - 2}
              y1="300"
              x2={chartLeft + (panRatio * Math.max(0, chartW - (chartW / zoom))) + Math.max(20, chartW / zoom) / 2 - 2}
              y2="310"
              stroke="#38bdf8"
              strokeWidth="1"
              opacity="0.8"
            />
            <line 
              x1={chartLeft + (panRatio * Math.max(0, chartW - (chartW / zoom))) + Math.max(20, chartW / zoom) / 2 + 2}
              y1="300"
              x2={chartLeft + (panRatio * Math.max(0, chartW - (chartW / zoom))) + Math.max(20, chartW / zoom) / 2 + 2}
              y2="310"
              stroke="#38bdf8"
              strokeWidth="1"
              opacity="0.8"
            />
          </g>
        </svg>
      </div>

      {/* 4-Phase Latency Indicators with 0.001s Millisecond Precision */}
      <TimelineLatencyCards record={record} />
    </div>
  );
};
