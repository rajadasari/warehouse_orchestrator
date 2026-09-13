import React from 'react';
import { PlayCircle, Settings2 } from 'lucide-react';
import { WorkflowNode } from '../../../../services/workflowService';
import { ManualSchemaBuilder, ManualSchemaField } from './ManualSchemaBuilder';

interface TriggerConfigInspectorProps {
  selectedNode: WorkflowNode;
  onUpdateConfigField: (field: string, value: unknown) => void;
  onTriggerNode?: (node: WorkflowNode) => void;
  isTriggering?: boolean;
}

export const TriggerConfigInspector: React.FC<TriggerConfigInspectorProps> = ({
  selectedNode,
  onUpdateConfigField,
  onTriggerNode,
  isTriggering
}) => {
  const config = selectedNode.config || {};
  const manualFields: ManualSchemaField[] = Array.isArray(config.manualFields)
    ? (config.manualFields as ManualSchemaField[])
    : [
        { name: 'palletLpn', type: 'string', value: String(config.palletLpn || 'PLT-MANUAL-001'), description: 'Pallet LPN' },
        { name: 'sku', type: 'string', value: String(config.sku || 'SKU-AMBIENT-01'), description: 'SKU Item Master' },
        { name: 'quantity', type: 'number', value: Number(config.quantity ?? 24), description: 'Unit Quantity' }
      ];

  const handleFieldsChange = (newFields: ManualSchemaField[]) => {
    onUpdateConfigField('manualFields', newFields);
    // Also keep convenient top-level keys for backward-compatibility
    const palletField = newFields.find(f => f.name.toLowerCase().includes('pallet') || f.name.toLowerCase().includes('lpn'));
    if (palletField) {
      onUpdateConfigField('palletLpn', palletField.value);
    }
    const skuField = newFields.find(f => f.name.toLowerCase() === 'sku' || f.name.toLowerCase().includes('sku'));
    if (skuField) {
      onUpdateConfigField('sku', skuField.value);
    }
    const qtyField = newFields.find(f => f.name.toLowerCase().includes('qty') || f.name.toLowerCase() === 'quantity');
    if (qtyField) {
      onUpdateConfigField('quantity', Number(qtyField.value) || 1);
    }

    // Produce consolidated JSON payload map
    const payloadMap: Record<string, unknown> = {};
    newFields.forEach(f => {
      payloadMap[f.name] = f.value;
    });
    onUpdateConfigField('initialPayload', payloadMap);
  };

  const handleRawJsonChange = (jsonStr: string) => {
    onUpdateConfigField('rawJsonPayload', jsonStr);
    try {
      const parsed = JSON.parse(jsonStr);
      onUpdateConfigField('initialPayload', parsed);
    } catch (_) {
      // Keep string until valid
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Event Configuration */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
          Trigger Event Name
        </label>
        <input
          type="text"
          value={String(config.triggerEvent || 'INBOUND_PALLET_SCANNED')}
          onChange={(e) => onUpdateConfigField('triggerEvent', e.target.value)}
          placeholder="e.g. INBOUND_PALLET_SCANNED"
          style={{
            width: '100%',
            padding: '7px 10px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#f8fafc',
            fontSize: '12px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Channel Source */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
          Channel / Source Type
        </label>
        <select
          value={String(config.sourceChannel || 'MANUAL_CLICK')}
          onChange={(e) => onUpdateConfigField('sourceChannel', e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#f8fafc',
            fontSize: '12px',
            boxSizing: 'border-box'
          }}
        >
          <option value="MANUAL_CLICK">Manual Trigger & Schema Simulation</option>
          <option value="HMI_OPERATOR_FORM">HMI Operator Touchscreen Form</option>
          <option value="PLC_SCANNER">PLC Barcode Scanner</option>
          <option value="EXTERNAL_WEBHOOK">Inbound REST Webhook</option>
          <option value="MQTT_BROKER">MQTT Broker Event</option>
        </select>
      </div>

      {/* Manual Input Schema Builder */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <label style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }}>
            <Settings2 size={13} />
            Input Schema & Payload Data
          </label>
        </div>

        <ManualSchemaBuilder
          fields={manualFields}
          onChangeFields={handleFieldsChange}
          rawJsonOverride={typeof config.rawJsonPayload === 'string' ? config.rawJsonPayload : undefined}
          onChangeRawJson={handleRawJsonChange}
        />
      </div>

      {/* Execution Note */}
      <div>
        <label style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
          Execution Note / Operator Remark
        </label>
        <input
          type="text"
          value={String(config.notes || '')}
          onChange={(e) => onUpdateConfigField('notes', e.target.value)}
          placeholder="e.g. Inbound shipment verified by operator"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '5px',
            color: '#f8fafc',
            fontSize: '11.5px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Trigger Execution Button */}
      {onTriggerNode && (
        <button
          type="button"
          onClick={() => onTriggerNode(selectedNode)}
          disabled={isTriggering}
          style={{
            marginTop: '6px',
            padding: '10px 14px',
            backgroundColor: isTriggering ? '#0e7490' : '#0284c7',
            border: '1px solid #38bdf8',
            borderRadius: '6px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isTriggering ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 12px rgba(6, 182, 212, 0.4)',
            minHeight: '48px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isTriggering) e.currentTarget.style.backgroundColor = '#0369a1';
          }}
          onMouseLeave={(e) => {
            if (!isTriggering) e.currentTarget.style.backgroundColor = '#0284c7';
          }}
        >
          <PlayCircle size={16} />
          {isTriggering ? 'Executing Trigger...' : 'Execute Trigger Node Now'}
        </button>
      )}
    </div>
  );
};
