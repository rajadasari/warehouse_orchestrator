import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowRight, Eye, Code2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { ContextVariableItem } from './ContextVariableChips';

export interface FieldMappingRow {
  targetField: string;
  sourceType: 'CONTEXT_VAR' | 'CONSTANT';
  sourceValue: string;
}

interface VisualFieldMappingTableProps {
  mappings: FieldMappingRow[];
  onChangeMappings: (updated: FieldMappingRow[]) => void;
  availableVariables: ContextVariableItem[];
  defaultSchemaCode?: string;
  onPayloadCompiled?: (compiledJson: string) => void;
}

const DEFAULT_SCHEMAS: Record<string, FieldMappingRow[]> = {
  WMS_PRE_ANNOUNCE: [
    { targetField: 'palletId', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'skuCode', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'quantity', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'sourceDock', sourceType: 'CONTEXT_VAR', sourceValue: '' }
  ],
  WMS_CREATE_ORDER: [
    { targetField: 'orderNumber', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'sku', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'units', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'priority', sourceType: 'CONSTANT', sourceValue: 'NORMAL' }
  ],
  WMS_STATUS_POLL: [
    { targetField: 'palletId', sourceType: 'CONTEXT_VAR', sourceValue: '' },
    { targetField: 'timestamp', sourceType: 'CONTEXT_VAR', sourceValue: '' }
  ]
};

export const compileMappingsToJson = (rows: FieldMappingRow[]): string => {
  const obj: Record<string, unknown> = {};
  rows.forEach(r => {
    const key = r.targetField.trim();
    if (!key) return;
    if (r.sourceType === 'CONTEXT_VAR') {
      if (r.sourceValue && r.sourceValue.trim()) {
        obj[key] = `{{${r.sourceValue.trim()}}}`;
      }
    } else {
      if (!isNaN(Number(r.sourceValue)) && r.sourceValue.trim() !== '') {
        obj[key] = Number(r.sourceValue);
      } else if (r.sourceValue === 'true' || r.sourceValue === 'false') {
        obj[key] = r.sourceValue === 'true';
      } else {
        obj[key] = r.sourceValue;
      }
    }
  });
  return JSON.stringify(obj, null, 2);
};

