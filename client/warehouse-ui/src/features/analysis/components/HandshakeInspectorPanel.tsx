import React, { useState } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Download, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Activity
} from 'lucide-react';
import { HandshakeRecord } from '../types';
import { InteractiveWaveformTimeline } from './InteractiveWaveformTimeline';
import { SynchronizedLogViewer } from './SynchronizedLogViewer';
import { analysisService } from '../analysisService';

interface HandshakeInspectorPanelProps {
  record: HandshakeRecord | null;
  loading?: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onSelectAttempt?: (record: HandshakeRecord) => void;
}

export const HandshakeInspectorPanel: React.FC<HandshakeInspectorPanelProps> = ({
  record,
  loading = false,
  isMaximized,
  onToggleMaximize,
  onSelectAttempt
}) => {
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);

  if (!record) {
    return (
      <div style={{
        backgroundColor: '#090d16',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
        textAlign: 'center',
        color: '#64748b',
        gap: '12px'
      }}>
        <Activity size={32} color="#334155" style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>
          {loading ? 'Loading Telemetry...' : 'No Transaction Selected'}
        </div>
        <div style={{ fontSize: '12px', maxWidth: '300px' }}>
          {loading 
            ? 'Fetching detailed cycle timeline and events...' 
            : 'Select any handshake record from the left table to inspect its synchronized waveform, time-series telemetry, and raw log slice.'}
        </div>
      </div>
    );
  }

  const isSuccess = record.status === 'SUCCESS';
  const cycleAttempts = record.cycle_attempts || [];

  const handleDownloadCsv = () => {
    analysisService.downloadExportCsv({ cycle_id: record.cycle_id });
  };

  const handleDownloadLogs = async () => {
    try {
      await analysisService.downloadRawLogs(record.id);
    } catch (err) {
      console.error('Failed to download raw logs:', err);
    }
  };

  return (
    <div style={{
      backgroundColor: '#0b1120',
      borderRadius: '10px',
      border: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '600px',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Inspector Header Bar */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              {record.station} {record.substation ? `(${record.substation})` : ''}
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
            Pallet: <strong style={{ color: '#38bdf8' }}>{record.pallet_id}</strong> • Cycle: <span style={{ fontFamily: 'monospace' }}>{record.cycle_id}</span>
          </div>
        </div>

        {/* Action Controls (48px Touch Target Standard) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleDownloadCsv}
            title="Download CSV report for this cycle"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
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
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLogs}
            title="Download raw telemetry slice (.log)"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
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
            <FileText size={14} />
            <span>Raw .log</span>
          </button>

          <button
            type="button"
            onClick={onToggleMaximize}
            title={isMaximized ? "Restore Split View" : "Maximize Inspector Panel"}
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
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
            {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isMaximized ? 'Split' : 'Maximize'}</span>
          </button>
        </div>
      </div>

      {/* Attempts Ribbon (if cycle has retries) */}
      {cycleAttempts.length > 1 && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#090d16',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RotateCcw size={12} /> Attempts:
          </span>
          {cycleAttempts.map(att => {
            const isAttActive = att.id === record.id;
            const isAttSucc = att.status === 'SUCCESS';
            return (
              <button
                key={att.id}
                type="button"
                onClick={() => onSelectAttempt && onSelectAttempt(att)}
                style={{
                  minHeight: '32px',
                  padding: '2px 10px',
                  borderRadius: '4px',
                  backgroundColor: isAttActive ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                  border: isAttActive ? '1.5px solid #38bdf8' : '1px solid #334155',
                  color: isAttActive ? '#38bdf8' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {isAttSucc ? <CheckCircle2 size={10} color="#10b981" /> : <AlertTriangle size={10} color="#ef4444" />}
                <span>#{att.attempt_number} {att.is_retry ? '(Retry)' : '(Init)'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area: Waveform Graph (Top) + Synchronized Logs (Bottom) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Upper: Interactive Multi-Track Waveform Timeline with Real Timestamps */}
        <InteractiveWaveformTimeline
          record={record}
          activeEventIndex={activeEventIndex}
          onHoverEventIndex={setActiveEventIndex}
          onSelectEventIndex={setActiveEventIndex}
        />

        {/* Lower: Synchronized Telemetry Log Stream */}
        <SynchronizedLogViewer
          events={record.events || []}
          activeEventIndex={activeEventIndex}
          onSelectEventIndex={setActiveEventIndex}
          recordId={record.id}
        />
      </div>
    </div>
  );
};
