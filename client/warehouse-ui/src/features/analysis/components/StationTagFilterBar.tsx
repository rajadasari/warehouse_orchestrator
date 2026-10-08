import React from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Calendar, 
  Cpu, 
  SlidersHorizontal
} from 'lucide-react';
import { StationInfo, StationLogFilterState, LogFileInfo } from '../types';

interface StationTagFilterBarProps {
  stations: StationInfo[];
  files: LogFileInfo[];
  filters: StationLogFilterState;
  onChangeFilter: <K extends keyof StationLogFilterState>(key: K, value: StationLogFilterState[K]) => void;
  onApply: () => void;
  onReset: () => void;
  onExportCsv: () => void;
  loading: boolean;
  totalCount: number;
}

export const StationTagFilterBar: React.FC<StationTagFilterBarProps> = ({
  stations,
  files,
  filters,
  onChangeFilter,
  onApply,
  onReset,
  onExportCsv,
  loading,
  totalCount
}) => {
  const selectedStationObj = stations.find(s => s.station === filters.station);

  // Set time presets based on current station bounds or now
  const handleSetMinTime = () => {
    if (selectedStationObj && selectedStationObj.min_timestamp) {
      const dt = selectedStationObj.min_timestamp.slice(0, 19).replace(' ', 'T');
      onChangeFilter('from_time', dt);
    }
  };

  const handleSetMaxTime = () => {
    if (selectedStationObj && selectedStationObj.max_timestamp) {
      const dt = selectedStationObj.max_timestamp.slice(0, 19).replace(' ', 'T');
      onChangeFilter('to_time', dt);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card, #1e293b)',
      border: '1px solid var(--border-color, #334155)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      {/* Row 1: Station Selector + Tag Keyword Filter + Direction */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        alignItems: 'end'
      }}>
        {/* Station Select */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <Cpu size={14} color="#38bdf8" />
            Station:
          </label>
          <select
            value={filters.station}
            onChange={(e) => onChangeFilter('station', e.target.value)}
            style={{
              width: '100%',
              minHeight: '40px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #475569)',
              background: 'var(--bg-input, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Stations (Global)</option>
            {stations.map(st => (
              <option key={st.station} value={st.station}>
                {st.station} ({st.total_events.toLocaleString()} events, {st.unique_tags} tags)
              </option>
            ))}
          </select>
        </div>

        {/* Tag Name / Filter Search */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <Search size={14} color="#38bdf8" />
            Tag Filter:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. CONVEYOR, State, PalletId..."
              value={filters.tag_filter}
              onChange={(e) => onChangeFilter('tag_filter', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onApply()}
              style={{
                width: '100%',
                minHeight: '40px',
                padding: '8px 12px',
                paddingRight: '32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #475569)',
                background: 'var(--bg-input, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {filters.tag_filter && (
              <button
                onClick={() => onChangeFilter('tag_filter', '')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Direction Toggle */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <SlidersHorizontal size={14} color="#38bdf8" />
            Direction:
          </label>
          <div style={{
            display: 'flex',
            background: 'var(--bg-input, #0f172a)',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #475569)',
            padding: '2px',
            minHeight: '40px'
          }}>
            {(['ALL', 'READ', 'WRITE'] as const).map(dir => {
              const active = filters.direction === dir;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onChangeFilter('direction', dir)}
                  style={{
                    flex: 1,
                    background: active ? '#0284c7' : 'transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {dir}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source File Filter */}
        {files.length > 1 && (
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary, #94a3b8)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Log File:
            </label>
            <select
              value={filters.file}
              onChange={(e) => onChangeFilter('file', e.target.value)}
              style={{
                width: '100%',
                minHeight: '40px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #475569)',
                background: 'var(--bg-input, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Files</option>
              {files.map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Row 2: Date-Time Pickers + Presets + Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        alignItems: 'end'
      }}>
        {/* Start Time */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary, #94a3b8)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <Calendar size={14} color="#10b981" />
              Start Date & Time:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSetMinTime}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Min Time
              </button>
              <button
                type="button"
                onClick={() => onChangeFilter('from_time', '')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <input
            type="datetime-local"
            step="1"
            value={filters.from_time}
            onChange={(e) => onChangeFilter('from_time', e.target.value)}
            style={{
              width: '100%',
              minHeight: '40px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #475569)',
              background: 'var(--bg-input, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* End Time */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary, #94a3b8)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <Calendar size={14} color="#f59e0b" />
              End Date & Time:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSetMaxTime}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Max Time
              </button>
              <button
                type="button"
                onClick={() => onChangeFilter('to_time', '')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <input
            type="datetime-local"
            step="1"
            value={filters.to_time}
            onChange={(e) => onChangeFilter('to_time', e.target.value)}
            style={{
              width: '100%',
              minHeight: '40px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #475569)',
              background: 'var(--bg-input, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            style={{
              flex: 2,
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s ease'
            }}
          >
            <Filter size={15} />
            {loading ? 'Filtering...' : 'Filter Tags'}
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            title="Reset all filters"
            style={{
              minHeight: '40px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(51, 65, 85, 0.6)',
              color: '#94a3b8',
              border: '1px solid #475569',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={loading || totalCount === 0}
            title="Export filtered logs as CSV"
            style={{
              minHeight: '40px',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: totalCount === 0 ? 'not-allowed' : 'pointer',
              opacity: totalCount === 0 ? 0.5 : 1
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};
