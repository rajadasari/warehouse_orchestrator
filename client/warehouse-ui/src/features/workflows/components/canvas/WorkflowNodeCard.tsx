import React from 'react';
import { 
  PlayCircle, 
  CheckCircle2, 
  Database, 
  Network, 
  Hourglass, 
  GitBranch, 
  Flag, 
  Calculator, 
  Play, 
  MousePointerClick,
  Settings,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Cpu,
  Boxes
} from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '../../../../services/workflowService';
import { NODE_TYPE_METADATA } from '../../types';

export interface NodePropertyItem {
  name: string;
  type?: string;
  connectedFrom?: string;
}

/**
 * Returns all nodes that are reachably upstream of targetNodeId via graph edges.
 * Strictly returns empty if the node is not connected to any upstream source.
 */
export function getReachableUpstreamNodes(
  targetNodeId: string, 
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const visited = new Set<string>();
  const queue = [targetNodeId];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const incomingEdges = edges.filter(e => e.target === currId);
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return nodes.filter(n => visited.has(n.id));
}

export function getNodeIo(node: WorkflowNode): { inputs: NodePropertyItem[]; outputs: NodePropertyItem[] } {
  const cfg = node.config || {};
  let inputs: NodePropertyItem[] = [];
  let outputs: NodePropertyItem[] = [];

  switch (node.type) {
    case 'TRIGGER': {
      inputs = [];
      const fields: Array<{ name: string; type?: string }> = Array.isArray(cfg.manualFields) && cfg.manualFields.length > 0
        ? cfg.manualFields
        : (Array.isArray(cfg.fields) && cfg.fields.length > 0 ? cfg.fields : []);
      outputs = fields.map(f => ({ name: f.name, type: f.type || 'string' }));
      break;
    }

    case 'API_MAPPER': {
      const method = String(cfg.httpMethod || cfg.method || 'POST').toUpperCase();
      const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(method);

      // Extract dynamic URL path/query template tokens e.g. /api/v1/resource/{{orderId}}
      const urlTokens: string[] = [];
      const endpointUrl = String(cfg.endpointUrl || '');
      const urlMatches = endpointUrl.matchAll(/\{\{([^}]+)\}\}/g);
      for (const m of urlMatches) {
        const clean = m[1].replace(/^(context\.|pallet\.|item\.)/, '').trim();
        if (clean && !urlTokens.includes(clean)) {
          urlTokens.push(clean);
        }
      }

      inputs = [];
      if (isBodyMethod) {
        if (Array.isArray(cfg.fieldMappings) && cfg.fieldMappings.length > 0) {
          inputs = (cfg.fieldMappings as Array<{ targetField: string; sourceValue?: string }>).map(m => ({
            name: m.targetField,
            connectedFrom: m.sourceValue || undefined
          }));
        } else if (typeof cfg.payloadTemplate === 'string' && cfg.payloadTemplate.trim()) {
          const bodyTokens: string[] = [];
          const payloadMatches = cfg.payloadTemplate.matchAll(/\{\{([^}]+)\}\}/g);
          for (const pm of payloadMatches) {
            const clean = pm[1].replace(/^(context\.|pallet\.|item\.)/, '').trim();
            if (clean && !bodyTokens.includes(clean)) {
              bodyTokens.push(clean);
            }
          }
          inputs = bodyTokens.map(t => ({ name: t, connectedFrom: t }));
        }
      }

      // Add URL path/query parameters
      urlTokens.forEach(t => {
        if (!inputs.some(i => i.name === t)) {
          inputs.push({ name: `param:${t}`, connectedFrom: t });
        }
      });

      const outVar = String(cfg.outputVariable || 'apiResponse');
      outputs = [
        { name: outVar, type: 'object' },
        { name: `${outVar}.status`, type: 'number' }
      ];
      break;
    }

    case 'MATH_OPERATION':
      inputs = [
        { name: 'operandA', connectedFrom: cfg.operandA ? String(cfg.operandA) : undefined },
        { name: 'operandB', connectedFrom: cfg.operandB ? String(cfg.operandB) : undefined }
      ];
      outputs = [
        { name: String(cfg.outputVariable || 'calculatedTotal'), type: 'number' }
      ];
      break;

    case 'VALIDATION':
      inputs = [
        { name: 'targetField', connectedFrom: cfg.targetField ? String(cfg.targetField) : undefined },
        { name: 'expectedStatus', connectedFrom: cfg.expectedStatus ? String(cfg.expectedStatus) : undefined }
      ];
      outputs = [
        { name: 'validationOutcome', type: 'string' }
      ];
      break;

    case 'STATE_MUTATION':
      inputs = [
        { name: 'targetStatus', connectedFrom: cfg.status ? String(cfg.status) : undefined }
      ];
      outputs = [
        { name: 'palletStatus', type: 'string' }
      ];
      break;

    case 'ASYNC_GATE':
      inputs = [
        { name: 'waitEvent', connectedFrom: cfg.waitEvent ? String(cfg.waitEvent) : undefined }
      ];
      outputs = [
        { name: 'wmsStatus', type: 'string' },
        { name: 'allocatedAisle', type: 'string' },
        { name: 'allocatedShelf', type: 'string' }
      ];
      break;

    case 'TERMINATOR':
      inputs = [
        { name: 'completionStatus', connectedFrom: cfg.completionStatus ? String(cfg.completionStatus) : undefined }
      ];
      outputs = [
        { name: 'completedAt', type: 'string' }
      ];
      break;

    case 'RESOURCE_ACTION': {
      const params = typeof cfg.parameters === 'object' && cfg.parameters !== null ? cfg.parameters as Record<string, unknown> : {};
      inputs = Object.keys(params).map(k => ({
        name: k,
        connectedFrom: typeof params[k] === 'string' ? String(params[k]) : undefined
      }));
      if (inputs.length === 0) {
        inputs = [{ name: 'params', connectedFrom: cfg.methodName ? `${cfg.resourceCode}.${cfg.methodName}` : undefined }];
      }
      outputs = [
        { name: 'success', type: 'boolean' },
        { name: 'data', type: 'object' }
      ];
      break;
    }

    case 'COMPOSED': {
      const params = typeof cfg.parameters === 'object' && cfg.parameters !== null ? cfg.parameters as Record<string, unknown> : {};
      inputs = Object.keys(params).map(k => ({
        name: k,
        connectedFrom: typeof params[k] === 'string' ? String(params[k]) : undefined
      }));
      if (inputs.length === 0) inputs = [{ name: 'inPayload' }];
      outputs = [{ name: 'outPayload', type: 'object' }];
      break;
    }

    default:
      inputs = [{ name: 'inputPayload' }];
      outputs = [{ name: 'outputPayload' }];
      break;
  }

  return { inputs, outputs };
}

