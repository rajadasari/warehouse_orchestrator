import React from 'react';
import { Layers } from 'lucide-react';

export interface TagValueDisplayProps {
  value: unknown;
  quality?: string;
  isMissing?: boolean;
}

/**
 * Industrial HMI Tag Value Renderer (IEC 62443 / IEC 62541).
 * Displays live values directly at tag level.
 * When rendered on a parent UDT tag, displays a clean summary pill (e.g. UDT [2 items]).
 * When rendered on member tags in the tree, displays the exact typed value.
 */
export const TagValueDisplay: React.FC<TagValueDisplayProps> = ({
  value,
  quality,
  isMissing
}) => {
  if (isMissing || quality?.startsWith('MISSING')) {
    return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
  }

  if (value === null || value === undefined || value === '') {
    return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
  }

  // Parse JSON string if stored as stringified object or array
  let parsedValue = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsedValue = JSON.parse(trimmed);
      } catch {
        parsedValue = value;
      }
    }
  }

  // Detect and handle legacy "[object Object]" string gracefully
  if (typeof parsedValue === 'string' && parsedValue.includes('[object Object]')) {
    return (
      <span style={{
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        color: '#F59E0B',
        fontSize: '11px',
        fontWeight: 600
      }}>
        UDT (Sync to Read)
      </span>
    );
  }

  // 1. Array of UDT elements / objects (e.g. [ { ... }, { ... } ])
  if (Array.isArray(parsedValue)) {
    const isObjectArray = parsedValue.length > 0 && typeof parsedValue[0] === 'object' && parsedValue[0] !== null;

    if (isObjectArray) {
      const firstItem = parsedValue[0] as Record<string, unknown>;
      const keys = Object.keys(firstItem).filter(k => !k.startsWith('_')).slice(0, 2);
      const summary = keys.map(k => `${k}: ${String(firstItem[k] ?? '')}`).join(', ');

      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38BDF8',
            fontSize: '10.5px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <Layers size={11} />
            UDT [{parsedValue.length} items]
          </span>
          {summary && (
            <span style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {summary}
            </span>
          )}
        </div>
      );
    }

    // Array of primitives: [ 10, 20, 30 ]
    return (
      <span style={{ fontFamily: 'monospace', color: '#38BDF8', fontWeight: 600 }}>
        [{parsedValue.map(v => String(v)).join(', ')}]
      </span>
    );
  }

  // 2. Single UDT Object (e.g. { speed: 1200, status: 'OK' })
  if (typeof parsedValue === 'object' && parsedValue !== null) {
    const record = parsedValue as Record<string, unknown>;
    const keys = Object.keys(record).filter(k => !k.startsWith('_'));
    const previewKeys = keys.slice(0, 3);

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontSize: '11px', flexWrap: 'wrap' }}>
        {previewKeys.map(k => (
          <span
            key={k}
            style={{
              padding: '1px 5px',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <span style={{ color: '#94A3B8' }}>{k}:</span>{' '}
            <strong style={{
              color: typeof record[k] === 'boolean'
                ? (record[k] ? '#10B981' : '#EF4444')
                : (typeof record[k] === 'number' ? '#38BDF8' : 'var(--text-primary)')
            }}>
              {String(record[k] ?? '—')}
            </strong>
          </span>
        ))}
        {keys.length > 3 && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
            +{keys.length - 3} more
          </span>
        )}
      </div>
    );
  }

  // 3. Boolean
  if (typeof parsedValue === 'boolean') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 700,
        fontFamily: 'monospace',
        color: parsedValue ? '#10B981' : '#EF4444'
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: parsedValue ? '#10B981' : '#EF4444'
        }} />
        {parsedValue ? 'TRUE' : 'FALSE'}
      </span>
    );
  }

  // 4. Number
  if (typeof parsedValue === 'number') {
    return (
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
        {parsedValue}
      </span>
    );
  }

  // 5. String / fallback
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
      {String(parsedValue)}
    </span>
  );
};
