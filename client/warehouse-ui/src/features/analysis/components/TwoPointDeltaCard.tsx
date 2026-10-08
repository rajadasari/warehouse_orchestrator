import React from 'react';
import { 
  Clock, 
  ArrowLeftRight, 
  X, 
  Layers, 
  ArrowRight,
  Crosshair,
  CornerDownRight
} from 'lucide-react';
import { StationTagEvent } from '../types';

interface TwoPointDeltaCardProps {
  markerA: StationTagEvent | null;
  markerB: StationTagEvent | null;
  eventsBetweenCount?: number;
  onClear: () => void;
  onSwap: () => void;
  onJumpToA?: () => void;
  onJumpToB?: () => void;
}

export function parseTimestampMs(ts: string): number {
  if (!ts) return 0;
  const clean = ts.replace(' ', 'T');
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.getTime();
  }
  const match = ts.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.?(\d{0,3})/);
  if (match) {
    const [, y, m, day, h, min, s, ms] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(day),
      Number(h),
      Number(min),
      Number(s),
      Number((ms || '0').padEnd(3, '0'))
    ).getTime();
  }
  return 0;
}

export function formatDurationMs(deltaMs: number): {
  msFormatted: string;
  secFormatted: string;
  clockFormatted: string;
} {
  const abs = Math.abs(deltaMs);
  const msFormatted = `${abs.toLocaleString()} ms`;
  const secFormatted = `${(abs / 1000).toFixed(3)} s`;

  const totalSeconds = Math.floor(abs / 1000);
  const remainderMs = abs % 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const clockFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${remainderMs.toString().padStart(3, '0')}`;

  return { msFormatted, secFormatted, clockFormatted };
}

export const TwoPointDeltaCard: React.FC<TwoPointDeltaCardProps> = ({
  markerA,
  markerB,
  eventsBetweenCount,
  onClear,
  onSwap,
  onJumpToA,
  onJumpToB
}) => {
  if (!markerA && !markerB) {
    return (
      <div style={{
        background: 'var(--bg-card, #181d28)',
        border: '1px dashed var(--border-color, #2a3447)',
        borderRadius: '8px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        color: 'var(--text-secondary, #8fa0b5)',
        fontSize: '13px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crosshair size={18} color="#38bdf8" />
          <span>
            <strong>Two-Point Delta Calculator:</strong> Select <strong>Point A</strong> and <strong>Point B</strong> on any tag events in the grid below to calculate the exact elapsed duration.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', opacity: 0.8 }}>
          <span style={{ padding: '2px 6px', background: '#0284c7', color: '#fff', borderRadius: '4px' }}>Marker A</span>
          <ArrowRight size={12} />
          <span style={{ padding: '2px 6px', background: '#d97706', color: '#fff', borderRadius: '4px' }}>Marker B</span>
        </div>
      </div>
    );
  }

  const msA = markerA ? parseTimestampMs(markerA.timestamp) : 0;
  const msB = markerB ? parseTimestampMs(markerB.timestamp) : 0;
  const hasBoth = Boolean(markerA && markerB);
  const rawDeltaMs = hasBoth ? msB - msA : 0;
  const deltaMs = Math.abs(rawDeltaMs);
  const isForward = rawDeltaMs >= 0;
  const duration = formatDurationMs(deltaMs);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
      border: '1px solid rgba(56, 189, 248, 0.35)',
      borderRadius: '8px',
      padding: '14px 18px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Top row: Comparison Header & Delta Display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Calculation Result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            background: hasBoth ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${hasBoth ? '#38bdf8' : '#64748b'}`
          }}>
            <Clock size={22} color={hasBoth ? '#38bdf8' : '#94a3b8'} />
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 600 }}>
              Elapsed Duration (ΔT)
            </div>
            {hasBoth ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {duration.secFormatted}
                </span>
                <span style={{ fontSize: '14px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                  ({duration.msFormatted})
                </span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isForward ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: isForward ? '#34d399' : '#facc15',
                  border: `1px solid ${isForward ? 'rgba(16, 185, 129, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                  fontWeight: 600
                }}>
                  {isForward ? 'A → B Forward' : 'B → A Reverse'}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#f59e0b', fontStyle: 'italic', marginTop: '2px' }}>
                {markerA ? 'Select Point B to compute delta' : 'Select Point A to compute delta'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Between stats & Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasBoth && typeof eventsBetweenCount === 'number' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '6px',
              border: '1px solid #334155',
              fontSize: '12px',
              color: '#cbd5e1'
            }}>
              <Layers size={14} color="#a5b4fc" />
              <span>Events In-Between: <strong>{eventsBetweenCount}</strong></span>
            </div>
          )}

          {hasBoth && (
            <button
              onClick={onSwap}
              title="Swap Marker A and Marker B"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(51, 65, 85, 0.7)',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 500,
                minHeight: '36px'
              }}
            >
              <ArrowLeftRight size={14} />
              Swap A ⇄ B
            </button>
          )}

          <button
            onClick={onClear}
            title="Clear all markers"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              minHeight: '36px'
            }}
          >
            <X size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Bottom row: Detailed Point A & Point B cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '10px'
      }}>
        {/* Point A Card */}
        <div style={{
          background: 'rgba(14, 165, 233, 0.1)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#0284c7',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700
            }}>
              A
            </span>
            <div style={{ minWidth: 0 }}>
              {markerA ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8', fontSize: '13px' }}>
                      {markerA.timestamp}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: markerA.direction === 'WRITE' ? '#0369a1' : '#047857',
                      color: '#fff',
                      fontWeight: 600
                    }}>
                      {markerA.direction}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {markerA.full_tag} = <strong style={{ color: '#f1f5f9' }}>{markerA.value}</strong>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Point A not selected
                </span>
              )}
            </div>
          </div>
          {markerA && onJumpToA && (
            <button
              onClick={onJumpToA}
              title="Jump to Point A in grid"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <CornerDownRight size={14} />
            </button>
          )}
        </div>

        {/* Point B Card */}
        <div style={{
          background: 'rgba(217, 119, 6, 0.1)',
          border: '1px solid rgba(217, 119, 6, 0.4)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#d97706',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700
            }}>
              B
            </span>
            <div style={{ minWidth: 0 }}>
              {markerB ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#fbbf24', fontSize: '13px' }}>
                      {markerB.timestamp}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: markerB.direction === 'WRITE' ? '#0369a1' : '#047857',
                      color: '#fff',
                      fontWeight: 600
                    }}>
                      {markerB.direction}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {markerB.full_tag} = <strong style={{ color: '#f1f5f9' }}>{markerB.value}</strong>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Point B not selected
                </span>
              )}
            </div>
          </div>
          {markerB && onJumpToB && (
            <button
              onClick={onJumpToB}
              title="Jump to Point B in grid"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fbbf24',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <CornerDownRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
