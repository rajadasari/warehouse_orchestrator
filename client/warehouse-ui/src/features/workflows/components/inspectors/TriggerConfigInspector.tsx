import React from 'react';
import { PlayCircle, Settings2, Zap, Database, Info, FileJson } from 'lucide-react';
import { WorkflowNode } from '../../../../services/workflowService';
import { ManualSchemaBuilder, ManualSchemaField } from './ManualSchemaBuilder';

export type TriggerPayloadMode = 'SIMPLE_START' | 'CONFIGURED_INPUTS' | 'UPSTREAM_PAYLOAD';

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
  const currentMode: TriggerPayloadMode = (config.triggerPayloadMode as TriggerPayloadMode) || 'CONFIGURED_INPUTS';

  const manualFields: ManualSchemaField[] = Array.isArray(config.manualFields)
    ? (config.manualFields as ManualSchemaField[])
    : [
        { name: 'palletLpn', type: 'string', value: String(config.palletLpn || 'PLT-MANUAL-001'), description: 'Pallet LPN' },
        { name: 'sku', type: 'string', value: String(config.sku || 'SKU-AMBIENT-01'), description: 'SKU Item Master' },
        { name: 'quantity', type: 'number', value: Number(config.quantity ?? 24), description: 'Unit Quantity' }
      ];

  const handleModeChange = (mode: TriggerPayloadMode) => {
    onUpdateConfigField('triggerPayloadMode', mode);
    if (mode === 'SIMPLE_START') {
      onUpdateConfigField('initialPayload', {});
    } else if (mode === 'CONFIGURED_INPUTS') {
      const payloadMap: Record<string, unknown> = {};
      manualFields.forEach(f => {
        payloadMap[f.name] = f.value;
      });
      onUpdateConfigField('initialPayload', payloadMap);
    } else if (mode === 'UPSTREAM_PAYLOAD') {
      if (!config.upstreamVariableName) {
        onUpdateConfigField('upstreamVariableName', 'serviceOutcome');
      }
    }
  };

  const handleFieldsChange = (newFields: ManualSchemaField[]) => {
    onUpdateConfigField('manualFields', newFields);
    // Keep top-level keys for backward-compatibility
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

  const handleUpstreamMockChange = (jsonStr: string) => {
    onUpdateConfigField('upstreamMockJson', jsonStr);
    try {
      const parsed = JSON.parse(jsonStr);
      onUpdateConfigField('upstreamMockPayload', parsed);
      const varName = String(config.upstreamVariableName || 'serviceOutcome');
      onUpdateConfigField('initialPayload', { [varName]: parsed });
    } catch (_) {
      // Keep string until valid
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Trigger Mode Selector */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Trigger Start Mode
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleModeChange('SIMPLE_START')}
            style={{
              minHeight: '48px',
              padding: '8px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: currentMode === 'SIMPLE_START' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
              border: `1px solid ${currentMode === 'SIMPLE_START' ? '#38bdf8' : '#334155'}`,
              borderRadius: '6px',
              color: currentMode === 'SIMPLE_START' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Zap size={15} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Simple Start</span>
            <span style={{ fontSize: '9px', opacity: 0.8 }}>No inputs</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('CONFIGURED_INPUTS')}
            style={{
              minHeight: '48px',
              padding: '8px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: currentMode === 'CONFIGURED_INPUTS' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
              border: `1px solid ${currentMode === 'CONFIGURED_INPUTS' ? '#10b981' : '#334155'}`,
              borderRadius: '6px',
              color: currentMode === 'CONFIGURED_INPUTS' ? '#10b981' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings2 size={15} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>User Defined</span>
            <span style={{ fontSize: '9px', opacity: 0.8 }}>N properties</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('UPSTREAM_PAYLOAD')}
            style={{
              minHeight: '48px',
              padding: '8px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: currentMode === 'UPSTREAM_PAYLOAD' ? 'rgba(168, 85, 247, 0.15)' : '#0f172a',
              border: `1px solid ${currentMode === 'UPSTREAM_PAYLOAD' ? '#a855f7' : '#334155'}`,
              borderRadius: '6px',
              color: currentMode === 'UPSTREAM_PAYLOAD' ? '#c084fc' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Database size={15} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Upstream Result</span>
            <span style={{ fontSize: '9px', opacity: 0.8 }}>Service payload</span>
          </button>
        </div>
      </div>

      {/* Mode 1: SIMPLE START */}
      {currentMode === 'SIMPLE_START' && (
        <div style={{
          padding: '12px',
          backgroundColor: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <Info size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Zero-Parameter Start Event</span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
            Executes as a bare trigger event without requiring any input properties or schema. 
            Downstream nodes (e.g. Method Execute) will execute using static configurations or self-contained logic.
          </p>
        </div>
      )}

      {/* Event Configuration */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
          Trigger Event Name
        </label>
        <input
          type="text"
          value={String(config.triggerEvent || (currentMode === 'SIMPLE_START' ? 'WORKFLOW_STARTED' : 'INBOUND_PALLET_SCANNED'))}
          onChange={(e) => onUpdateConfigField('triggerEvent', e.target.value)}
          placeholder="e.g. WORKFLOW_STARTED"
          style={{
            width: '100%',
            height: '48px',
            padding: '0 12px',
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
            height: '48px',
            padding: '0 12px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#f8fafc',
            fontSize: '12px',
            boxSizing: 'border-box'
          }}
        >
          <option value="MANUAL_CLICK">Manual Trigger & Click</option>
          <option value="HMI_OPERATOR_FORM">HMI Operator Touchscreen Form</option>
          <option value="PERIODIC_SCHEDULER">Periodic Background Scheduler</option>
          <option value="EXTERNAL_SERVICE_NODE">Upstream Service / Node Outcome</option>
          <option value="EXTERNAL_WEBHOOK">Inbound REST Webhook</option>
          <option value="MQTT_BROKER">MQTT Broker Event</option>
        </select>
      </div>

      {/* Mode 2: USER DEFINED INPUTS */}
      {currentMode === 'CONFIGURED_INPUTS' && (
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
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}>
              <Settings2 size={13} />
              Configured Properties & Values
            </label>
          </div>

          <ManualSchemaBuilder
            fields={manualFields}
            onChangeFields={handleFieldsChange}
            rawJsonOverride={typeof config.rawJsonPayload === 'string' ? config.rawJsonPayload : undefined}
            onChangeRawJson={handleRawJsonChange}
          />
        </div>
      )}

      {/* Mode 3: UPSTREAM SERVICE OUTCOME */}
      {currentMode === 'UPSTREAM_PAYLOAD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#c084fc', display: 'block', marginBottom: '4px' }}>
              Service Outcome Context Variable Name
            </label>
            <input
              type="text"
              value={String(config.upstreamVariableName || 'serviceOutcome')}
              onChange={(e) => onUpdateConfigField('upstreamVariableName', e.target.value.trim())}
              placeholder="e.g. serviceOutcome or webhookPayload"
              style={{
                width: '100%',
                height: '48px',
                padding: '0 12px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Downstream nodes access this outcome via: <code style={{ color: '#c084fc', backgroundColor: '#090d16', padding: '1px 5px', borderRadius: '3px' }}>{`#{context.${config.upstreamVariableName || 'serviceOutcome'}}`}</code>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <FileJson size={13} />
              Simulated Upstream Payload (for Composer testing)
            </label>
            <textarea
              rows={4}
              value={typeof config.upstreamMockJson === 'string' ? config.upstreamMockJson : JSON.stringify(config.upstreamMockPayload || { count: 1, status: 'READY' }, null, 2)}
              onChange={(e) => handleUpstreamMockChange(e.target.value)}
              placeholder="{\n  &quot;count&quot;: 1\n}"
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: '#090d16',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontSize: '11px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {/* Execution Note */}
      <div>
        <label style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
          Execution Note / Operator Remark
        </label>
        <input
          type="text"
          value={String(config.notes || '')}
          onChange={(e) => onUpdateConfigField('notes', e.target.value)}
          placeholder="e.g. Workflow manual start trigger"
          style={{
            width: '100%',
            height: '48px',
            padding: '0 10px',
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
            minHeight: '48px',
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

