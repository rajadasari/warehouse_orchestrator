import React from 'react';

interface WaveformTrackStateProps {
  chartLeft: number;
  chartRight: number;
  x0: number;
  xReq1: number;
  xReq0: number;
  x3: number;
  isMidFault: boolean;
}

export const WaveformTrackState: React.FC<WaveformTrackStateProps> = ({
  chartLeft,
  chartRight,
  x0,
  xReq1,
  xReq0,
  x3,
  isMidFault
}) => {
  return (
    <g>
      <text x="10" y="52" fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="sans-serif">
        Track 1: State
      </text>
      <text x="10" y="64" fill="#64748b" fontSize="9" fontFamily="sans-serif">
        Machine State
      </text>

      {/* State 4/5 (Docking) */}
      {xReq1 > chartLeft && (
        <g>
          <rect 
            x={Math.max(chartLeft, x0)} 
            y="42" 
            width={Math.max(2, Math.min(chartRight, xReq1) - Math.max(chartLeft, x0))} 
            height="22" 
            fill="#1e3a8a" 
            rx="3" 
            stroke="#3b82f6" 
            strokeWidth="1" 
          />
          <text 
            x={(Math.max(chartLeft, x0) + Math.min(chartRight, xReq1)) / 2} 
            y="57" 
            fill="#93c5fd" 
            fontSize="10" 
            fontWeight="600" 
            textAnchor="middle"
          >
            State 5 (Docked)
          </text>
        </g>
      )}

      {/* State 2 (Handshake Active) */}
      {xReq0 > chartLeft && xReq1 < chartRight && (
        <g>
          <rect 
            x={Math.max(chartLeft, xReq1)} 
            y="42" 
            width={Math.max(2, Math.min(chartRight, xReq0) - Math.max(chartLeft, xReq1))} 
            height="22" 
            fill="#78350f" 
            rx="3" 
            stroke="#f59e0b" 
            strokeWidth="1" 
          />
          <text 
            x={(Math.max(chartLeft, xReq1) + Math.min(chartRight, xReq0)) / 2} 
            y="57" 
            fill="#fde68a" 
            fontSize="10" 
            fontWeight="600" 
            textAnchor="middle"
          >
            State 2 (HS Active)
          </text>
        </g>
      )}

      {/* State 8 (Discharge) or State 16 (Fault) */}
      {x3 > chartLeft && xReq0 < chartRight && (
        <g>
          <rect 
            x={Math.max(chartLeft, xReq0)} 
            y="42" 
            width={Math.max(2, Math.min(chartRight, x3) - Math.max(chartLeft, xReq0))} 
            height="22" 
            fill={isMidFault ? '#7f1d1d' : '#4c1d95'} 
            rx="3" 
            stroke={isMidFault ? '#ef4444' : '#8b5cf6'} 
            strokeWidth="1" 
          />
          <text 
            x={(Math.max(chartLeft, xReq0) + Math.min(chartRight, x3)) / 2} 
            y="57" 
            fill={isMidFault ? '#fca5a5' : '#c4b5fd'} 
            fontSize="10" 
            fontWeight="600" 
            textAnchor="middle"
          >
            {isMidFault ? 'State 16 (FAULT)' : 'State 8 (Transfer)'}
          </text>
        </g>
      )}
    </g>
  );
};
