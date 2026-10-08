import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Flag, 
  Info, 
  Sparkles 
} from 'lucide-react';
import { StationTagEvent } from '../types';
import { parseTimestampMs } from './TwoPointDeltaCard';
import { 
  StationTagWaveformViewerProps, 
  TagTrackData, 
  TRACK_COLORS 
} from './StationTagWaveformTypes';
import { StationTagWaveformToolbar } from './StationTagWaveformToolbar';
import { StationTagWaveformTrackRow } from './StationTagWaveformTrackRow';

export const StationTagWaveformViewer: React.FC<StationTagWaveformViewerProps> = ({
  events,
  markerA,
  markerB,
  onSetMarkerA,
  onSetMarkerB,
  onClearMarkers,
  isMaximized = false,
  onToggleMaximize,
  loading = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panRatio, setPanRatio] = useState<number>(0.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialPanRatio, setInitialPanRatio] = useState<number>(0);

  const [hoveredEvent, setHoveredEvent] = useState<StationTagEvent | null>(null);
  const [hoverCursorX, setHoverCursorX] = useState<number | null>(null);
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);

  // Active visible tracks filter
  const [visibleTags, setVisibleTags] = useState<Set<string>>(new Set());

  // Measure container dimensions on mount/resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Chronologically sorted events
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const ta = parseTimestampMs(a.timestamp);
      const tb = parseTimestampMs(b.timestamp);
      if (ta !== tb) return ta - tb;
      return a.line_num - b.line_num;
    });
  }, [events]);

  // Overall time bounds (min / max milliseconds)
  const { minTimeMs, maxTimeMs, totalDurationMs } = useMemo(() => {
    if (sortedEvents.length === 0) {
      return { minTimeMs: 0, maxTimeMs: 1000, totalDurationMs: 1000 };
    }
    const t0 = parseTimestampMs(sortedEvents[0].timestamp);
    const tn = parseTimestampMs(sortedEvents[sortedEvents.length - 1].timestamp);
    const dur = Math.max(tn - t0, 1000);
    return { minTimeMs: t0, maxTimeMs: tn, totalDurationMs: dur };
  }, [sortedEvents]);

  // Group events by unique tag name
  const allTracks: TagTrackData[] = useMemo(() => {
    const map = new Map<string, StationTagEvent[]>();
    for (const evt of sortedEvents) {
      const key = evt.tag_name || evt.full_tag || 'Unknown_Tag';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(evt);
    }

    const tracks: TagTrackData[] = [];
    let colorIdx = 0;
    map.forEach((tagEvts, tagName) => {
      const isBool = tagEvts.every(e => {
        const v = (e.value || '').trim().toLowerCase();
        return v === '0' || v === '1' || v === 'true' || v === 'false' || v === '';
      });

      tracks.push({
        tagName,
        substation: tagEvts[0]?.substation || '',
        direction: tagEvts[0]?.direction || 'READ',
        events: tagEvts,
        isBoolean: isBool,
        color: TRACK_COLORS[colorIdx % TRACK_COLORS.length],
      });
      colorIdx++;
    });

    return tracks;
  }, [sortedEvents]);

  // Initialize visible tags to all unique tags if empty or changed
  useEffect(() => {
    if (allTracks.length > 0) {
      setVisibleTags(new Set(allTracks.map(t => t.tagName)));
    }
  }, [allTracks]);

  const toggleTagVisibility = (tagName: string) => {
    setVisibleTags(prev => {
      const next = new Set(prev);
      if (next.has(tagName)) {
        if (next.size > 1) {
          next.delete(tagName);
        }
      } else {
        next.add(tagName);
      }
      return next;
    });
  };

  const selectAllTags = () => {
    setVisibleTags(new Set(allTracks.map(t => t.tagName)));
  };

  const activeTracks = useMemo(() => {
    return allTracks.filter(t => visibleTags.has(t.tagName));
  }, [allTracks, visibleTags]);

  // Geometry calculations
  const leftGutter = 180;
  const rightGutter = 20;
  const headerHeight = 36;
  const trackHeight = 56;
  const chartWidth = Math.max(200, containerWidth - leftGutter - rightGutter);
  const scaledWidth = chartWidth * zoom;
  const totalSvgHeight = headerHeight + activeTracks.length * trackHeight + 20;

  // Coordinate helper functions
  const timeToX = useCallback((tMs: number): number => {
    if (totalDurationMs <= 0) return leftGutter;
    const ratio = Math.max(0, Math.min(1, (tMs - minTimeMs) / totalDurationMs));
    const maxScroll = Math.max(0, scaledWidth - chartWidth);
    const scrollOffset = panRatio * maxScroll;
    return leftGutter + (ratio * scaledWidth) - scrollOffset;
  }, [minTimeMs, totalDurationMs, scaledWidth, chartWidth, panRatio, leftGutter]);

  const xToTime = useCallback((x: number): number => {
    const maxScroll = Math.max(0, scaledWidth - chartWidth);
    const scrollOffset = panRatio * maxScroll;
    const chartX = x - leftGutter + scrollOffset;
    const ratio = Math.max(0, Math.min(1, chartX / scaledWidth));
    return minTimeMs + (ratio * totalDurationMs);
  }, [minTimeMs, totalDurationMs, scaledWidth, chartWidth, panRatio, leftGutter]);

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 16.0));
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev / 1.5, 1.0);
      if (next === 1.0) setPanRatio(0.0);
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoom(1.0);
    setPanRatio(0.0);
  };

  // Pan dragging on timeline
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoom <= 1.0) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setInitialPanRatio(panRatio);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const currentX = e.clientX - svgRect.left;
    if (currentX >= leftGutter && currentX <= leftGutter + chartWidth) {
      setHoverCursorX(currentX);
      setHoverTimeMs(xToTime(currentX));
    } else {
      setHoverCursorX(null);
      setHoverTimeMs(null);
    }

    if (isDragging && zoom > 1.0) {
      const dx = e.clientX - dragStartX;
      const maxScroll = scaledWidth - chartWidth;
      if (maxScroll > 0) {
        const deltaRatio = -dx / maxScroll;
        const newRatio = Math.max(0, Math.min(1, initialPanRatio + deltaRatio));
        setPanRatio(newRatio);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverCursorX(null);
    setHoverTimeMs(null);
    setHoveredEvent(null);
  };

  // Time Ticks Generator
  const timeTicks = useMemo(() => {
    if (totalDurationMs <= 0 || chartWidth <= 0) return [];
    const visibleDuration = totalDurationMs / zoom;
    let tickInterval = 1000;
    if (visibleDuration < 2000) tickInterval = 200;
    else if (visibleDuration < 5000) tickInterval = 500;
    else if (visibleDuration < 15000) tickInterval = 1000;
    else if (visibleDuration < 60000) tickInterval = 5000;
    else if (visibleDuration < 300000) tickInterval = 15000;
    else tickInterval = 30000;

    const firstTickTime = Math.ceil(minTimeMs / tickInterval) * tickInterval;
    const ticks: Array<{ timeMs: number; x: number; label: string }> = [];

    for (let t = firstTickTime; t <= maxTimeMs; t += tickInterval) {
      const x = timeToX(t);
      if (x >= leftGutter - 10 && x <= leftGutter + chartWidth + 10) {
        const date = new Date(t);
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
        ticks.push({ timeMs: t, x, label: timeStr });
      }
    }
    return ticks;
  }, [minTimeMs, maxTimeMs, totalDurationMs, zoom, chartWidth, leftGutter, timeToX]);

  // Marker coordinates
  const markerAX = markerA ? timeToX(parseTimestampMs(markerA.timestamp)) : null;
  const markerBX = markerB ? timeToX(parseTimestampMs(markerB.timestamp)) : null;

  // Elapsed delta between markers
  const deltaInfo = useMemo(() => {
    if (!markerA || !markerB) return null;
    const tA = parseTimestampMs(markerA.timestamp);
    const tB = parseTimestampMs(markerB.timestamp);
    const diff = Math.abs(tB - tA);
    const sec = (diff / 1000).toFixed(3);
    return { ms: diff, sec, isForward: tB >= tA };
  }, [markerA, markerB]);

  const formatTimeLabel = (tsMs: number) => {
    const d = new Date(tsMs);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#090d16',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        width: '100%',
        minHeight: '360px',
        flexShrink: 0,
      }}
    >
      <StationTagWaveformToolbar
        activeTracksCount={activeTracks.length}
        totalEventsCount={sortedEvents.length}
        totalDurationMs={totalDurationMs}
        deltaInfo={deltaInfo}
        onClearMarkers={onClearMarkers}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
        allTracks={allTracks}
        visibleTags={visibleTags}
        onToggleTag={toggleTagVisibility}
        onSelectAllTags={selectAllTags}
      />

      {/* SVG Canvas Area */}
      <div 
        style={{
          position: 'relative',
          overflowX: 'hidden',
          overflowY: 'auto',
          maxHeight: isMaximized ? '750px' : '480px',
          cursor: isDragging ? 'grabbing' : (zoom > 1.0 ? 'grab' : 'default'),
          userSelect: 'none'
        }}
      >
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '240px',
            color: '#64748b',
            gap: '10px'
          }}>
            <Activity size={20} className="animate-spin" color="#38bdf8" />
            <span style={{ fontSize: '13px' }}>Rendering digital waveform telemetry...</span>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '240px',
            color: '#64748b',
            gap: '8px'
          }}>
            <Info size={28} color="#334155" />
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#94a3b8' }}>
              No Signal Telemetry Available
            </span>
            <span style={{ fontSize: '12px' }}>
              Adjust station tag filters or select a different station to load waveform transitions.
            </span>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={containerWidth}
            height={totalSvgHeight}
            style={{ display: 'block' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Background Grid Lines for Time Ticks */}
            <g>
              {timeTicks.map(tick => (
                <g key={`tick-${tick.timeMs}`}>
                  <line
                    x1={tick.x}
                    y1={headerHeight}
                    x2={tick.x}
                    y2={totalSvgHeight}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={tick.x}
                    y={headerHeight - 8}
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="Consolas, Monaco, monospace"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
            </g>

            {/* Shaded Delta Region between Point A and Point B */}
            {markerAX !== null && markerBX !== null && (
              <rect
                x={Math.min(markerAX, markerBX)}
                y={headerHeight}
                width={Math.max(2, Math.abs(markerBX - markerAX))}
                height={totalSvgHeight - headerHeight}
                fill="rgba(6, 182, 212, 0.08)"
                stroke="rgba(6, 182, 212, 0.3)"
                strokeDasharray="4 2"
              />
            )}

            {/* Signal Tracks */}
            {activeTracks.map((track, trackIdx) => (
              <StationTagWaveformTrackRow
                key={track.tagName}
                track={track}
                trackIdx={trackIdx}
                headerHeight={headerHeight}
                trackHeight={trackHeight}
                containerWidth={containerWidth}
                leftGutter={leftGutter}
                chartWidth={chartWidth}
                timeToX={timeToX}
                markerA={markerA}
                markerB={markerB}
                onSetMarkerA={onSetMarkerA}
                onSetMarkerB={onSetMarkerB}
                onHoverEvent={setHoveredEvent}
              />
            ))}

            {/* Vertical Marker A Cursor Line */}
            {markerAX !== null && markerAX >= leftGutter && markerAX <= leftGutter + chartWidth && (
              <g>
                <line
                  x1={markerAX}
                  y1={headerHeight}
                  x2={markerAX}
                  y2={totalSvgHeight}
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <rect
                  x={markerAX - 32}
                  y={headerHeight - 24}
                  width="64"
                  height="20"
                  rx="4"
                  fill="#06b6d4"
                />
                <text
                  x={markerAX}
                  y={headerHeight - 10}
                  fill="#082f49"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  Point A
                </text>
              </g>
            )}

            {/* Vertical Marker B Cursor Line */}
            {markerBX !== null && markerBX >= leftGutter && markerBX <= leftGutter + chartWidth && (
              <g>
                <line
                  x1={markerBX}
                  y1={headerHeight}
                  x2={markerBX}
                  y2={totalSvgHeight}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <rect
                  x={markerBX - 32}
                  y={headerHeight - 24}
                  width="64"
                  height="20"
                  rx="4"
                  fill="#10b981"
                />
                <text
                  x={markerBX}
                  y={headerHeight - 10}
                  fill="#064e3b"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  Point B
                </text>
              </g>
            )}

            {/* Real-time Tracking Crosshair & Inspection Tooltip */}
            {hoverCursorX !== null && hoverTimeMs !== null && (
              <g>
                <line
                  x1={hoverCursorX}
                  y1={headerHeight}
                  x2={hoverCursorX}
                  y2={totalSvgHeight}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />
                <rect
                  x={hoverCursorX - 45}
                  y={totalSvgHeight - 20}
                  width="90"
                  height="18"
                  rx="3"
                  fill="#334155"
                />
                <text
                  x={hoverCursorX}
                  y={totalSvgHeight - 7}
                  fill="#f8fafc"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {formatTimeLabel(hoverTimeMs)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Bottom Context Panel: Hovered Event Details & Quick Marker Assignment */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#0a101d',
        borderTop: '1px solid #1e293b',
        fontSize: '12px',
        color: '#94a3b8',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {hoveredEvent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              Tag: {hoveredEvent.tag_name}
            </span>
            <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>
              Val: <strong>{hoveredEvent.value}</strong>
            </span>
            <span style={{ color: hoveredEvent.direction === 'WRITE' ? '#f59e0b' : '#38bdf8' }}>
              [{hoveredEvent.direction}]
            </span>
            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
              {hoveredEvent.timestamp}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => onSetMarkerA(hoveredEvent)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#0891b2',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Set Point A
              </button>
              <button
                type="button"
                onClick={() => onSetMarkerB(hoveredEvent)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Set Point B
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
            <Sparkles size={13} color="#38bdf8" />
            <span>Hover or click any transition dot on the waveform to inspect details or assign Point A / Point B.</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} />
            Point A
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            Point B
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Flag size={11} color="#f59e0b" />
            WRITE (mWCS)
          </span>
        </div>
      </div>
    </div>
  );
};
