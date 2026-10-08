import React from 'react';
import { StationTagEvent } from '../types';
import { TagTrackData } from './StationTagWaveformTypes';
import { parseTimestampMs } from './TwoPointDeltaCard';

interface StationTagWaveformTrackRowProps {
  track: TagTrackData;
  trackIdx: number;
  headerHeight: number;
  trackHeight: number;
  containerWidth: number;
  leftGutter: number;
  chartWidth: number;
  timeToX: (tMs: number) => number;
  markerA: StationTagEvent | null;
  markerB: StationTagEvent | null;
  onSetMarkerA: (evt: StationTagEvent) => void;
  onSetMarkerB: (evt: StationTagEvent) => void;
  onHoverEvent: (evt: StationTagEvent | null) => void;
}

export const StationTagWaveformTrackRow: React.FC<StationTagWaveformTrackRowProps> = ({
  track,
  trackIdx,
  headerHeight,
  trackHeight,
  containerWidth,
  leftGutter,
  chartWidth,
  timeToX,
  markerA,
  markerB,
  onSetMarkerA,
  onSetMarkerB,
  onHoverEvent,
}) => {
  const trackY = headerHeight + trackIdx * trackHeight;
  const logicHighY = trackY + 14;
  const logicLowY = trackY + 42;

  // Generate stepped path
  const pathSegments: string[] = [];
  let lastX = leftGutter;
  let lastLevel = '0';

  track.events.forEach((evt, idx) => {
    const curX = timeToX(parseTimestampMs(evt.timestamp));
    const isHigh = ['1', 'true', 'high', 'on', 'active', 'busy'].includes((evt.value || '').trim().toLowerCase());
    const curY = isHigh ? logicHighY : logicLowY;

    if (idx === 0) {
      pathSegments.push(`M ${leftGutter} ${curY}`);
      pathSegments.push(`L ${curX} ${curY}`);
    } else {
      pathSegments.push(`L ${curX} ${lastLevel === '1' ? logicHighY : logicLowY}`);
      pathSegments.push(`L ${curX} ${curY}`);
    }

    lastX = curX;
    lastLevel = isHigh ? '1' : '0';
  });

  const rightEdgeX = leftGutter + chartWidth;
  if (lastX < rightEdgeX) {
    const finalY = lastLevel === '1' ? logicHighY : logicLowY;
    pathSegments.push(`L ${rightEdgeX} ${finalY}`);
  }

  const pathString = pathSegments.join(' ');

  return (
    <g key={track.tagName}>
      {/* Track Row Background */}
      <rect
        x="0"
        y={trackY}
        width={containerWidth}
        height={trackHeight}
        fill={trackIdx % 2 === 0 ? '#0a0f1d' : '#080c17'}
        stroke="#1e293b"
        strokeWidth="0.5"
      />

      {/* Track Left Info Gutter */}
      <rect
        x="0"
        y={trackY}
        width={leftGutter}
        height={trackHeight}
        fill="#0d1424"
        stroke="#1e293b"
        strokeWidth="0.5"
      />
      {/* Left Color Accent Bar */}
      <rect
        x="0"
        y={trackY}
        width="4"
        height={trackHeight}
        fill={track.color}
      />

      <text
        x="12"
        y={trackY + 22}
        fill="#f1f5f9"
        fontSize="11.5"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        {track.tagName}
      </text>
      <text
        x="12"
        y={trackY + 38}
        fill="#64748b"
        fontSize="9.5"
        fontFamily="monospace"
      >
        {track.direction} • {track.substation || 'ST'} • {track.events.length} evts
      </text>

      {/* Logic Baseline Reference Line */}
      <line
        x1={leftGutter}
        y1={logicLowY}
        x2={leftGutter + chartWidth}
        y2={logicLowY}
        stroke="#1e293b"
        strokeWidth="1"
      />

      {/* Stepped Logic Waveform Path */}
      {pathString && (
        <path
          d={pathString}
          fill="none"
          stroke={track.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="miter"
        />
      )}

      {/* Interactive Transition Markers & Value Tooltips */}
      {track.events.map((evt) => {
        const evtX = timeToX(parseTimestampMs(evt.timestamp));
        if (evtX < leftGutter - 10 || evtX > leftGutter + chartWidth + 10) return null;

        const isHigh = ['1', 'true', 'high', 'on', 'active', 'busy'].includes((evt.value || '').trim().toLowerCase());
        const pointY = isHigh ? logicHighY : logicLowY;

        const isMarkerA = markerA?.id === evt.id;
        const isMarkerB = markerB?.id === evt.id;

        return (
          <g 
            key={evt.id}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHoverEvent(evt)}
            onClick={(e) => {
              e.stopPropagation();
              if (!markerA) onSetMarkerA(evt);
              else if (!markerB) onSetMarkerB(evt);
              else onSetMarkerA(evt);
            }}
          >
            {/* Event pulse dot */}
            <circle
              cx={evtX}
              cy={pointY}
              r={isMarkerA || isMarkerB ? 6 : 4}
              fill={isMarkerA ? '#06b6d4' : (isMarkerB ? '#10b981' : track.color)}
              stroke="#090d16"
              strokeWidth="1.5"
            />

            {/* Value label next to dot if non-boolean or important */}
            {!track.isBoolean && (
              <text
                x={evtX + 6}
                y={pointY - 4}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
              >
                {evt.value}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};
