import React from 'react';
import { AlertCircle, Ban, RefreshCw, Clock, Barcode, ShieldAlert } from 'lucide-react';

interface FailureBreakdownBarProps {
  breakdown: Record<string, number>;
  selectedReason: string;
  onSelectReason: (reason: string) => void;
}

export const FailureBreakdownBar: React.FC<FailureBreakdownBarProps> = ({
  breakdown,
  selectedReason,
  onSelectReason
}) => {
  const getReasonMeta = (key: string) => {
    switch (key) {
      case 'MID_CYCLE_FAULT':
        return { label: 'Mid-Cycle Fault (State=16)', icon: <AlertCircle size={14} />, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' };
      case 'RETRY_ABORTED':
        return { label: 'Retry Aborted', icon: <RefreshCw size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'PLC_FAULT':
        return { label: 'PLC Faults', icon: <AlertCircle size={14} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
      case 'ABORT_SIGNAL':
        return { label: 'Abort Signal', icon: <Ban size={14} />, color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' };
      case 'RETRIGGERED_RESET':
        return { label: 'Retriggered / Incomplete', icon: <RefreshCw size={14} />, color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' };
      case 'TIMEOUT':
        return { label: 'Handshake Timeout', icon: <Clock size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'BARCODE_READ_FAIL':
        return { label: 'Barcode Read Error (1111111111)', icon: <Barcode size={14} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
      case 'PROFILE_REJECT':
        return { label: 'Profile Rejections', icon: <ShieldAlert size={14} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
      default:
        return { label: key, icon: <AlertCircle size={14} />, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
    }
  };

  const keys = Object.keys(breakdown);
  if (keys.length === 0) return null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: '8px',
      border: '1px solid var(--border-default)',
      padding: '10px 14px',
      marginBottom: '16px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '6px' }}>
        Failure Breakdown:
      </span>

      <button
        type="button"
        onClick={() => onSelectReason('ALL')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          minHeight: '48px',
          borderRadius: '6px',
          border: selectedReason === 'ALL' ? '1px solid var(--color-primary-500, #38bdf8)' : '1px solid var(--border-default)',
          backgroundColor: selectedReason === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
          color: selectedReason === 'ALL' ? 'var(--color-primary-400, #38bdf8)' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all 0.15s ease'
        }}
      >
        All Failures
      </button>

      {keys.map(key => {
        const count = breakdown[key];
        const meta = getReasonMeta(key);
        const isSelected = selectedReason.toLowerCase() === key.toLowerCase();

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectReason(isSelected ? 'ALL' : key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              minHeight: '48px',
              borderRadius: '6px',
              border: isSelected ? `1.5px solid ${meta.color}` : '1px solid var(--border-default)',
              backgroundColor: isSelected ? meta.bg : 'transparent',
              color: isSelected ? meta.color : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ color: meta.color, display: 'flex' }}>{meta.icon}</span>
            <span>{meta.label}</span>
            <span style={{
              backgroundColor: meta.color,
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              marginLeft: '4px'
            }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
