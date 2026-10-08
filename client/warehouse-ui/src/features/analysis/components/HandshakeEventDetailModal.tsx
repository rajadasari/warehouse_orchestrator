import React from 'react';
import { X, ArrowDownRight, ArrowUpRight, Info, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { HandshakeRecord } from '../types';
import { CycleWaveformGraph } from './CycleWaveformGraph';

interface HandshakeEventDetailModalProps {
  record: HandshakeRecord | null;
  onClose: () => void;
  onSelectAttempt?: (record: HandshakeRecord) => void;
}

export const HandshakeEventDetailModal: React.FC<HandshakeEventDetailModalProps> = ({
  record,
  onClose,
  onSelectAttempt
}) => {
  if (!record) return null;

  const isSuccess = record.status === 'SUCCESS';
  const events = record.events || [];
  const cycleAttempts = record.cycle_attempts || [];

  // Calculate relative milliseconds offset from the first event
  const baseTime = events.length > 0 ? new Date(events[0].ts).getTime() : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(3px)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card, #0f172a)',
        borderRadius: '12px',
        border: '1px solid var(--border-default, #334155)',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default, #334155)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-header, #1e293b)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                Handshake Sequence: {record.station} {record.substation ? `(${record.substation})` : ''}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                color: isSuccess ? '#10b981' : '#ef4444',
                backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
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
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.35)'
                }}>
                  <RotateCcw size={11} /> Attempt #{record.attempt_number} (Retry)
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
              Pallet ID: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{record.pallet_id}</strong> | Log: {record.file_name} | Cycle: <span style={{ fontFamily: 'monospace' }}>{record.cycle_id}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: '48px',
              minWidth: '48px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status / Metric Banner */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          borderBottom: '1px solid var(--border-default, #334155)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', display: 'block' }}>CYCLE ATTEMPT</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: record.is_retry ? '#f59e0b' : 'var(--text-primary, #f8fafc)' }}>
              Attempt #{record.attempt_number} {record.is_retry ? '(Retry)' : '(Initial)'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', display: 'block' }}>FAILURE REASON</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: record.failure_reason ? '#ef4444' : '#10b981' }}>
              {record.failure_reason || 'None (Completed Successfully)'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', display: 'block' }}>PROTOCOL TIME</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#eab308' }}>
              {record.protocol_duration_ms != null ? `${(record.protocol_duration_ms / 1000).toFixed(2)}s (${record.protocol_duration_ms} ms)` : '-'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', display: 'block' }}>FULL CYCLE TIME</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#06b6d4' }}>
              {record.cycle_duration_ms != null ? `${(record.cycle_duration_ms / 1000).toFixed(1)}s (${record.cycle_duration_ms} ms)` : '-'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', display: 'block' }}>DESTINATION</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              {record.destination || 'None'}
            </span>
          </div>
        </div>

        {/* Chronological Event Ladder */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Cycle Timing Waveform Graph */}
          <CycleWaveformGraph record={record} />

          {/* Cycle Attempts History Timeline (Gap-2 & Gap-3) */}
          {cycleAttempts.length > 1 && (
            <div style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                <RotateCcw size={14} />
                <span>PALLET CYCLE ATTEMPTS LIFECYCLE ({cycleAttempts.length} attempts in {record.cycle_id})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {cycleAttempts.map(att => {
                  const isCurrent = att.id === record.id;
                  const isAttSucc = att.status === 'SUCCESS';
                  return (
                    <div
                      key={att.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                        border: isCurrent ? '1.5px solid #38bdf8' : '1px solid var(--border-default, #334155)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        cursor: onSelectAttempt ? 'pointer' : 'default'
                      }}
                      onClick={() => onSelectAttempt && onSelectAttempt(att)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: isCurrent ? '#38bdf8' : 'var(--text-primary)' }}>
                          Attempt #{att.attempt_number} {att.is_retry ? '(Retry)' : '(Initial)'} {isCurrent ? '• Active' : ''}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: isAttSucc ? '#10b981' : '#ef4444',
                          backgroundColor: isAttSucc ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                        }}>
                          {isAttSucc ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                          {att.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary, #64748b)', fontFamily: 'monospace' }}>
                        {att.start_time.split(' ')[1] || att.start_time}
                      </div>
                      {att.failure_reason && (
                        <div style={{ fontSize: '10.5px', color: '#f87171', fontWeight: 500 }}>
                          {att.failure_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
            CHRONOLOGICAL PLC ↔ mWCS TAG TELEMETRY ({events.length} events)
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary, #64748b)' }}>
              No raw tag events recorded for this transaction.
            </div>
          ) : (
            events.map((evt, idx) => {
              const isWrite = evt.direction === 'WRITE';
              const isRead = evt.direction === 'READ';

              const evtTime = new Date(evt.ts).getTime();
              const offsetMs = !isNaN(evtTime) && baseTime > 0 ? evtTime - baseTime : 0;
              const offsetStr = offsetMs >= 0 ? `+${(offsetMs / 1000).toFixed(3)}s` : '';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isWrite
                      ? 'rgba(56, 189, 248, 0.08)'
                      : isRead
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(148, 163, 184, 0.08)',
                    borderLeft: isWrite
                      ? '3px solid #38bdf8'
                      : isRead
                      ? '3px solid #10b981'
                      : '3px solid #94a3b8',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                >
                  {/* Timestamp & Offset */}
                  <div style={{ width: '190px', flexShrink: 0 }}>
                    <div style={{ color: 'var(--text-primary, #f8fafc)' }}>{evt.ts}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary, #64748b)' }}>{offsetStr}</div>
                  </div>

                  {/* Direction Badge */}
                  <div style={{ width: '130px', flexShrink: 0 }}>
                    {isWrite ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        <ArrowUpRight size={12} />
                        WCS → PLC
                      </span>
                    ) : isRead ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        <ArrowDownRight size={12} />
                        PLC → WCS
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(148, 163, 184, 0.2)',
                        color: '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        <Info size={12} />
                        SYSTEM
                      </span>
                    )}
                  </div>

                  {/* Tag Name */}
                  <div style={{ flex: 1, color: 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>
                    {evt.tag}
                  </div>

                  {/* Value */}
                  <div style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: evt.val === '1' || evt.val === '2' ? '#38bdf8' : evt.val === '16' ? '#ef4444' : 'var(--text-primary, #f8fafc)',
                    fontWeight: 700
                  }}>
                    {evt.val}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-default, #334155)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--bg-header, #1e293b)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: '48px',
              padding: '0 20px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: 'var(--border-default, #334155)',
              color: 'var(--text-primary, #f8fafc)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
