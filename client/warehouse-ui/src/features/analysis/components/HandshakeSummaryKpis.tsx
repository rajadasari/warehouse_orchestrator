import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, Zap, Boxes } from 'lucide-react';
import { HandshakeSummary } from '../types';

interface HandshakeSummaryKpisProps {
  summary: HandshakeSummary | null;
  loading: boolean;
}

export const HandshakeSummaryKpis: React.FC<HandshakeSummaryKpisProps> = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ height: '88px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  const total = summary?.total_handshakes ?? 0;
  const success = summary?.total_success ?? 0;
  const failed = summary?.total_failed ?? 0;
  const rate = summary?.success_rate_pct ?? 0;
  const protoMs = summary?.avg_protocol_duration_ms ?? 0;
  const dischargeMs = summary?.avg_discharge_duration_ms ?? 0;
  const cycleMs = summary?.avg_cycle_duration_ms ?? 0;

  const protoSec = (protoMs / 1000).toFixed(2);
  const dischargeSec = (dischargeMs / 1000).toFixed(1);
  const cycleSec = (cycleMs / 1000).toFixed(1);

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid var(--border-default)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '88px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    }}>
      {/* Total Handshakes */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>TOTAL HANDSHAKES</span>
          <RefreshCw size={16} color="var(--color-primary-400, #38bdf8)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {total.toLocaleString()}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>cycles</span>
        </div>
      </div>

      {/* Success Rate */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>SUCCESSFUL CYCLES</span>
          <CheckCircle2 size={16} color="#10b981" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {success.toLocaleString()}
          </span>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: rate >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: rate >= 80 ? '#10b981' : '#f59e0b'
          }}>
            {rate}%
          </span>
        </div>
      </div>

      {/* Failed Handshakes */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>FAILED ATTEMPTS</span>
          <AlertTriangle size={16} color="#ef4444" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: failed > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {failed.toLocaleString()}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {total > 0 ? `${((failed / total) * 100).toFixed(1)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* Retried Attempts (Gap-3) */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>RETRIED ATTEMPTS</span>
          <RefreshCw size={16} color="#f59e0b" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: (summary?.total_retries ?? 0) > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {(summary?.total_retries ?? 0).toLocaleString()}
          </span>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b'
          }}>
            {total > 0 ? `${(((summary?.total_retries ?? 0) / total) * 100).toFixed(1)}% retries` : '0%'}
          </span>
        </div>
      </div>

      {/* Protocol Handshake Duration */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>AVG PROTOCOL TIME</span>
          <Zap size={16} color="#eab308" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#eab308' }}>
            {protoSec}s
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            ({protoMs} ms)
          </span>
        </div>
      </div>

      {/* Discharge Duration */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>AVG DISCHARGE TIME</span>
          <Boxes size={16} color="#a78bfa" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>
            {dischargeSec}s
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Ack → Cleared
          </span>
        </div>
      </div>

      {/* Full Station Cycle Duration */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
          <span>AVG TRANSIT CYCLE</span>
          <Clock size={16} color="#06b6d4" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#06b6d4' }}>
            {cycleSec}s
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>arrival → handoff</span>
        </div>
      </div>
    </div>
  );
};