interface WorkflowNodeCardProps {
  node: WorkflowNode;
  isSelected: boolean;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: (nodeId: string) => void;
  onMouseDown: (e: React.MouseEvent, node: WorkflowNode) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenInspector: (node: WorkflowNode) => void;
  onDuplicateNode: (node: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onTriggerNode?: (node: WorkflowNode) => void;
  triggeringNodeId?: string | null;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  hoveredTargetId: string | null;
  upstreamOutputs: Array<{ name: string; sourceNodeLabel: string; type?: string }>;
  onMapProperty: (nodeId: string, targetField: string, sourceValue: string) => void;
  getNodeCoordX: (node: WorkflowNode) => number;
  getNodeCoordY: (node: WorkflowNode) => number;
}

export const NODE_WIDTH = 250;

export const WorkflowNodeCard: React.FC<WorkflowNodeCardProps> = ({
  node,
  isSelected,
  isActive,
  isExpanded,
  onToggleExpand,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onOpenInspector,
  onDuplicateNode,
  onDeleteNode,
  onTriggerNode,
  triggeringNodeId,
  onPortMouseDown,
  hoveredTargetId,
  upstreamOutputs,
  onMapProperty,
  getNodeCoordX,
  getNodeCoordY
}) => {
  const meta = NODE_TYPE_METADATA[node.type] || NODE_TYPE_METADATA.TRIGGER;
  const { inputs, outputs } = getNodeIo(node);

  const isManualClick = (
    node.config?.triggerType === 'MANUAL_CLICK' ||
    node.config?.sourceChannel === 'MANUAL_CLICK' ||
    node.label.toLowerCase().includes('manual')
  );

  const getNodeIcon = () => {
    if (node.type === 'TRIGGER' && isManualClick) return <MousePointerClick size={16} />;
    switch (node.type) {
      case 'TRIGGER': return <PlayCircle size={16} />;
      case 'VALIDATION': return <CheckCircle2 size={16} />;
      case 'STATE_MUTATION': return <Database size={16} />;
      case 'API_MAPPER': return <Network size={16} />;
      case 'ASYNC_GATE': return <Hourglass size={16} />;
      case 'MATH_OPERATION': return <Calculator size={16} />;
      case 'DECISION': return <GitBranch size={16} />;
      case 'TERMINATOR': return <Flag size={16} />;
      case 'RESOURCE_ACTION': return <Cpu size={16} />;
      case 'COMPOSED': return <Boxes size={16} />;
      default: return <PlayCircle size={16} />;
    }
  };

  const actionBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s ease'
  };

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, node)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        left: `${getNodeCoordX(node)}px`,
        top: `${getNodeCoordY(node)}px`,
        width: `${NODE_WIDTH}px`,
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: isSelected 
          ? '2px solid #38bdf8' 
          : isActive 
            ? `2px solid ${meta.color}` 
            : '1px solid #334155',
        boxShadow: isSelected
          ? '0 0 20px rgba(56, 189, 248, 0.4), 0 8px 24px rgba(0,0,0,0.6)'
          : isActive
            ? `0 0 24px ${meta.glow}, 0 8px 24px rgba(0,0,0,0.6)`
            : '0 6px 18px rgba(0, 0, 0, 0.4)',
        cursor: 'move',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxSizing: 'border-box',
        zIndex: isSelected ? 30 : 10
      }}
    >
      {/* Top Accent Stripe */}
      <div style={{
        height: '4px',
        width: '100%',
        backgroundColor: meta.color,
        borderTopLeftRadius: '10px',
        borderTopRightRadius: '10px',
        boxShadow: `0 0 8px ${meta.glow}`
      }} />

      {/* Header Bar */}
      <div style={{
        padding: '8px 12px 4px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: meta.color }}>
          {getNodeIcon()}
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {meta.tag}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {node.type === 'TRIGGER' && onTriggerNode && (
            <button
              title="Quick Trigger"
              onClick={(e) => {
                e.stopPropagation();
                onTriggerNode(node);
              }}
              disabled={triggeringNodeId === node.id}
              style={{ ...actionBtnStyle, color: '#38bdf8' }}
            >
              <Play size={12} fill="#38bdf8" />
            </button>
          )}
          <button
            title="Inspect & Configure"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInspector(node);
            }}
            style={actionBtnStyle}
          >
            <Settings size={13} />
          </button>
          <button
            title="Duplicate Node"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateNode(node);
            }}
            style={actionBtnStyle}
          >
            <Copy size={13} />
          </button>
          <button
            title="Delete Node"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            style={{ ...actionBtnStyle, color: '#f87171' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Title & Summary */}
      <div style={{ padding: '0 12px 6px 12px' }}>
        <div style={{
          fontSize: '12.5px',
          fontWeight: 700,
          color: '#f8fafc',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px'
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</span>
          {node.type === 'API_MAPPER' && (
            <span style={{
              fontSize: '9.5px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '3px',
              backgroundColor: String(node.config?.httpMethod || 'POST').toUpperCase() === 'GET' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(16, 185, 129, 0.18)',
              color: String(node.config?.httpMethod || 'POST').toUpperCase() === 'GET' ? '#38bdf8' : '#34d399',
              border: `1px solid ${String(node.config?.httpMethod || 'POST').toUpperCase() === 'GET' ? '#0284c7' : '#059669'}`,
              fontFamily: 'monospace',
              flexShrink: 0
            }}>
              {String(node.config?.httpMethod || 'POST').toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Manual Trigger Quick-Execute Bar */}
      {isManualClick && (
        <div style={{ padding: '0 10px 6px 10px' }}>
          <button
            title="Click to trigger this workflow"
            onClick={(e) => {
              e.stopPropagation();
              onTriggerNode?.(node);
            }}
            disabled={triggeringNodeId === node.id}
            style={{
              width: '100%',
              padding: '4px 8px',
              borderRadius: '5px',
              backgroundColor: triggeringNodeId === node.id ? '#0e7490' : '#0284c7',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: triggeringNodeId === node.id ? 'not-allowed' : 'pointer'
            }}
          >
            <MousePointerClick size={12} />
            {triggeringNodeId === node.id ? 'Triggering...' : 'Click to Trigger'}
          </button>
        </div>
      )}

      {/* Expansion Toggle Button */}
      <div style={{
        padding: '4px 10px 6px 10px',
        borderTop: '1px solid #1e293b',
        backgroundColor: '#0a101f'
      }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.id);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
            border: isExpanded ? '1px solid #0284c7' : '1px solid #334155',
            borderRadius: '5px',
            color: isExpanded ? '#38bdf8' : '#94a3b8',
            fontSize: '10.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.12s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={11} />
            <span>I/O Ports ({inputs.length} in • {outputs.length} out)</span>
          </div>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Expanded I/O Drawer: Inputs & Outputs with 1-Click Connector Mapping */}
      {isExpanded && (
        <div style={{
          padding: '8px 10px 10px 10px',
          borderTop: '1px solid #1e293b',
          backgroundColor: '#030712',
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Node Metadata Header for API Mapper */}
          {node.type === 'API_MAPPER' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#0f172a',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #1e293b',
              fontSize: '10px'
            }}>
              <span style={{
                fontWeight: 800,
                color: String(node.config?.httpMethod || 'POST').toUpperCase() === 'GET' ? '#38bdf8' : '#34d399',
                fontFamily: 'monospace'
              }}>
                {String(node.config?.httpMethod || 'POST').toUpperCase()}
              </span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={String(node.config?.mappingCode || node.config?.endpointUrl || 'Custom REST')}>
                {String(node.config?.mappingCode || node.config?.endpointUrl || 'Custom REST')}
              </span>
            </div>
          )}

          {/* Inputs Section */}
          <div>
            <div style={{
              fontSize: '9.5px',
              fontWeight: 700,
              color: '#60a5fa',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ArrowRight size={10} /> Node Inputs & Connectors
            </div>

            {inputs.length === 0 ? (
              <div style={{
                fontSize: '10px',
                color: '#64748b',
                fontStyle: 'italic',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed #1e293b',
                borderRadius: '4px',
                padding: '5px 8px'
              }}>
                {node.type === 'API_MAPPER' && String(node.config?.httpMethod || 'POST').toUpperCase() === 'GET'
                  ? 'ℹ️ No request body required (GET method)'
                  : node.type === 'API_MAPPER'
                    ? `⚠️ No payload fields mapped (${String(node.config?.httpMethod || 'POST').toUpperCase()} request body)`
                    : 'No inputs required'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {inputs.map((inp) => (
                  <div key={inp.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '4px',
                    padding: '3px 6px',
                    fontSize: '10.5px'
                  }}>
                    <span style={{ color: '#f8fafc', fontWeight: 600, fontFamily: 'monospace' }}>
                      {inp.name}
                    </span>

                    {/* Source Output Connector Selector */}
                    {upstreamOutputs.length === 0 ? (
                      <span style={{
                        fontSize: '9.5px',
                        color: '#94a3b8',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: '1px dashed rgba(239, 68, 68, 0.3)',
                        borderRadius: '3px',
                        padding: '2px 5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ color: '#f87171' }}>●</span> Connect wire to map
                      </span>
                    ) : (
                      <select
                        value={upstreamOutputs.some(up => up.name === inp.connectedFrom) ? (inp.connectedFrom || '') : ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          onMapProperty(node.id, inp.name, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: '#020617',
                          color: '#38bdf8',
                          border: '1px solid #0284c7',
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 4px',
                          cursor: 'pointer',
                          maxWidth: '125px'
                        }}
                      >
                        <option value="" disabled>Select Property...</option>
                        {upstreamOutputs.map(up => (
                          <option key={up.name} value={up.name}>
                            ← {up.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outputs Section */}
          {outputs.length > 0 && (
            <div>
              <div style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#34d399',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ArrowLeft size={10} style={{ transform: 'rotate(180deg)' }} /> Emitted Outputs
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {outputs.map((out) => (
                  <span
                    key={out.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      color: '#34d399',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 600
                    }}
                  >
                    <span>→ {out.name}</span>
                    {out.type && (
                      <span style={{ fontSize: '8.5px', color: '#6ee7b7' }}>({out.type})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Port (Left Handle on card) */}
      {node.type !== 'TRIGGER' && (
        <div
          title="Input connection port"
          style={{
            position: 'absolute',
            left: '-7px',
            top: '36px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: hoveredTargetId === node.id ? '#38bdf8' : '#1e293b',
            border: '2px solid #38bdf8',
            cursor: 'crosshair',
            boxShadow: hoveredTargetId === node.id ? '0 0 10px #38bdf8' : 'none',
            transition: 'all 0.15s',
            zIndex: 40
          }}
        />
      )}

      {/* Output Port (Right Handle on card) */}
      {node.type !== 'TERMINATOR' && (
        <div
          title="Drag connection line to target node"
          onMouseDown={(e) => onPortMouseDown(e, node.id)}
          style={{
            position: 'absolute',
            right: '-7px',
            top: '36px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: '#1e293b',
            border: '2px solid #38bdf8',
            cursor: 'crosshair',
            transition: 'all 0.15s',
            zIndex: 40
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#38bdf8';
            e.currentTarget.style.boxShadow = '0 0 10px #38bdf8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e293b';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      )}
    </div>
  );
};
