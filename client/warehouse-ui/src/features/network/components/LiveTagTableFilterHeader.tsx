import React from 'react';

interface LiveTagTableFilterHeaderProps {
  showColFilters: boolean;
  colFilters: Record<string, string>;
  onColFilterChange: (colKey: string, val: string) => void;
}

export const LiveTagTableFilterHeader: React.FC<LiveTagTableFilterHeaderProps> = ({
  showColFilters,
  colFilters,
  onColFilterChange
}) => {
  return (
    <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
      {/* Primary Column Header */}
      <tr
        style={{
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          color: 'var(--text-secondary)',
          fontSize: '11.5px',
          fontWeight: 600,
          textAlign: 'left'
        }}
      >
        <th style={{ padding: '8px 12px', minWidth: '240px' }}>Tag Name</th>
        <th style={{ padding: '8px 12px', minWidth: '230px' }}>NodeId / Address</th>
        <th style={{ padding: '8px 12px', minWidth: '110px' }}>Data Type</th>
        <th style={{ padding: '8px 12px', minWidth: '130px' }}>Quality Watchdog</th>
        <th style={{ padding: '8px 12px', minWidth: '220px' }}>Live Value</th>
        <th style={{ padding: '8px 12px', minWidth: '160px' }}>Acquisition Method</th>
        <th style={{ padding: '8px 12px', minWidth: '90px' }}>Log to DB</th>
        <th style={{ padding: '8px 12px', minWidth: '100px' }}>Timestamp</th>
        <th style={{ padding: '8px 12px', minWidth: '130px', textAlign: 'right' }}>Actions</th>
      </tr>

      {/* Per-Column Filter Input Row (matching MasterDataView design) */}
      {showColFilters && (
        <tr
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)'
          }}
        >
          {/* Tag Name filter */}
          <th style={{ padding: '4px 8px' }}>
            <input
              type="text"
              placeholder="Filter Tag Name..."
              value={colFilters['name'] || ''}
              onChange={e => onColFilterChange('name', e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </th>

          {/* NodeId filter */}
          <th style={{ padding: '4px 8px' }}>
            <input
              type="text"
              placeholder="Filter NodeId..."
              value={colFilters['nodeId'] || ''}
              onChange={e => onColFilterChange('nodeId', e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </th>

          {/* Data Type filter */}
          <th style={{ padding: '4px 8px' }}>
            <input
              type="text"
              placeholder="Filter Type..."
              value={colFilters['dataType'] || ''}
              onChange={e => onColFilterChange('dataType', e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </th>

          {/* Quality filter */}
          <th style={{ padding: '4px 8px' }}>
            <input
              type="text"
              placeholder="Filter Quality..."
              value={colFilters['quality'] || ''}
              onChange={e => onColFilterChange('quality', e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </th>

          {/* Live Value filter */}
          <th style={{ padding: '4px 8px' }}>
            <input
              type="text"
              placeholder="Filter Value..."
              value={colFilters['value'] || ''}
              onChange={e => onColFilterChange('value', e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </th>

          {/* Acquisition Method filter */}
          <th style={{ padding: '4px 8px' }}>
            <input
              type="text"
              placeholder="Filter Method..."
              value={colFilters['acquisitionMethod'] || ''}
              onChange={e => onColFilterChange('acquisitionMethod', e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </th>

          {/* Log to DB */}
          <th style={{ padding: '4px 8px' }} />

          {/* Timestamp */}
          <th style={{ padding: '4px 8px' }} />

          {/* Actions */}
          <th style={{ padding: '4px 8px', textAlign: 'right' }}>
            {Object.values(colFilters).some(Boolean) && (
              <span style={{ fontSize: '10px', color: 'var(--color-primary-400, #60A5FA)', fontWeight: 600 }}>
                Active Filters
              </span>
            )}
          </th>
        </tr>
      )}
    </thead>
  );
};
