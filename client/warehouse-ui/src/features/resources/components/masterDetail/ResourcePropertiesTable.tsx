import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  SlidersHorizontal,
  Copy,
  Check
} from 'lucide-react';
import { Badge } from '../../../../components/common/Badge';
import { UnifiedPropertyItem } from './types';

export interface ResourcePropertiesTableProps {
  properties: UnifiedPropertyItem[];
  groupTitle: string;
  badgeLabel?: string;
  emptyMessage?: string;
}

export const ResourcePropertiesTable: React.FC<ResourcePropertiesTableProps> = ({
  properties,
  groupTitle,
  badgeLabel,
  emptyMessage = 'No properties found in this group.'
}) => {
  const [secretVisibility, setSecretVisibility] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleSecret = (key: string) => {
    setSecretVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyValue = (key: string, val: unknown) => {
    const text = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const formatValueDisplay = (item: UnifiedPropertyItem, isConfigured = false) => {
    const val = isConfigured ? item.configuredValue : item.liveValue;

    if (val === undefined || val === null || val === '') {
      return <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>—</span>;
    }

    if (item.type === 'SECRET') {
      const isVisible = secretVisibility[item.key];
      if (!isVisible) {
        return <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>••••••••</span>;
      }
      return <span style={{ fontFamily: 'monospace' }}>{String(val)}</span>;
    }

    if (item.type === 'BOOLEAN' || typeof val === 'boolean') {
      const isTrue = val === true || val === 'true';
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 600,
          color: isTrue ? '#10B981' : 'var(--text-secondary)',
          fontFamily: 'monospace'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isTrue ? '#10B981' : '#64748B'
          }} />
          {String(val)}
        </span>
      );
    }

    if (typeof val === 'object') {
      return (
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
          {JSON.stringify(val)}
        </span>
      );
    }

    return (
      <span style={{ fontFamily: 'monospace', fontWeight: isConfigured ? 500 : 600 }}>
        {String(val)}{item.unit ? ` ${item.unit}` : ''}
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px'
    }}>
      {/* Group Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={15} color="var(--color-primary-500, #3B82F6)" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {groupTitle}
          </h4>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)'
          }}>
            {properties.length}
          </span>
        </div>

        {badgeLabel && (
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {badgeLabel}
          </span>
        )}
      </div>

      {properties.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '12px'
        }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--border-default)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '28%' }}>
                  Property Name / Key
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '12%' }}>
                  Data Type
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '22%' }}>
                  Blueprint / Default
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '24%' }}>
                  Value
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '14%' }}>
                  Telemetry Logging
                </th>
              </tr>
            </thead>
            <tbody>
              {properties.map(prop => {
                const isPulseActive = prop.isChanged;
                const isSecret = prop.type === 'SECRET';

                return (
                  <tr
                    key={prop.id}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      backgroundColor: isPulseActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      transition: 'background-color 0.4s ease'
                    }}
                  >
                    {/* 1. Property Name / Key */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          fontSize: '12px'
                        }}>
                          {prop.key}
                        </span>
                        {prop.required && (
                          <Badge variant="danger" style={{ fontSize: '9px', padding: '1px 5px' }}>REQ</Badge>
                        )}
                      </div>
                      {prop.label && prop.label !== prop.key && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {prop.label}
                        </div>
                      )}
                      {prop.description && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-disabled)', marginTop: '2px' }}>
                          {prop.description}
                        </div>
                      )}
                    </td>

                    {/* 2. Data Type */}
                    <td style={{ padding: '10px 14px' }}>
                      <Badge variant="info">
                        {prop.type}
                      </Badge>
                    </td>

                    {/* 3. Configured / Blueprint Value */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-default)',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatValueDisplay(prop, true)}
                      </div>
                    </td>

                    {/* 4. Live Value */}
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: isPulseActive ? 'rgba(16, 185, 129, 0.16)' : 'var(--bg-surface-subtle)',
                        border: isPulseActive ? '1px solid #10B981' : '1px solid var(--border-default)',
                        boxShadow: isPulseActive ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{
                            color: isPulseActive ? '#10B981' : 'var(--text-primary)',
                            fontWeight: isPulseActive ? 700 : 500,
                            transition: 'color 0.3s ease'
                          }}>
                            {formatValueDisplay(prop, false)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          {isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleSecret(prop.key)}
                              title={secretVisibility[prop.key] ? 'Hide secret' : 'Show secret'}
                              style={{
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '3px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {secretVisibility[prop.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyValue(prop.key, prop.liveValue)}
                            title="Copy value"
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: copiedKey === prop.key ? '#10B981' : 'var(--text-secondary)',
                              padding: '3px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {copiedKey === prop.key ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* 5. Telemetry Logging */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {prop.logToTelemetry ? (
                        <Badge variant="success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          Enabled
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