export const VisualFieldMappingTable: React.FC<VisualFieldMappingTableProps> = ({
  mappings,
  onChangeMappings,
  availableVariables,
  defaultSchemaCode,
  onPayloadCompiled
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Initialize from default schema if mappings are empty
  useEffect(() => {
    if ((!mappings || mappings.length === 0) && defaultSchemaCode && DEFAULT_SCHEMAS[defaultSchemaCode]) {
      const initial = DEFAULT_SCHEMAS[defaultSchemaCode];
      onChangeMappings(initial);
      if (onPayloadCompiled) {
        onPayloadCompiled(compileMappingsToJson(initial));
      }
    }
  }, [defaultSchemaCode]);

  const activeMappings: FieldMappingRow[] = mappings && mappings.length > 0
    ? mappings
    : (defaultSchemaCode && DEFAULT_SCHEMAS[defaultSchemaCode]
        ? DEFAULT_SCHEMAS[defaultSchemaCode]
        : []);

  const updateRow = (index: number, partial: Partial<FieldMappingRow>) => {
    const updated = activeMappings.map((row, i) => i === index ? { ...row, ...partial } : row);
    onChangeMappings(updated);
    if (onPayloadCompiled) {
      onPayloadCompiled(compileMappingsToJson(updated));
    }
  };

  const addRow = () => {
    const newRow: FieldMappingRow = {
      targetField: `field_${activeMappings.length + 1}`,
      sourceType: availableVariables.length > 0 ? 'CONTEXT_VAR' : 'CONSTANT',
      sourceValue: availableVariables[0]?.name || ''
    };
    const updated = [...activeMappings, newRow];
    onChangeMappings(updated);
    if (onPayloadCompiled) {
      onPayloadCompiled(compileMappingsToJson(updated));
    }
  };

  const removeRow = (index: number) => {
    const updated = activeMappings.filter((_, i) => i !== index);
    onChangeMappings(updated);
    if (onPayloadCompiled) {
      onPayloadCompiled(compileMappingsToJson(updated));
    }
  };

  const handleResetToDefault = () => {
    if (defaultSchemaCode && DEFAULT_SCHEMAS[defaultSchemaCode]) {
      const template = DEFAULT_SCHEMAS[defaultSchemaCode];
      const reset = template.map(r => {
        if (r.sourceType === 'CONTEXT_VAR') {
          const matched = availableVariables.find(v => v.name.toLowerCase() === r.targetField.toLowerCase() || v.name === r.sourceValue);
          return {
            ...r,
            sourceValue: matched ? matched.name : ''
          };
        }
        return { ...r };
      });
      onChangeMappings(reset);
      if (onPayloadCompiled) {
        onPayloadCompiled(compileMappingsToJson(reset));
      }
    }
  };

  const compiledJson = compileMappingsToJson(activeMappings);

  return (
    <div style={{
      backgroundColor: '#090d16',
      border: '1px solid #1e293b',
      borderRadius: '8px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Disconnected Node Banner */}
      {availableVariables.length === 0 && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fca5a5',
          fontSize: '11px',
          fontWeight: 600
        }}>
          <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span>
            <strong>Node Not Connected:</strong> Draw a connection wire on the canvas to this node to map upstream properties. Disconnected nodes cannot select properties.
          </span>
        </div>
      )}
      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} style={{ color: '#38bdf8' }} />
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#38bdf8',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            Visual Field Mapping Table
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {defaultSchemaCode && DEFAULT_SCHEMAS[defaultSchemaCode] && (
            <button
              type="button"
              onClick={handleResetToDefault}
              style={{
                fontSize: '10px',
                padding: '3px 6px',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset Schema
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              padding: '3px 8px',
              backgroundColor: showPreview ? '#0284c7' : '#1e293b',
              color: showPreview ? '#ffffff' : '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {showPreview ? <Code2 size={12} /> : <Eye size={12} />}
            {showPreview ? 'Hide JSON' : 'Preview JSON'}
          </button>
        </div>
      </div>

      {/* Mapping Rows Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 20px 1.4fr 24px',
        gap: '6px',
        alignItems: 'center',
        fontSize: '10px',
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        padding: '0 2px'
      }}>
        <span>Target API Field</span>
        <span></span>
        <span>Source Node Output</span>
        <span></span>
      </div>

      {/* Mapping Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {activeMappings.length === 0 ? (
          <div style={{
            padding: '14px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748b',
            border: '1px dashed #1e293b',
            borderRadius: '6px',
            backgroundColor: '#0a101f'
          }}>
            No payload fields configured. Click "+ Add Field" above to map a property.
          </div>
        ) : (
          activeMappings.map((row, idx) => (
          <div key={idx} style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 20px 1.4fr 24px',
            gap: '6px',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            padding: '6px 8px'
          }}>
            {/* Target Field Input */}
            <input
              type="text"
              value={row.targetField}
              onChange={(e) => updateRow(idx, { targetField: e.target.value })}
              placeholder="apiField"
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#020617',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                boxSizing: 'border-box'
              }}
            />

            {/* Mapping Arrow Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <ArrowRight size={13} />
            </div>

            {/* Source Value Selector */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {row.sourceType === 'CONTEXT_VAR' ? (
                availableVariables.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    color: '#94a3b8',
                    fontSize: '11px',
                    fontStyle: 'italic',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ color: '#f87171' }}>●</span> Connect node to map property
                  </div>
                ) : (
                  <select
                    value={availableVariables.some(v => v.name === row.sourceValue) ? row.sourceValue : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CONSTANT__') {
                        updateRow(idx, { sourceType: 'CONSTANT', sourceValue: '' });
                      } else {
                        updateRow(idx, { sourceValue: val });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: '#020617',
                      border: '1px solid #0284c7',
                      borderRadius: '4px',
                      color: '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Select Upstream Property...</option>
                    <optgroup label="⚡ Upstream Connected Outputs">
                      {availableVariables.map(v => (
                        <option key={v.name} value={v.name}>
                          {v.name} {v.type ? `(${v.type})` : ''} {v.sourceNodeLabel ? `[${v.sourceNodeLabel}]` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Custom Static Value">
                      <option value="__CONSTANT__">✏️ Enter Fixed Constant Value...</option>
                    </optgroup>
                  </select>
                )
              ) : (
                <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                  <input
                    type="text"
                    value={row.sourceValue}
                    onChange={(e) => updateRow(idx, { sourceValue: e.target.value })}
                    placeholder="Constant value"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      backgroundColor: '#020617',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: '#f8fafc',
                      fontSize: '11px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {availableVariables.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateRow(idx, { sourceType: 'CONTEXT_VAR', sourceValue: availableVariables[0]?.name || '' })}
                      title="Switch to Context Variable"
                      style={{
                        padding: '4px 6px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        color: '#94a3b8',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Variable
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Remove Row */}
            <button
              type="button"
              onClick={() => removeRow(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )))}
      </div>

      {/* Add Field Button */}
      <button
        type="button"
        onClick={addRow}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          backgroundColor: '#1e293b',
          border: '1px dashed #475569',
          borderRadius: '6px',
          color: '#38bdf8',
          fontSize: '11.5px',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '40px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0f172a';
          e.currentTarget.style.borderColor = '#38bdf8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#1e293b';
          e.currentTarget.style.borderColor = '#475569';
        }}
      >
        <Plus size={14} /> Add Target API Field Mapping
      </button>

      {/* JSON Payload Preview Panel */}
      {showPreview && (
        <div style={{
          backgroundColor: '#020617',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            color: '#64748b',
            marginBottom: '4px'
          }}>
            <span>Auto-Compiled Payload:</span>
            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Check size={11} /> Ready for Dispatch
            </span>
          </div>
          <pre style={{
            margin: 0,
            fontSize: '10.5px',
            fontFamily: 'monospace',
            color: '#38bdf8',
            maxHeight: '130px',
            overflowY: 'auto'
          }}>
            {compiledJson}
          </pre>
        </div>
      )}
    </div>
  );
};
