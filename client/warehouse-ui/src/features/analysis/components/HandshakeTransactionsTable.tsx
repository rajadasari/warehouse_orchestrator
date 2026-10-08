import React from 'react';
import { CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Tag, RotateCcw, Activity } from 'lucide-react';
import { HandshakeRecord } from '../types';

interface HandshakeTransactionsTableProps {
  records: HandshakeRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  selectedRecordId?: string | null;
  onPageChange: (newPage: number) => void;
  onSelectPallet: (palletId: string) => void;
  onSelectStation: (station: string) => void;
  onInspect: (record: HandshakeRecord) => void;
  onSelectRecord?: (record: HandshakeRecord) => void;
}

export const HandshakeTransactionsTable: React.FC<HandshakeTransactionsTableProps> = ({
  records,
  total,
  page,
  pageSize,
  totalPages,
  loading,
  selectedRecordId,
  onPageChange,
  onSelectPallet,
  onSelectStation,
  onInspect,
  onSelectRecord
}) => {
  const getFailureBadge = (reason: string | null) => {
    if (!reason) return null;
    let color = '#ef4444';
    let bg = 'rgba(239, 68, 68, 0.15)';
    if (reason.includes('MID_CYCLE')) {
      color = '#f43f5e';
      bg = 'rgba(244, 63, 94, 0.15)';
    } else if (reason.includes('RETRY_ABORTED')) {
      color = '#f59e0b';
      bg = 'rgba(245, 158, 11, 0.15)';
    } else if (reason.includes('ABORT')) {
      color = '#f97316';
      bg = 'rgba(249, 115, 22, 0.15)';
    } else if (reason.includes('RETRIGGERED')) {
      color = '#eab308';
      bg = 'rgba(234, 179, 8, 0.15)';
    } else if (reason.includes('TIMEOUT')) {
      color = '#f59e0b';
      bg = 'rgba(245, 158, 11, 0.15)';
    } else if (reason.includes('BARCODE')) {
      color = '#ec4899';
      bg = 'rgba(236, 72, 153, 0.15)';
    }

    return (
      <span style={{
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '4px',
        color,
        backgroundColor: bg,
        marginTop: '3px'
      }}>
        {reason}
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-card, #0f172a)',
      borderRadius: '8px',
      border: '1px solid var(--border-default, #334155)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Table Header Bar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-default, #334155)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--bg-header, #1e293b)'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
          HANDSHAKE TRANSACTIONS ({total.toLocaleString()} total)
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
          Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', minHeight: '320px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-default, #334155)',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              color: 'var(--text-secondary, #94a3b8)',
              fontWeight: 600,
              fontSize: '11px',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Timestamp (Start / End)</th>
              <th style={{ padding: '12px 16px' }}>Station</th>
              <th style={{ padding: '12px 16px' }}>Pallet ID</th>
              <th style={{ padding: '12px 16px' }}>Destination</th>
              <th style={{ padding: '12px 16px' }}>Protocol Duration</th>
              <th style={{ padding: '12px 16px' }}>Cycle Duration</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && records.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                  Loading handshake records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                  No handshake records found matching your filters.
                </td>
              </tr>
            ) : (
              records.map(rec => {
                const isSuccess = rec.status === 'SUCCESS';
                const protoSec = rec.protocol_duration_ms != null ? (rec.protocol_duration_ms / 1000).toFixed(3) : '-';
                const cycleSec = rec.cycle_duration_ms != null ? (rec.cycle_duration_ms / 1000).toFixed(3) : '-';

                const isSelected = selectedRecordId === rec.id;

                return (
                  <tr
                    key={rec.id}
                    onClick={() => onSelectRecord ? onSelectRecord(rec) : onInspect(rec)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #1e293b)',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Status Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: isSuccess ? '#10b981' : '#ef4444',
                            backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                          }}>
                            {isSuccess ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                            {rec.status}
                          </span>

                          {rec.is_retry ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.18)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }} title={`Retry attempt #${rec.attempt_number} for cycle ${rec.cycle_id}`}>
                              <RotateCcw size={10} /> Attempt #{rec.attempt_number}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 500,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(148, 163, 184, 0.1)',
                              color: 'var(--text-tertiary, #94a3b8)'
                            }}>
                              Attempt #1
                            </span>
                          )}
                        </div>
                        {!isSuccess && getFailureBadge(rec.failure_reason)}
                      </div>
                    </td>

                    {/* Timestamp Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', color: 'var(--text-primary, #f8fafc)', fontFamily: 'monospace', fontSize: '11.5px' }}>
                      <div>{rec.start_time}</div>
                      {rec.end_time && (
                        <div style={{ color: 'var(--text-tertiary, #64748b)', fontSize: '10.5px' }}>
                          → {rec.end_time}
                        </div>
                      )}
                    </td>

                    {/* Station Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <button
                        type="button"
                        onClick={() => onSelectStation(rec.station)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary-400, #38bdf8)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '13px',
                          textDecoration: 'underline',
                          minHeight: '28px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title={`Filter by station ${rec.station}`}
                      >
                        {rec.station}
                      </button>
                      {rec.substation && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                          {rec.substation}
                        </div>
                      )}
                      {rec.cycle_id && (
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary, #64748b)', fontFamily: 'monospace', marginTop: '2px' }} title={rec.cycle_id}>
                          Cycle: {rec.cycle_id.split('_').slice(-2).join('_')}
                        </div>
                      )}
                    </td>

                    {/* Pallet ID Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {rec.pallet_id && rec.pallet_id !== 'UNKNOWN' ? (
                        <button
                          type="button"
                          onClick={() => onSelectPallet(rec.pallet_id)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '4px',
                            color: 'var(--color-primary-300, #7dd3fc)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontFamily: 'monospace',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            minHeight: '32px'
                          }}
                          title={`Filter all transactions for Pallet ID ${rec.pallet_id}`}
                        >
                          <Tag size={12} />
                          {rec.pallet_id}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary, #64748b)', fontSize: '11px' }}>None</span>
                      )}
                    </td>

                    {/* Destination Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', color: 'var(--text-secondary, #94a3b8)' }}>
                      {rec.destination ? (
                        <span style={{ fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                          {rec.destination}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary, #64748b)' }}>-</span>
                      )}
                    </td>

                    {/* Protocol Duration Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {rec.protocol_duration_ms != null ? (
                        <div>
                          <span style={{ fontWeight: 600, color: rec.protocol_duration_ms > 5000 ? '#f59e0b' : 'var(--text-primary, #f8fafc)' }}>
                            {protoSec}s
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary, #64748b)', marginLeft: '4px' }}>
                            ({rec.protocol_duration_ms} ms)
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary, #64748b)' }}>-</span>
                      )}
                    </td>

                    {/* Cycle Duration Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {rec.cycle_duration_ms != null ? (
                        <span style={{ color: 'var(--text-primary, #f8fafc)' }}>
                          {cycleSec}s
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary, #64748b)' }}>-</span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => onInspect(rec)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '48px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: 'var(--color-primary-400, #38bdf8)',
                          cursor: 'pointer'
                        }}
                      >
                        <Activity size={14} />
                        <span>Waveform & Logs</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-default, #334155)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-header, #1e293b)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
            Page {page} of {totalPages}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                minHeight: '48px',
                padding: '0 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-default, #334155)',
                backgroundColor: 'transparent',
                color: page <= 1 ? 'var(--text-disabled, #475569)' : 'var(--text-primary, #f8fafc)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                minHeight: '48px',
                padding: '0 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-default, #334155)',
                backgroundColor: 'transparent',
                color: page >= totalPages ? 'var(--text-disabled, #475569)' : 'var(--text-primary, #f8fafc)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
