import React, { useState } from 'react';
import { Plus, Trash2, Code2, ListTree, Sparkles } from 'lucide-react';

export interface ManualSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
  description?: string;
}

interface ManualSchemaBuilderProps {
  fields: ManualSchemaField[];
  onChangeFields: (newFields: ManualSchemaField[]) => void;
  rawJsonOverride?: string;
  onChangeRawJson?: (json: string) => void;
}

const PRESETS: Record<string, { label: string; fields: ManualSchemaField[] }> = {
  INBOUND_PALLET: {
    label: 'Inbound Pallet & ASN Receipt',
    fields: [
      { name: 'palletLpn', type: 'string', value: 'PLT-INB-1001', description: 'License Plate Number' },
      { name: 'sku', type: 'string', value: 'SKU-AMBIENT-01', description: 'Item Master Code' },
      { name: 'quantity', type: 'number', value: 24, description: 'Package units' },
      { name: 'carrier', type: 'string', value: 'DHL_FREIGHT', description: 'Logistics transport provider' },
      { name: 'dockDoor', type: 'string', value: 'DOCK-BAY-03', description: 'Receiving dock' },
      { name: 'temperatureZone', type: 'string', value: 'AMBIENT', description: 'Zone requirement' }
    ]
  },
  OUTBOUND_PICK: {
    label: 'Outbound Order & Pick Request',
    fields: [
      { name: 'orderId', type: 'string', value: 'ORD-OUT-8004', description: 'ERP order identifier' },
      { name: 'sku', type: 'string', value: 'SKU-COLD-05', description: 'Picked Item SKU' },
      { name: 'quantity', type: 'number', value: 12, description: 'Required items' },
      { name: 'stagingLane', type: 'string', value: 'LANE-OUT-02', description: 'Staging destination' },
      { name: 'priority', type: 'string', value: 'HIGH', description: 'Order priority' }
    ]
  },
  QUALITY_HOLD: {
    label: 'Quality Inspection Hold',
    fields: [
      { name: 'palletLpn', type: 'string', value: 'PLT-HOLD-992', description: 'Quarantined LPN' },
      { name: 'sku', type: 'string', value: 'SKU-PERISHABLE-02', description: 'Perishable item' },
      { name: 'defectReason', type: 'string', value: 'DAMAGED_BARCODE', description: 'Inspection note' },
      { name: 'quarantineStatus', type: 'string', value: 'HOLD', description: 'Inventory state' },
      { name: 'inspectorId', type: 'string', value: 'QC-OPERATOR-1', description: 'Inspector ID' }
    ]
  }
};

