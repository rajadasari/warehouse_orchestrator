import React from 'react';
import { Badge } from '../../../../components/common/Badge';

export interface PayloadProperty {
  key: string;
  label: string;
  type: string;       // STRING | NUMBER | BOOLEAN | SECRET | ENUM | ARRAY
  source: 'INHERITED' | 'CUSTOM';
  assignedValue: string;
}

export interface MethodPayloadPropertyTableProps {
  properties: PayloadProperty[];
  onChangeAssignedValue: (key: string, value: string) => void;
  disabled?: boolean;
}

/** Badge variant mapping by data type for industrial visual identity. */
function typeVariant(type: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (type) {
    case 'NUMBER':  return 'info';
    case 'BOOLEAN': return 'warning';
    case 'SECRET':  return 'danger';
    case 'ARRAY':   return 'neutral';
    default:        return 'success';
  }
}

export const MethodPayloadPropertyTable: React.FC<MethodPayloadPropertyTableProps> = ({
  properties,
  onChangeAssignedValue,
  disabled = false,
}) => {
  if (properties.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--border-default)',
          borderRadius: '6px',
        }}
      >
        No properties defined in Step 2. Add properties to bind payload fields.
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '6px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 90px 80px 1.5fr',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderBottom: '1px solid var(--border-default)',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
        }}
      >
        <span>Property</span>
        <span>Data Type</span>
        <span>Source</span>
        <span>Value / Binding</span>
      </div>

      {/* Rows */}
      {properties.map(p => (
        <div
          key={p.key}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 90px 80px 1.5fr',
            gap: '8px',
            padding: '7px 12px',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-default)',
            fontSize: '12px',
            minHeight: '40px',
          }}
        >
          {/* Property key */}
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={p.label}
          >
            {p.key}
          </span>

          {/* Data type badge */}
          <Badge variant={typeVariant(p.type)} style={{ fontSize: '9px' }}>
            {p.type}
          </Badge>

          {/* Source badge */}
          <Badge
            variant={p.source === 'INHERITED' ? 'neutral' : 'info'}
            style={{ fontSize: '9px' }}
          >
            {p.source === 'INHERITED' ? 'Default' : 'Custom'}
          </Badge>

          {/* Assigned value input */}
          <input
            type={p.type === 'SECRET' ? 'password' : 'text'}
            value={p.assignedValue}
            onChange={e => onChangeAssignedValue(p.key, e.target.value)}
            disabled={disabled}
            placeholder={p.type === 'SECRET' ? '••••••••' : `Enter ${p.key} value`}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: disabled ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              minHeight: '32px',
            }}
          />
        </div>
      ))}
    </div>
  );
};
