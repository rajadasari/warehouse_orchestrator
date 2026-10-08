import React from 'react';

interface WaveformTrackHandshakeProps {
  chartLeft: number;
  chartRight: number;
  effXDest: number;
  effXDestClear: number;
  effXReq1: number;
  effXReq99: number;
  effXReq0: number;
  yCenter: number;
  yMwcsBase: number;
  yMwcsPulse: number;
  yPlcBase: number;
  yPlcStep1: number;
  yPlcStep99: number;
  destination?: string | null;
}

export const WaveformTrackHandshake: React.FC<WaveformTrackHandshakeProps> = ({
  chartLeft,
  chartRight,
  effXDest,
  effXDestClear,
  effXReq1,
  effXReq99,
  effXReq0,
  yCenter,
  yMwcsBase,
  yMwcsPulse,
  yPlcBase,
  yPlcStep1,
  yPlcStep99,
  destination
}) => {
  return (
    <g>
      {/* Center Dividing Reference Line */}
      <line 
        x1={chartLeft} 
        y1={yCenter} 
        x2={chartRight} 
        y2={yCenter} 
        stroke="#334155" 
        strokeWidth="1.5" 
        strokeDasharray="4 2" 
      />

      {/* Left Track Labels */}
      <text x="10" y="120" fill="#38bdf8" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">
        mWCS Handshake
      </text>
      <text x="10" y="132" fill="#64748b" fontSize="8.5" fontFamily="sans-serif">
        Above Line (Writes)
      </text>

      <text x="10" y="168" fill="#f59e0b" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">
        PLC Handshake
      </text>
      <text x="10" y="180" fill="#64748b" fontSize="8.5" fontFamily="sans-serif">
        Below Line (Reads)
      </text>

      {/* --- ABOVE THE LINE: mWCS Writes (Destination, Ack) --- */}
      <line x1={chartLeft} y1={yMwcsBase} x2={chartRight} y2={yMwcsBase} stroke="#1e293b" strokeWidth="1" />

      {/* mWCS Digital Waveform Pulse (Idle -> Dest/Ack High -> Idle) */}
      <path
        d={`
          M ${chartLeft} ${yMwcsBase}
          L ${effXDest} ${yMwcsBase}
          L ${effXDest} ${yMwcsPulse}
          L ${effXDestClear} ${yMwcsPulse}
          L ${effXDestClear} ${yMwcsBase}
          L ${chartRight} ${yMwcsBase}
        `}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* mWCS Destination & Ack Badges */}
      {destination && effXDest < chartRight && effXDestClear > chartLeft && (
        <g>
          <circle 
            cx={Math.min(chartRight - 10, Math.max(chartLeft + 10, effXDest + 10))} 
            cy={yMwcsPulse} 
            r="3.5" 
            fill="#38bdf8" 
          />
          <rect 
            x={Math.min(chartRight - 56, Math.max(chartLeft, effXDest + 4))} 
            y={yMwcsPulse - 18} 
            width={52} 
            height={14} 
            rx={3} 
            fill="#0b1120" 
            stroke="#38bdf8" 
            strokeWidth="1" 
          />
          <text 
            x={Math.min(chartRight - 30, Math.max(chartLeft + 26, effXDest + 30))} 
            y={yMwcsPulse - 8} 
            fill="#38bdf8" 
            fontSize="8.5" 
            fontWeight="700" 
            textAnchor="middle"
          >
            Dest={destination}
          </text>

          {/* Reset Dest=0 indicator */}
          <text 
            x={Math.min(chartRight - 20, Math.max(chartLeft + 10, effXDestClear + 14))} 
            y={yMwcsBase - 4} 
            fill="#64748b" 
            fontSize="8" 
            fontFamily="monospace"
          >
            Dest:0
          </text>
        </g>
      )}

      {/* --- BELOW THE LINE: PLC Reads (Req_For_Destination: 0 -> 1 -> 99 -> 0) --- */}
      <line x1={chartLeft} y1={yPlcBase} x2={chartRight} y2={yPlcBase} stroke="#1e293b" strokeWidth="1" />

      {/* Stepped PLC Waveform with discrete step guarantees for 0.001s transitions */}
      <path
        d={`
          M ${chartLeft} ${yPlcBase}
          L ${effXReq1} ${yPlcBase}
          L ${effXReq1} ${yPlcStep1}
          L ${effXReq99} ${yPlcStep1}
          L ${effXReq99} ${yPlcStep99}
          L ${effXReq0} ${yPlcStep99}
          L ${effXReq0} ${yPlcBase}
          L ${chartRight} ${yPlcBase}
        `}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Step 1 Label: Req = 1 */}
      {effXReq1 < chartRight && effXReq99 > chartLeft && (
        <g>
          <rect 
            x={Math.min(chartRight - 46, Math.max(chartLeft, effXReq1 + 3))} 
            y={yPlcStep1 + 2} 
            width={42} 
            height={13} 
            rx={2} 
            fill="#0b1120" 
            stroke="#f59e0b" 
            strokeWidth="1" 
          />
          <text 
            x={Math.min(chartRight - 25, Math.max(chartLeft + 21, effXReq1 + 24))} 
            y={yPlcStep1 + 11} 
            fill="#fde68a" 
            fontSize="8" 
            fontWeight="700" 
            textAnchor="middle"
          >
            Req=1
          </text>
        </g>
      )}

      {/* Step 2 Label: Req = 99 (PLC Acknowledged) */}
      {effXReq99 < chartRight && effXReq0 > chartLeft && (
        <g>
          <rect 
            x={Math.min(chartRight - 54, Math.max(chartLeft, effXReq99 + 3))} 
            y={yPlcStep99 + 2} 
            width={50} 
            height={13} 
            rx={2} 
            fill="#0b1120" 
            stroke="#f97316" 
            strokeWidth="1" 
          />
          <text 
            x={Math.min(chartRight - 29, Math.max(chartLeft + 25, effXReq99 + 28))} 
            y={yPlcStep99 + 11} 
            fill="#fed7aa" 
            fontSize="8" 
            fontWeight="700" 
            textAnchor="middle"
          >
            Req=99 (Ack)
          </text>
        </g>
      )}

      {/* Return to 0 Label */}
      {effXReq0 < chartRight && (
        <text 
          x={Math.min(chartRight - 10, Math.max(chartLeft, effXReq0 + 6))} 
          y={yPlcBase + 10} 
          fill="#64748b" 
          fontSize="8" 
          fontFamily="monospace"
        >
          Req=0
        </text>
      )}
    </g>
  );
};
