import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Code, 
  Check, 
  Sliders, 
  Info
} from 'lucide-react';
import { WorkflowNode } from '../../../services/workflowService';
import { NODE_TYPE_METADATA } from '../types';
import { dynamicMappingService, ApiIntegrationMappingItem } from '../../../services/dynamicMappingService';
import { TriggerConfigInspector } from './inspectors/TriggerConfigInspector';
import { ApiMapperConfigInspector } from './inspectors/ApiMapperConfigInspector';
import { ResourceActionConfigInspector } from './inspectors/ResourceActionConfigInspector';
import { ContextVariableItem } from './inspectors/ContextVariableChips';

interface NodeInspectorPanelProps {
  selectedNode: WorkflowNode | null;
  onUpdateNode: (updated: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  onTriggerNode?: (node: WorkflowNode) => void;
  isTriggering?: boolean;
  availableVariables?: ContextVariableItem[];
}

export const NodeInspectorPanel: React.FC<NodeInspectorPanelProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose,
  onTriggerNode,
  isTriggering,
  availableVariables = []
}) => {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'RAW_JSON'>('PROPERTIES');
  const [availableMappings, setAvailableMappings] = useState<ApiIntegrationMappingItem[]>([]);
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNode) {
      setRawJsonText(JSON.stringify(selectedNode.config, null, 2));
      setJsonError(null);
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    // Preload dynamic mappings if editing an API_MAPPER node
    if (selectedNode?.type === 'API_MAPPER') {
      dynamicMappingService.getMappings()
        .then(res => setAvailableMappings(res || []))
        .catch(() => setAvailableMappings([]));
    }
  }, [selectedNode?.type]);

  if (!selectedNode) return null;

  const meta = NODE_TYPE_METADATA[selectedNode.type] || NODE_TYPE_METADATA.TRIGGER;

  const handleLabelChange = (newLabel: string) => {
    onUpdateNode({
      ...selectedNode,
      label: newLabel
    });
  };

  const handleConfigFieldChange = (field: string, value: unknown) => {
    const newConfig = {
      ...selectedNode.config,
      [field]: value
    };
    onUpdateNode({
      ...selectedNode,
      config: newConfig
    });
    setRawJsonText(JSON.stringify(newConfig, null, 2));
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      onUpdateNode({
        ...selectedNode,
        config: parsed
      });
      setJsonError(null);
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON format');
    }
  };

  return (
    <div style={{
      width: '320px',
      minWidth: '320px',
      height: '100%',
      backgroundColor: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 14px 12px 14px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: meta.color,
            boxShadow: `0 0 8px ${meta.glow}`
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: meta.color,
            letterSpacing: '0.04em'
          }}>
            {meta.tag}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>#{selectedNode.id}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1e293b',
        backgroundColor: '#0b1120'
      }}>
        <button
          onClick={() => setActiveTab('PROPERTIES')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: activeTab === 'PROPERTIES' ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'PROPERTIES' ? `2px solid ${meta.color}` : '2px solid transparent',
            color: activeTab === 'PROPERTIES' ? '#f8fafc' : '#64748b',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Sliders size={13} /> Properties
        </button>
        <button
          onClick={() => setActiveTab('RAW_JSON')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: activeTab === 'RAW_JSON' ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'RAW_JSON' ? `2px solid ${meta.color}` : '2px solid transparent',
            color: activeTab === 'RAW_JSON' ? '#f8fafc' : '#64748b',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Code size={13} /> Raw JSON
        </button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {activeTab === 'PROPERTIES' ? (
          <>
            {/* Node Label */}
            <div>
              <label style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                display: 'block',
                marginBottom: '6px'
              }}>
                Display Label
              </label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Type-Specific Properties */}
            {selectedNode.type === 'TRIGGER' && (
              <TriggerConfigInspector
                selectedNode={selectedNode}
                onUpdateConfigField={handleConfigFieldChange}
                onTriggerNode={onTriggerNode}
                isTriggering={isTriggering}
              />
            )}

            {selectedNode.type === 'VALIDATION' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Validation Rule Type
                  </label>
                  <select
                    value={String(selectedNode.config.validationType || 'PALLET_MASTER_DATA')}
                    onChange={(e) => handleConfigFieldChange('validationType', e.target.value)}
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
                    <option value="PALLET_MASTER_DATA">Pallet Master Data Integrity</option>
                    <option value="SKU_EXISTENCE">Item Master SKU Check</option>
                    <option value="PROFILE_TOLERANCE">Dimension & Weight Tolerance</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="rejectMissing"
                    checked={Boolean(selectedNode.config.rejectOnMissingSku)}
                    onChange={(e) => handleConfigFieldChange('rejectOnMissingSku', e.target.checked)}
                  />
                  <label htmlFor="rejectMissing" style={{ fontSize: '11.5px', color: '#cbd5e1', cursor: 'pointer' }}>
                    Fail workflow on unknown SKU
                  </label>
                </div>
              </div>
            )}

            {selectedNode.type === 'MATH_OPERATION' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Math Operation
                  </label>
                  <select
                    value={String(selectedNode.config.operation || 'ADD')}
                    onChange={(e) => handleConfigFieldChange('operation', e.target.value)}
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
                    <option value="ADD">Add: Operand A + Operand B</option>
                    <option value="SUBTRACT">Subtract: Operand A - Operand B</option>
                    <option value="MULTIPLY">Multiply: Operand A * Operand B</option>
                    <option value="DIVIDE">Divide: Operand A / Operand B</option>
                    <option value="PERCENTAGE">Percentage: (A / B) * 100</option>
                    <option value="ROUND">Round: Round(Operand A)</option>
                    <option value="CEIL">Ceiling: Ceil(Operand A)</option>
                    <option value="FLOOR">Floor: Floor(Operand A)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Operand A (Variable Name or Number)
                  </label>
                  <input
                    type="text"
                    value={String(selectedNode.config.operandA ?? 'quantity')}
                    onChange={(e) => handleConfigFieldChange('operandA', e.target.value)}
                    placeholder="e.g. quantity or context.tareWeight or 25.5"
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

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Operand B (Variable Name or Number)
                  </label>
                  <input
                    type="text"
                    value={String(selectedNode.config.operandB ?? '1')}
                    onChange={(e) => handleConfigFieldChange('operandB', e.target.value)}
                    placeholder="e.g. 1 or context.netWeight"
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

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Output Variable Name (Stored in Context)
                  </label>
                  <input
                    type="text"
                    value={String(selectedNode.config.outputVariable || 'calculatedTotal')}
                    onChange={(e) => handleConfigFieldChange('outputVariable', e.target.value)}
                    placeholder="e.g. calculatedTotal or grossWeightKg"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#34d399',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontSize: '11px',
                  color: '#a5b4fc',
                  lineHeight: 1.4
                }}>
                  Result is injected into context under <code>{String(selectedNode.config.outputVariable || 'calculatedTotal')}</code> and usable in subsequent API Mappers or Validations.
                </div>
              </div>
            )}

            {selectedNode.type === 'STATE_MUTATION' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Target Inventory Status
                  </label>
                  <select
                    value={String(selectedNode.config.status || 'IN_TRANSIT')}
                    onChange={(e) => handleConfigFieldChange('status', e.target.value)}
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
                    <option value="IN_TRANSIT">IN_TRANSIT (In Progress)</option>
                    <option value="AVAILABLE">AVAILABLE (Putaway Complete)</option>
                    <option value="STORED">STORED (In Rack Location)</option>
                    <option value="QUARANTINED">QUARANTINED (Hold / Inspect)</option>
                    <option value="ALLOCATED">ALLOCATED (Picked for Outbound)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Target Node / Location
                  </label>
                  <input
                    type="text"
                    value={String(selectedNode.config.location || '')}
                    onChange={(e) => handleConfigFieldChange('location', e.target.value)}
                    placeholder="e.g. AIR-LOCK-01 or {{context.location}}"
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
              </div>
            )}

            {selectedNode.type === 'API_MAPPER' && (
              <ApiMapperConfigInspector
                selectedNode={selectedNode}
                onUpdateConfigField={handleConfigFieldChange}
                availableMappings={availableMappings}
                availableVariables={availableVariables}
              />
            )}

            {selectedNode.type === 'RESOURCE_ACTION' && (
              <ResourceActionConfigInspector
                node={selectedNode}
                onUpdateConfig={(newConfig) => {
                  onUpdateNode({
                    ...selectedNode,
                    config: newConfig
                  });
                  setRawJsonText(JSON.stringify(newConfig, null, 2));
                }}
                availableVariables={availableVariables}
              />
            )}

            {selectedNode.type === 'ASYNC_GATE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Awaited Event Name
                  </label>
                  <input
                    type="text"
                    value={String(selectedNode.config.waitEvent || 'WMS_PALLET_CONFIRMATION')}
                    onChange={(e) => handleConfigFieldChange('waitEvent', e.target.value)}
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
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Timeout (Seconds)
                  </label>
                  <input
                    type="number"
                    value={Number(selectedNode.config.timeoutSeconds || 300)}
                    onChange={(e) => handleConfigFieldChange('timeoutSeconds', Number(e.target.value))}
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
                <div style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '11px',
                  color: '#fbbf24',
                  lineHeight: 1.4
                }}>
                  <Info size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Generates a unique correlation key on entry. The workflow pauses in <code>WAITING_CALLBACK</code> status until POSTed to <code>/api/v1/wes/workflows/callbacks/{'{key}'}</code>.
                </div>
              </div>
            )}

            {selectedNode.type === 'TERMINATOR' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Completion Status
                </label>
                <select
                  value={String(selectedNode.config.completionStatus || 'COMPLETED')}
                  onChange={(e) => handleConfigFieldChange('completionStatus', e.target.value)}
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
                  <option value="COMPLETED">COMPLETED (Success)</option>
                  <option value="DIVERTED">DIVERTED (Rerouted)</option>
                  <option value="ABORTED">ABORTED (Halt)</option>
                </select>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
            <textarea
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              rows={16}
              style={{
                width: '100%',
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '11.5px',
                backgroundColor: '#030712',
                color: '#38bdf8',
                border: jsonError ? '1px solid #ef4444' : '1px solid #334155',
                borderRadius: '6px',
                padding: '10px',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
            {jsonError && (
              <div style={{ fontSize: '11px', color: '#ef4444' }}>
                {jsonError}
              </div>
            )}
            <button
              onClick={handleApplyJson}
              style={{
                padding: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Check size={14} /> Apply JSON
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid #1e293b',
        backgroundColor: '#0b1120',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '48px'
          }}
        >
          <Trash2 size={15} /> Delete Node
        </button>

        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '48px'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
