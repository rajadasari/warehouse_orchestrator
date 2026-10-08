import React, { useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight
} from 'lucide-react';
import { StationTagEvent } from '../types';
import { parseTimestampMs } from './TwoPointDeltaCard';

interface StationTagGridProps {
  events: StationTagEvent[];
  markerA: StationTagEvent | null;
  markerB: StationTagEvent | null;
  onSetMarkerA: (event: StationTagEvent) => void;
  onSetMarkerB: (event: StationTagEvent) => void;
  offset: number;
  limit: number;
  total: number;
  onChangePage: (newOffset: number) => void;
  onChangeLimit: (newLimit: number) => void;
  loading: boolean;
}

export const StationTagGrid: React.FC<StationTagGridProps> = ({
  events,
  markerA,
  markerB,
  onSetMarkerA,
  onSetMarkerB,
  offset,
  limit,
  total,
  onChangePage,
  onChangeLimit,
  loading
}) => {
  // Pre-calculate timestamps and deltas from previous event
  const eventsWithDelta = useMemo(() => {
    return events.map((item, idx) => {
      const curMs = parseTimestampMs(item.timestamp);
      let deltaPrevMs: number | null = null;
      if (idx > 0) {
        const prevMs = parseTimestampMs(events[idx - 1].timestamp);
        deltaPrevMs = curMs - prevMs;
      }
      return {
        ...item,
        curMs,
        deltaPrevMs
      };
    });
  }, [events]);

  // Determine which events fall between Marker A and Marker B
  const rangeBounds = useMemo(() => {
    if (!markerA || !markerB) return null;
    const msA = parseTimestampMs(markerA.timestamp);
    const msB = parseTimestampMs(markerB.timestamp);
    const minMs = Math.min(msA, msB);
    const maxMs = Math.max(msA, msB);
    return { minMs, maxMs };
  }, [markerA, markerB]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIdx = total === 0 ? 0 : offset + 1;
  const endIdx = Math.min(offset + limit, total);

  const formatDeltaPrev = (deltaMs: number | null) => {
    if (deltaMs === null) return '-';
    if (deltaMs === 0) return '0 ms';
    if (Math.abs(deltaMs) < 1000) {
      return `+${deltaMs} ms`;
    }
    return `+${(deltaMs / 1000).toFixed(3)} s`;
  };

  return (
    <div style={{
      background: 'var(--bg-card, #1e293b)',
      border: '1px solid var(--border-color, #334155)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Table Header Bar / Pagination Controls */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color, #334155)',
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Summary Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>Showing</span>
          <strong style={{ color: '#f8fafc' }}>
            {startIdx.toLocaleString()} - {endIdx.toLocaleString()}
          </strong>
          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>of</span>
          <strong style={{ color: '#38bdf8' }}>{total.toLocaleString()}</strong>
          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>tag events</span>
        </div>

        {/* Right: Page Navigation & Page Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => onChangeLimit(Number(e.target.value))}
              style={{
                background: '#0f172a',
                border: '1px solid #475569',
                color: '#f8fafc',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onChangePage(0)}
              disabled={offset === 0 || loading}
              title="First Page"
              style={{
                padding: '6px 8px',
                background: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: offset === 0 ? '#475569' : '#e2e8f0',
                cursor: offset === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => onChangePage(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
              title="Previous Page"
              style={{
                padding: '6px 8px',
                background: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: offset === 0 ? '#475569' : '#e2e8f0',
                cursor: offset === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ padding: '0 8px', fontSize: '12px', color: '#cbd5e1' }}>
              Page <strong>{currentPage}</strong> / {totalPages}
            </span>

            <button
              onClick={() => onChangePage(offset + limit)}
              disabled={offset + limit >= total || loading}
              title="Next Page"
              style={{
                padding: '6px 8px',
                background: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: offset + limit >= total ? '#475569' : '#e2e8f0',
                cursor: offset + limit >= total ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onChangePage((totalPages - 1) * limit)}
              disabled={offset + limit >= total || loading}
              title="Last Page"
              style={{
                padding: '6px 8px',
                background: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: offset + limit >= total ? '#475569' : '#e2e8f0',
                cursor: offset + limit >= total ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            color: '#38bdf8',
            fontSize: '14px',
            fontWeight: 600
          }}>
            Loading station logs...
          </div>
        )}

        {events.length === 0 && !loading ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            No tag events found matching the specified station and time filter.
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{
                position: 'sticky',
                top: 0,
                background: '#0f172a',
                zIndex: 2,
                borderBottom: '2px solid #334155',
                color: '#94a3b8',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                <th style={{ padding: '10px 12px', width: '130px', textAlign: 'center' }}>Time Delta (A / B)</th>
                <th style={{ padding: '10px 12px', width: '60px' }}>#</th>
                <th style={{ padding: '10px 12px', width: '180px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px', width: '100px' }}>Δ Prev</th>
                <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>Direction</th>
                <th style={{ padding: '10px 12px', width: '110px' }}>Station</th>
                <th style={{ padding: '10px 12px', width: '150px' }}>Tag Name</th>
                <th style={{ padding: '10px 12px', width: '130px' }}>Value</th>
                <th style={{ padding: '10px 12px' }}>Full Tag Path</th>
              </tr>
            </thead>
            <tbody>
              {eventsWithDelta.map((evt, idx) => {
                const isMarkerA = markerA?.id === evt.id;
                const isMarkerB = markerB?.id === evt.id;
                const inRange = Boolean(
                  rangeBounds &&
                  evt.curMs >= rangeBounds.minMs &&
                  evt.curMs <= rangeBounds.maxMs
                );

                // Row background styling
                let rowBg = 'transparent';
                let borderLeft = '3px solid transparent';

                if (isMarkerA) {
                  rowBg = 'rgba(14, 165, 233, 0.22)';
                  borderLeft = '4px solid #0284c7';
                } else if (isMarkerB) {
                  rowBg = 'rgba(217, 119, 6, 0.22)';
                  borderLeft = '4px solid #d97706';
                } else if (inRange) {
                  rowBg = 'rgba(56, 189, 248, 0.07)';
                  borderLeft = '3px solid rgba(56, 189, 248, 0.5)';
                } else if (idx % 2 === 1) {
                  rowBg = 'rgba(255, 255, 255, 0.015)';
                }

                return (
                  <tr
                    key={evt.id}
                    style={{
                      background: rowBg,
                      borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                      borderLeft,
                      transition: 'background 0.1s ease'
                    }}
                  >
                    {/* Action / Marker Column */}
                    <td style={{ padding: '6px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onSetMarkerA(evt)}
                          title="Set as Point A"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: isMarkerA ? '1px solid #38bdf8' : '1px solid #475569',
                            background: isMarkerA ? '#0284c7' : 'rgba(30, 41, 59, 0.8)',
                            color: isMarkerA ? '#ffffff' : '#cbd5e1',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            minWidth: '46px',
                            minHeight: '28px'
                          }}
                        >
                          {isMarkerA ? '✓ A' : 'Set A'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetMarkerB(evt)}
                          title="Set as Point B"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: isMarkerB ? '1px solid #fbbf24' : '1px solid #475569',
                            background: isMarkerB ? '#d97706' : 'rgba(30, 41, 59, 0.8)',
                            color: isMarkerB ? '#ffffff' : '#cbd5e1',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            minWidth: '46px',
                            minHeight: '28px'
                          }}
                        >
                          {isMarkerB ? '✓ B' : 'Set B'}
                        </button>
                      </div>
                    </td>

                    {/* Sequential Index */}
                    <td style={{ padding: '8px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>
                      {offset + idx + 1}
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: isMarkerA ? '#38bdf8' : isMarkerB ? '#fbbf24' : '#e2e8f0',
                        fontWeight: isMarkerA || isMarkerB ? 700 : 400
                      }}>
                        {evt.timestamp}
                      </span>
                    </td>

                    {/* Delta Prev */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: (evt.deltaPrevMs || 0) > 1000 ? '#f59e0b' : '#94a3b8'
                      }}>
                        {formatDeltaPrev(evt.deltaPrevMs)}
                      </span>
                    </td>

                    {/* Direction */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.04em',
                        background: evt.direction === 'WRITE' ? 'rgba(2, 132, 199, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                        color: evt.direction === 'WRITE' ? '#38bdf8' : '#34d399',
                        border: `1px solid ${evt.direction === 'WRITE' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`
                      }}>
                        {evt.direction}
                      </span>
                    </td>

                    {/* Station */}
                    <td style={{ padding: '8px 12px', color: '#f1f5f9', fontWeight: 600 }}>
                      {evt.station}
                    </td>

                    {/* Tag Name */}
                    <td style={{ padding: '8px 12px', color: '#cbd5e1', fontWeight: 500 }}>
                      {evt.tag_name}
                    </td>

                    {/* Value */}
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: evt.value === '1' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                        color: evt.value === '1' ? '#34d399' : '#f8fafc',
                        border: '1px solid rgba(71, 85, 105, 0.5)'
                      }}>
                        {evt.value || '(empty)'}
                      </span>
                    </td>

                    {/* Full Tag */}
                    <td style={{ padding: '8px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>
                      {evt.full_tag}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