export const ManualSchemaBuilder: React.FC<ManualSchemaBuilderProps> = ({
  fields,
  onChangeFields,
  rawJsonOverride,
  onChangeRawJson
}) => {
  const [editorMode, setEditorMode] = useState<'VISUAL' | 'RAW_JSON'>('VISUAL');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const activeFields: ManualSchemaField[] = fields && fields.length > 0 ? fields : [
    { name: 'palletLpn', type: 'string', value: 'PLT-MANUAL-001', description: 'Pallet LPN identifier' },
    { name: 'sku', type: 'string', value: 'SKU-AMBIENT-01', description: 'SKU code' },
    { name: 'quantity', type: 'number', value: 24, description: 'Pallet quantity' }
  ];

  const handleAddField = () => {
    const newField: ManualSchemaField = {
      name: `field_${activeFields.length + 1}`,
      type: 'string',
      value: '',
      description: ''
    };
    onChangeFields([...activeFields, newField]);
  };

  const handleUpdateField = (index: number, partial: Partial<ManualSchemaField>) => {
    const updated = activeFields.map((f, i) => {
      if (i !== index) return f;
      const merged = { ...f, ...partial };
      // Cast value properly if type changed
      if (partial.type && partial.type !== f.type) {
        if (partial.type === 'number') {
          merged.value = Number(merged.value) || 0;
        } else if (partial.type === 'boolean') {
          merged.value = Boolean(merged.value);
        } else {
          merged.value = String(merged.value ?? '');
        }
      }
      return merged;
    });
    onChangeFields(updated);
  };

  const handleRemoveField = (index: number) => {
    const filtered = activeFields.filter((_, i) => i !== index);
    onChangeFields(filtered);
  };

  const handleApplyPreset = (presetKey: string) => {
    if (!PRESETS[presetKey]) return;
    onChangeFields(PRESETS[presetKey].fields);
    if (onChangeRawJson) {
      const payloadMap: Record<string, unknown> = {};
      PRESETS[presetKey].fields.forEach(f => {
        payloadMap[f.name] = f.value;
      });
      onChangeRawJson(JSON.stringify(payloadMap, null, 2));
    }
  };

  const currentPayloadObject: Record<string, unknown> = {};
  activeFields.forEach(f => {
    currentPayloadObject[f.name] = f.value;
  });

  const jsonText = rawJsonOverride || JSON.stringify(currentPayloadObject, null, 2);

  const handleRawJsonChange = (newText: string) => {
    if (onChangeRawJson) {
      onChangeRawJson(newText);
    }
    try {
      const parsed = JSON.parse(newText);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const synchedFields: ManualSchemaField[] = Object.entries(parsed).map(([k, v]) => {
          let fieldType: 'string' | 'number' | 'boolean' = 'string';
          if (typeof v === 'number') fieldType = 'number';
          else if (typeof v === 'boolean') fieldType = 'boolean';
          return {
            name: k,
            type: fieldType,
            value: v as string | number | boolean
          };
        });
        onChangeFields(synchedFields);
        setJsonError(null);
      }
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON format');
    }
  };

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
      {/* Top Controls: Preset selector & Mode switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleApplyPreset(e.target.value);
            }}
            style={{
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="" disabled>Load Preset Schema...</option>
            {Object.entries(PRESETS).map(([k, p]) => (
              <option key={k} value={k}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '5px', padding: '2px' }}>
          <button
            type="button"
            onClick={() => setEditorMode('VISUAL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: editorMode === 'VISUAL' ? '#0284c7' : 'transparent',
              color: editorMode === 'VISUAL' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '3px',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ListTree size={12} /> Visual
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('RAW_JSON')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: editorMode === 'RAW_JSON' ? '#0284c7' : 'transparent',
              color: editorMode === 'RAW_JSON' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '3px',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Code2 size={12} /> JSON
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {editorMode === 'VISUAL' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 80px 1.2fr 24px',
            gap: '6px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase'
          }}>
            <span>Field Name</span>
            <span>Type</span>
            <span>Default Value</span>
            <span></span>
          </div>

          {activeFields.map((f, idx) => (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 80px 1.2fr 24px',
              gap: '6px',
              alignItems: 'center'
            }}>
              {/* Field Name */}
              <input
                type="text"
                value={f.name}
                onChange={(e) => handleUpdateField(idx, { name: e.target.value })}
                placeholder="fieldName"
                style={{
                  width: '100%',
                  padding: '5px 7px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />

              {/* Field Type */}
              <select
                value={f.type}
                onChange={(e) => handleUpdateField(idx, { type: e.target.value as 'string' | 'number' | 'boolean' })}
                style={{
                  width: '100%',
                  padding: '5px 4px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>

              {/* Field Value */}
              {f.type === 'boolean' ? (
                <select
                  value={String(f.value)}
                  onChange={(e) => handleUpdateField(idx, { value: e.target.value === 'true' })}
                  style={{
                    width: '100%',
                    padding: '5px 4px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '11px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={String(f.value ?? '')}
                  onChange={(e) => handleUpdateField(idx, {
                    value: f.type === 'number' ? (Number(e.target.value) || 0) : e.target.value
                  })}
                  placeholder="value"
                  style={{
                    width: '100%',
                    padding: '5px 7px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '11px',
                    boxSizing: 'border-box'
                  }}
                />
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveField(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddField}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px',
              backgroundColor: '#1e293b',
              border: '1px dashed #475569',
              borderRadius: '5px',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#38bdf8';
              e.currentTarget.style.borderColor = '#38bdf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = '#475569';
            }}
          >
            <Plus size={13} /> Add Input Schema Field
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <textarea
            value={jsonText}
            onChange={(e) => handleRawJsonChange(e.target.value)}
            rows={7}
            style={{
              width: '100%',
              backgroundColor: '#020617',
              border: jsonError ? '1px solid #ef4444' : '1px solid #334155',
              borderRadius: '5px',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '11px',
              padding: '8px',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
          {jsonError && (
            <div style={{ fontSize: '10.5px', color: '#f87171' }}>
              {jsonError}
            </div>
          )}
        </div>
      )}

      {/* Info Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '10.5px',
        color: '#64748b'
      }}>
        <Sparkles size={11} style={{ color: '#06b6d4' }} />
        <span>Defined fields are injected directly into the workflow execution context.</span>
      </div>
    </div>
  );
};
