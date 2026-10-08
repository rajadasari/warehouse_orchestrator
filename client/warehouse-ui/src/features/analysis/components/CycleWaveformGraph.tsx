import React, { useRef } from 'react';
import { 
  Download, 
  FileText, 
  Camera, 
  RotateCcw, 
  Clock, 
  Cpu, 
  Layers, 
  Boxes
} from 'lucide-react';
import { HandshakeRecord } from '../types';
import { analysisService } from '../analysisService';

interface CycleWaveformGraphProps {
  record: HandshakeRecord;
}

export const CycleWaveformGraph: React.FC<CycleWaveformGraphProps> = ({ record }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const isSuccess = record.status === 'SUCCESS';
  const isMidFault = record.failure_reason?.includes('MID_CYCLE_FAULT');

  // Milestone durations in milliseconds
  const dwellMs = record.dwell_duration_ms ?? 1000;
  const protoMs = record.protocol_duration_ms ?? 2000;
  const dischargeMs = record.discharge_duration_ms ?? 7500;
  const totalCycleMs = record.cycle_duration_ms ?? (dwellMs + protoMs + dischargeMs);

  // Normalize percentages (avoid division by 0)
  const safeTotal = Math.max(totalCycleMs, 100);
  const p2Pct = Math.min(90, Math.max(5, (dwellMs / safeTotal) * 100));
  const p3Pct = Math.min(95, Math.max(p2Pct + 5, ((dwellMs + protoMs) / safeTotal) * 100));

  // Format second strings with 0.001s (millisecond) resolution
  const dwellSec = (dwellMs / 1000).toFixed(3);
  const protoSec = (protoMs / 1000).toFixed(3);
  const dischargeSec = (dischargeMs / 1000).toFixed(3);
  const totalSec = (safeTotal / 1000).toFixed(3);

  // Export waveform to PNG using pure client-side HTML5 Canvas
  const handleSavePng = () => {
    if (!svgRef.current) return;
    try {
      const svgEl = svgRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // High-res 2x scaling
        canvas.width = (svgEl.clientWidth || 860) * scale;
        canvas.height = (svgEl.clientHeight || 280) * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(scale, scale);
          ctx.drawImage(image, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `${record.id}_cycle_timing_waveform.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URLObj.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error('Failed to export PNG waveform:', err);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      await analysisService.downloadRawLogs(record.id);
    } catch (err) {
      console.error('Failed to download raw logs:', err);
    }
  };

  const handleDownloadCsv = () => {
    analysisService.downloadExportCsv({ cycle_id: record.cycle_id });
  };

  // SVG dimensions
  const svgW = 860;
  const svgH = 260;
  const chartLeft = 140;
  const chartRight = 830;
  const chartW = chartRight - chartLeft;

  const xP1 = chartLeft;
  const xP2 = chartLeft + (p2Pct / 100) * chartW;
  const xP3 = chartLeft + (p3Pct / 100) * chartW;
  const xP4 = chartRight;

  return (
    <div style={{
      backgroundColor: '#090d16',
      borderRadius: '10px',
      border: '1px solid #1e293b',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Waveform Header & Actions Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Cycle Timing & Telemetry Waveform
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isSuccess ? '#10b981' : '#ef4444'
            }}>
              {record.status}
            </span>
            <span style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              Res: 0.001s (1ms)
            </span>
            {record.is_retry && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.35)'
              }}>
                <RotateCcw size={11} /> Attempt #{record.attempt_number} (Retry)
              </span>
            )}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>
            Station: <strong style={{ color: '#38bdf8' }}>{record.station}</strong> • Pallet: <strong style={{ color: '#e2e8f0' }}>{record.pallet_id}</strong> • Cycle: <span style={{ fontFamily: 'monospace' }}>{record.cycle_id}</span>
          </div>
        </div>

        {/* Action Buttons (Touch target minimum 48px height) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSavePng}
            title="Save high-resolution timing waveform as PNG image"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Camera size={15} />
            <span>Save Graph (PNG)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            title="Download CSV cycle report for this transaction"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#1e293b',
              color: '#10b981',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLogs}
            title="Download raw telemetry slice log file"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#1e293b',
              color: '#f59e0b',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={15} />
            <span>Raw Logs (.log)</span>
          </button>
        </div>
      </div>

      {/* Interactive / Vector Waveform SVG Canvas */}
      <div style={{
        overflowX: 'auto',
        backgroundColor: '#030712',
        borderRadius: '8px',
        border: '1px solid #1e293b',
        padding: '12px'
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', minWidth: '780px', height: 'auto', display: 'block' }}
        >
          {/* Background Grid */}
          <rect x="0" y="0" width={svgW} height={svgH} fill="#090d16" rx="6" />

          {/* Vertical Milestone Guideline Lines */}
          <line x1={xP1} y1="30" x2={xP1} y2="230" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
          <line x1={xP2} y1="30" x2={xP2} y2="230" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />
          <line x1={xP3} y1="30" x2={xP3} y2="230" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />
          <line x1={xP4} y1="30" x2={xP4} y2="230" stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />

          {/* Time axis tick markers at top with 0.001s precision */}
          <text x={xP1} y="22" fill="#94a3b8" fontSize="10" textAnchor="start" fontFamily="monospace">T0 Docked (0.000s)</text>
          <text x={xP2} y="22" fill="#f59e0b" fontSize="10" textAnchor="middle" fontFamily="monospace">T1 Req=1 (+{dwellSec}s)</text>
          <text x={xP3} y="22" fill="#10b981" fontSize="10" textAnchor="middle" fontFamily="monospace">T2 Req=0 (+{(Number(dwellSec) + Number(protoSec)).toFixed(3)}s)</text>
          <text x={xP4} y="22" fill="#38bdf8" fontSize="10" textAnchor="end" fontFamily="monospace">T3 Done (+{totalSec}s)</text>

          {/* ================= TRACK 1: STATION STATE ================= */}
          <g>
            <text x="12" y="62" fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="sans-serif">Track 1: State</text>
            <text x="12" y="75" fill="#64748b" fontSize="9.5" fontFamily="sans-serif">PLC Machine State</text>

            {/* State Block 1: Docking / In-Position (State 4 or 5) */}
            <rect x={xP1} y="50" width={Math.max(4, xP2 - xP1 - 2)} height="26" fill="#1e3a8a" rx="4" stroke="#3b82f6" strokeWidth="1" />
            <text x={xP1 + (xP2 - xP1) / 2} y="67" fill="#93c5fd" fontSize="10.5" fontWeight="600" textAnchor="middle">
              State 4/5 (Docking)
            </text>

            {/* State Block 2: Handshake / Decision (State 2) */}
            <rect x={xP2} y="50" width={Math.max(4, xP3 - xP2 - 2)} height="26" fill="#78350f" rx="4" stroke="#f59e0b" strokeWidth="1" />
            <text x={xP2 + (xP3 - xP2) / 2} y="67" fill="#fde68a" fontSize="10.5" fontWeight="600" textAnchor="middle">
              State 2 (HS Active)
            </text>

            {/* State Block 3: Transfer Executing (State 8) or Fault (State 16) */}
            {isMidFault ? (
              <rect x={xP3} y="50" width={Math.max(4, xP4 - xP3)} height="26" fill="#7f1d1d" rx="4" stroke="#ef4444" strokeWidth="1" />
            ) : (
              <rect x={xP3} y="50" width={Math.max(4, xP4 - xP3)} height="26" fill="#4c1d95" rx="4" stroke="#8b5cf6" strokeWidth="1" />
            )}
            <text x={xP3 + (xP4 - xP3) / 2} y="67" fill={isMidFault ? '#fca5a5' : '#c4b5fd'} fontSize="10.5" fontWeight="600" textAnchor="middle">
              {isMidFault ? 'State 16 (FAULT Mid-Cycle)' : 'State 8 (Transfer Executing)'}
            </text>
          </g>

          {/* ================= TRACK 2: BI-DIRECTIONAL HANDSHAKE SPLIT ================= */}
          <g>
            {/* Center Dividing Reference Line */}
            <line x1={chartLeft} y1={130} x2={chartRight} y2={130} stroke="#334155" strokeWidth="1.5" strokeDasharray="4 2" />

            <text x="12" y="112" fill="#38bdf8" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">mWCS Handshake</text>
            <text x="12" y="123" fill="#64748b" fontSize="8.5" fontFamily="sans-serif">Above Line (Writes)</text>

            <text x="12" y="148" fill="#f59e0b" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">PLC Handshake</text>
            <text x="12" y="159" fill="#64748b" fontSize="8.5" fontFamily="sans-serif">Below Line (Reads)</text>

            {/* --- ABOVE THE LINE: mWCS Writes --- */}
            <line x1={chartLeft} y1={125} x2={chartRight} y2={125} stroke="#1e293b" strokeWidth="1" />
            <path
              d={`
                M ${xP1} 125
                L ${xP2 + (xP3 - xP2) * 0.15} 125
                L ${xP2 + (xP3 - xP2) * 0.15} 98
                L ${xP2 + (xP3 - xP2) * 0.85} 98
                L ${xP2 + (xP3 - xP2) * 0.85} 125
                L ${xP4} 125
              `}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {record.destination && (
              <g>
                <circle cx={xP2 + (xP3 - xP2) * 0.45} cy="98" r="4" fill="#38bdf8" />
                <rect x={xP2 + (xP3 - xP2) * 0.45 - 24} y="78" width="48" height="15" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <text x={xP2 + (xP3 - xP2) * 0.45} y="89" fill="#38bdf8" fontSize="9" fontWeight="700" textAnchor="middle">
                  Dest={record.destination}
                </text>
              </g>
            )}

            {/* --- BELOW THE LINE: PLC Stepped Reads (0 -> 1 -> 99 -> 0) --- */}
            <line x1={chartLeft} y1={135} x2={chartRight} y2={135} stroke="#1e293b" strokeWidth="1" />
            <path
              d={`
                M ${xP1} 135
                L ${xP2} 135
                L ${xP2} 152
                L ${xP2 + (xP3 - xP2) * 0.55} 152
                L ${xP2 + (xP3 - xP2) * 0.55} 168
                L ${xP3} 168
                L ${xP3} 135
                L ${xP4} 135
              `}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Step 1: Req = 1 */}
            <g>
              <rect x={xP2 + 4} y="154" width="38" height="13" rx="2" fill="#0b1120" stroke="#f59e0b" strokeWidth="1" />
              <text x={xP2 + 23} y="163" fill="#fde68a" fontSize="8" fontWeight="700" textAnchor="middle">Req=1</text>
            </g>

            {/* Step 2: Req = 99 */}
            <g>
              <rect x={xP2 + (xP3 - xP2) * 0.55 + 4} y="170" width="46" height="13" rx="2" fill="#0b1120" stroke="#f97316" strokeWidth="1" />
              <text x={xP2 + (xP3 - xP2) * 0.55 + 27} y="179" fill="#fed7aa" fontSize="8" fontWeight="700" textAnchor="middle">Req=99</text>
            </g>

            <text x={xP3 + 6} y="145" fill="#64748b" fontSize="8" fontFamily="monospace">Req=0</text>
          </g>

          {/* ================= TRACK 3: PALLET PRESENCE ================= */}
          <g>
            <text x="12" y="188" fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="sans-serif">Track 3: Pallet</text>
            <text x="12" y="201" fill="#64748b" fontSize="9.5" fontFamily="sans-serif">Pallet Presence</text>

            {/* Pallet Present Bar */}
            <rect x={xP1} y="180" width={xP4 - xP1} height="20" fill="rgba(14, 165, 233, 0.2)" rx="4" stroke="#0ea5e9" strokeWidth="1" />
            <text x={xP1 + (xP4 - xP1) / 2} y="194" fill="#38bdf8" fontSize="10" fontWeight="600" textAnchor="middle">
              Pallet Present [{record.pallet_id}] (Docked → Transfer Complete)
            </text>
          </g>

          {/* Duration Dimension Labels at Bottom */}
          <g>
            {/* Dwell Dimension */}
            <line x1={xP1} y1="222" x2={xP2} y2="222" stroke="#3b82f6" strokeWidth="1.5" />
            <text x={xP1 + (xP2 - xP1) / 2} y="218" fill="#93c5fd" fontSize="9.5" fontWeight="600" textAnchor="middle">
              Dwell: {dwellSec}s
            </text>

            {/* Protocol Dimension */}
            <line x1={xP2} y1="222" x2={xP3} y2="222" stroke="#eab308" strokeWidth="1.5" />
            <text x={xP2 + (xP3 - xP2) / 2} y="218" fill="#fde68a" fontSize="9.5" fontWeight="600" textAnchor="middle">
              Handshake: {protoSec}s
            </text>

            {/* Discharge Dimension */}
            <line x1={xP3} y1="222" x2={xP4} y2="222" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x={xP3 + (xP4 - xP3) / 2} y="218" fill="#c4b5fd" fontSize="9.5" fontWeight="600" textAnchor="middle">
              Discharge: {dischargeSec}s
            </text>
          </g>
        </svg>
      </div>

      {/* 3-Tier Latency Phase Breakdown Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        {/* Phase 1: Dwell */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e3a8a',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#93c5fd' }}>
            <Layers size={13} />
            <span>PHASE 1: DWELL / ALIGN</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>
            {dwellSec}s <span style={{ fontSize: '11px', fontWeight: 400, color: '#94a3b8' }}>({dwellMs.toLocaleString()} ms)</span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
            State 4/5 dock to Request_For_Dest=1
          </div>
        </div>

        {/* Phase 2: Handshake Protocol */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #78350f',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#fde68a' }}>
            <Cpu size={13} />
            <span>PHASE 2: HANDSHAKE PROTOCOL</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#facc15' }}>
            {protoSec}s <span style={{ fontSize: '11px', fontWeight: 400, color: '#94a3b8' }}>({protoMs.toLocaleString()} ms)</span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
            Request_For_Dest 1 → 99 → 0 complete
          </div>
        </div>

        {/* Phase 3: Transfer & Discharge */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #4c1d95',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#c4b5fd' }}>
            <Boxes size={13} />
            <span>PHASE 3: PHYSICAL DISCHARGE</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa' }}>
            {dischargeSec}s <span style={{ fontSize: '11px', fontWeight: 400, color: '#94a3b8' }}>({dischargeMs.toLocaleString()} ms)</span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
            Handshake Ack to State=1 & pallet handoff
          </div>
        </div>

        {/* Total Cycle */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #0369a1',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>
            <Clock size={13} />
            <span>TOTAL TRANSIT CYCLE</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>
            {totalSec}s <span style={{ fontSize: '11px', fontWeight: 400, color: '#94a3b8' }}>({safeTotal.toLocaleString()} ms)</span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
            Full docked pallet handoff lifecycle
          </div>
        </div>
      </div>
    </div>
  );
};
