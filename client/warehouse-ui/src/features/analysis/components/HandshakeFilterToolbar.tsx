import React from 'react';
import { Search, Calendar, FileText, RefreshCw, X, RotateCcw, Upload, Download } from 'lucide-react';
import { AnalysisFilterState, LogFileInfo } from '../types';

interface HandshakeFilterToolbarProps {
  filters: AnalysisFilterState;
  files: LogFileInfo[];
  loading: boolean;
  uploading?: boolean;
  onFilterChange: (newFilters: Partial<AnalysisFilterState>) => void;
  onResetFilters: () => void;
  onRescan: () => void;
  onUploadFile: (file: File) => void;
  onExportCsv?: () => void;
}

export const HandshakeFilterToolbar: React.FC<HandshakeFilterToolbarProps> = ({
  filters,
  files,
  loading,
  uploading = false,
  onFilterChange,
  onResetFilters,
  onRescan,
  onUploadFile,
  onExportCsv
}) => {
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input, #1e293b)',
    color: 'var(--text-primary, #f8fafc)',
    border: '1px solid var(--border-default, #334155)',
    borderRadius: '6px',
    padding: '0 12px',
    fontSize: '12.5px',
    minHeight: '48px',
    boxSizing: 'border-box',
    outline: 'none',
    width: '100%'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary, #94a3b8)',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-card, #0f172a)',
      borderRadius: '8px',
      border: '1px solid var(--border-default, #334155)',
      padding: '14px 16px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Top Filter Controls Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        {/* Log File Selector */}
        <div>
          <label style={labelStyle}>
            <FileText size={13} />
            <span>LOG FILE</span>
          </label>
          <select
            value={filters.file}
            onChange={(e) => onFilterChange({ file: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="all">All Log Files ({files.length})</option>
            {files.map(f => (
              <option key={f.name} value={f.name}>
                {f.name} ({f.handshake_count.toLocaleString()} cycles)
              </option>
            ))}
          </select>
        </div>

        {/* Station Filter */}
        <div>
          <label style={labelStyle}>
            <Search size={13} />
            <span>STATION ID</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. B3C2, B4CT1"
              value={filters.station}
              onChange={(e) => onFilterChange({ station: e.target.value })}
              style={inputStyle}
            />
            {filters.station && (
              <button
                type="button"
                onClick={() => onFilterChange({ station: '' })}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary, #64748b)',
                  cursor: 'pointer',
                  padding: '4px',
                  minHeight: '48px',
                  minWidth: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Pallet ID Filter */}
        <div>
          <label style={labelStyle}>
            <Search size={13} />
            <span>PALLET ID</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. TP00000001, SP00002903"
              value={filters.pallet_id}
              onChange={(e) => onFilterChange({ pallet_id: e.target.value })}
              style={inputStyle}
            />
            {filters.pallet_id && (
              <button
                type="button"
                onClick={() => onFilterChange({ pallet_id: '' })}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary, #64748b)',
                  cursor: 'pointer',
                  padding: '4px',
                  minHeight: '48px',
                  minWidth: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* From Date/Time with Calendar Picker */}
        <div>
          <label style={labelStyle}>
            <Calendar size={13} />
            <span>FROM DATE/TIME</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="datetime-local"
              value={filters.from_time}
              onChange={(e) => onFilterChange({ from_time: e.target.value })}
              style={{
                ...inputStyle,
                colorScheme: 'dark',
                paddingRight: filters.from_time ? '36px' : '12px'
              }}
            />
            {filters.from_time && (
              <button
                type="button"
                onClick={() => onFilterChange({ from_time: '' })}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary, #64748b)',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear From Date/Time"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* To Date/Time with Calendar Picker */}
        <div>
          <label style={labelStyle}>
            <Calendar size={13} />
            <span>TO DATE/TIME</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="datetime-local"
              value={filters.to_time}
              onChange={(e) => onFilterChange({ to_time: e.target.value })}
              style={{
                ...inputStyle,
                colorScheme: 'dark',
                paddingRight: filters.to_time ? '36px' : '12px'
              }}
            />
            {filters.to_time && (
              <button
                type="button"
                onClick={() => onFilterChange({ to_time: '' })}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary, #64748b)',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear To Date/Time"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Filter Controls Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        paddingTop: '8px',
        borderTop: '1px solid var(--border-default, #1e293b)'
      }}>
        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginRight: '4px' }}>
            STATUS:
          </span>
          {(['ALL', 'SUCCESS', 'FAILED'] as const).map(s => {
            const active = filters.status === s;
            let activeBg = 'var(--color-primary-500, #38bdf8)';
            if (s === 'SUCCESS') activeBg = '#10b981';
            if (s === 'FAILED') activeBg = '#ef4444';

            return (
              <button
                key={s}
                type="button"
                onClick={() => onFilterChange({ status: s })}
                style={{
                  minHeight: '48px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? `1px solid ${activeBg}` : '1px solid var(--border-default, #334155)',
                  backgroundColor: active ? (s === 'ALL' ? 'rgba(56, 189, 248, 0.2)' : s === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 'transparent',
                  color: active ? (s === 'ALL' ? 'var(--color-primary-400, #38bdf8)' : activeBg) : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s ease'
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Attempt / Retry Filter Pills (Gap-3) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginRight: '4px' }}>
            ATTEMPT:
          </span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'INITIAL', label: 'Initial (#1)' },
            { id: 'RETRY', label: 'Retries (Gap-3)' }
          ].map(opt => {
            const active = (filters.is_retry ?? 'ALL') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFilterChange({ is_retry: opt.id as any })}
                style={{
                  minHeight: '48px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid #f59e0b' : '1px solid var(--border-default, #334155)',
                  backgroundColor: active ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: active ? '#f59e0b' : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s ease'
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Upload Log File Button */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px',
              padding: '0 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--color-primary-400, #38bdf8)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
            title="Upload a new .log file to release/dcs_logs/"
          >
            <Upload size={14} />
            <span>{uploading ? 'Uploading...' : 'Upload Log File'}</span>
            <input
              type="file"
              accept=".log,.txt"
              disabled={uploading}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </label>

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              title="Download CSV report of filtered handshake cycle transactions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '48px',
                padding: '0 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            title="Reset Filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px',
              padding: '0 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'transparent',
              color: 'var(--text-secondary, #94a3b8)',
              border: '1px solid var(--border-default, #334155)',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>

          <button
            type="button"
            onClick={onRescan}
            disabled={loading}
            title="Re-scan and refresh log files"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px',
              padding: '0 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'var(--color-primary-600, #0284c7)',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{loading ? 'Scanning...' : 'Re-scan Logs'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
