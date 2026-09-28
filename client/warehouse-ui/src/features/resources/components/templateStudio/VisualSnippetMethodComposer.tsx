import React, { useState } from 'react';
import { 
  Cpu, 
  Globe, 
  Calculator, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  Layers, 
  Plus,
  Terminal,
  Zap
} from 'lucide-react';

export interface SnippetTemplateDef {
  id: string;
  name: string;
  category: 'HARDWARE' | 'API' | 'CALCULATION' | 'TRANSFORM';
  icon: 'Cpu' | 'Globe' | 'Calculator' | 'Layers';
  color: string;
  description: string;
  inputs: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'json';
    required: boolean;
    defaultValue?: string;
    placeholder: string;
    description: string;
  }>;
  outputPreview: Record<string, unknown>;
}

// Built-in Sample Snippets Library
export const SYSTEM_SNIPPETS_LIBRARY: SnippetTemplateDef[] = [
  {
    id: 'OPC_UA_WRITE_TAG',
    name: 'Write PLC Tag',
    category: 'HARDWARE',
    icon: 'Cpu',
    color: '#10b981', // Emerald
    description: 'Writes a command or setpoint value to a specific PLC tag address or NodeId',
    inputs: [
      {
        name: 'tagAddress',
        label: 'PLC Tag / NodeId',
        type: 'string',
        required: true,
        defaultValue: '#{properties.tagPrefix}.Commands.Start',
        placeholder: 'e.g. #{properties.tagPrefix}.Motor.Speed',
        description: 'Target tag path or NodeId on the PLC'
      },
      {
        name: 'value',
        label: 'Value to Write',
        type: 'number',
        required: true,
        defaultValue: '#{params.speed}',
        placeholder: 'Constant number or #{params.speed}',
        description: 'Setpoint or boolean pulse to send to PLC'
      },
      {
        name: 'timeoutMs',
        label: 'Timeout (ms)',
        type: 'number',
        required: false,
        defaultValue: '3000',
        placeholder: '3000',
        description: 'Max time to wait for PLC ACK'
      }
    ],
    outputPreview: {
      success: true,
      statusCode: 'Good',
      writtenValue: 120,
      roundTripMs: 14
    }
  },
  {
    id: 'OPC_UA_READ_TAG',
    name: 'Read PLC Tag',
    category: 'HARDWARE',
    icon: 'Cpu',
    color: '#06b6d4', // Cyan
    description: 'Reads single tag value, quality StatusCode, and source timestamp from the PLC',
    inputs: [
      {
        name: 'tagAddress',
        label: 'PLC Tag / NodeId',
        type: 'string',
        required: true,
        defaultValue: '#{properties.tagPrefix}.Sensors.PhotoEye',
        placeholder: 'e.g. #{properties.tagPrefix}.Status',
        description: 'Tag address to read from PLC address space'
      }
    ],
    outputPreview: {
      success: true,
      value: true,
      statusCode: 'Good',
      sourceTimestamp: '2026-09-27T15:30:00Z'
    }
  },
  {
    id: 'REST_DISPATCH',
    name: 'HTTP API Request',
    category: 'API',
    icon: 'Globe',
    color: '#3b82f6', // Electric Blue
    description: 'Dispatches structured JSON payload to an external REST endpoint (WMS, ERP, MES)',
    inputs: [
      {
        name: 'path',
        label: 'API Path',
        type: 'string',
        required: true,
        defaultValue: '/api/v1/orders/stage',
        placeholder: '/api/v1/endpoint',
        description: 'Relative API path on target host'
      },
      {
        name: 'httpMethod',
        label: 'HTTP Method',
        type: 'string',
        required: true,
        defaultValue: 'POST',
        placeholder: 'POST or GET',
        description: 'HTTP verb'
      },
      {
        name: 'requestPayload',
        label: 'JSON Payload',
        type: 'json',
        required: false,
        defaultValue: '{"lpn": "#{params.palletLpn}", "speed": #{params.speed}}',
        placeholder: '{"key": "value"}',
        description: 'Payload body with dynamic parameter interpolation'
      }
    ],
    outputPreview: {
      success: true,
      httpStatus: 200,
      response: { confirmationId: 'STG-9982', status: 'STAGED' }
    }
  },
  {
    id: 'MATH_FORMULA',
    name: 'Formula & Math Calc',
    category: 'CALCULATION',
    icon: 'Calculator',
    color: '#8b5cf6', // Violet
    description: 'Evaluates algebraic formulas for volume, weight thresholds, or dimensional validation',
    inputs: [
      {
        name: 'formula',
        label: 'Arithmetic Formula',
        type: 'string',
        required: true,
        defaultValue: '(#{params.length} * #{params.width} * #{params.height}) / 1000000',
        placeholder: 'e.g. (l * w * h) / 1e6',
        description: 'Mathematical expression to compute'
      }
    ],
    outputPreview: {
      success: true,
      result: 1.44,
      unit: 'm3'
    }
  }
];

interface VisualSnippetMethodComposerProps {
  initialMethodName?: string;
  resourceProperties?: Record<string, string>;
  onSaveMethod?: (methodData: unknown) => void;
}

export const VisualSnippetMethodComposer: React.FC<VisualSnippetMethodComposerProps> = ({
  initialMethodName = 'START_INFEED_MOTOR',
  resourceProperties = {
    endpointUrl: 'opc.tcp://192.168.1.50:4840',
    tagPrefix: 'DB100_CONV_01',
    defaultSpeed: '100',
    host: '192.168.1.50',
    port: '4840'
  },
  onSaveMethod
}) => {
  const [methodName, setMethodName] = useState(initialMethodName);
  const [description, setDescription] = useState('Starts conveyor belt at designated setpoint speed');
  const [selectedSnippet, setSelectedSnippet] = useState<SnippetTemplateDef>(SYSTEM_SNIPPETS_LIBRARY[0]);
  const [inputBindings, setInputBindings] = useState<Record<string, string>>({
    tagAddress: '#{properties.tagPrefix}.Commands.Start',
    value: '#{params.speed}',
    timeoutMs: '3000'
  });
  const [methodParams, setMethodParams] = useState<Array<{ name: string; type: string }>>([
    { name: 'speed', type: 'number' },
    { name: 'palletLpn', type: 'string' }
  ]);
  const [newParamName, setNewParamName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  // Available draggable/clickable chips
  const propertyChips = Object.keys(resourceProperties).map(k => `#{properties.${k}}`);
  const paramChips = methodParams.map(p => `#{params.${p.name}}`);

  const handleSelectSnippet = (snippet: SnippetTemplateDef) => {
    setSelectedSnippet(snippet);
    const defaults: Record<string, string> = {};
    snippet.inputs.forEach(i => {
      defaults[i.name] = i.defaultValue || '';
    });
    setInputBindings(defaults);
    setSimulationLog(null);
  };

  const handleInsertChip = (inputName: string, chipValue: string) => {
    setInputBindings(prev => ({
      ...prev,
      [inputName]: chipValue
    }));
  };

  const handleAddParam = () => {
    if (!newParamName.trim()) return;
    const clean = newParamName.trim().replace(/\s+/g, '_');
    if (!methodParams.some(p => p.name === clean)) {
      setMethodParams(prev => [...prev, { name: clean, type: 'string' }]);
      setNewParamName('');
    }
  };

  const handleSimulateExecution = () => {
    setSimulating(true);
    setSimulationLog(null);
    setTimeout(() => {
      setSimulating(false);
      setSimulationLog(JSON.stringify(selectedSnippet.outputPreview, null, 2));
    }, 450);
  };

  const filteredSnippets = SYSTEM_SNIPPETS_LIBRARY.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      display: 'flex',
      height: '620px',
      backgroundColor: '#090d16',
      border: '1px solid #1e293b',
      borderRadius: '10px',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ===================================================================== */}
      {/* 1. LEFT PANEL: SNIPPET PALETTE LIBRARY */}
      {/* ===================================================================== */}
      <div style={{
        width: '280px',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>
            System Snippets Library
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Inbuilt, compiled Java execution blocks
          </div>
          {/* Search */}
          <div style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '6px 10px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '11.5px',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* Snippet Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredSnippets.map(snippet => {
            const isSelected = selectedSnippet.id === snippet.id;
            return (
              <div
                key={snippet.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', snippet.id)}
                onClick={() => handleSelectSnippet(snippet)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#1e293b',
                  border: isSelected ? `1.5px solid ${snippet.color}` : '1px solid #334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: snippet.color }}>
                      {snippet.icon === 'Cpu' && <Cpu size={15} />}
                      {snippet.icon === 'Globe' && <Globe size={15} />}
                      {snippet.icon === 'Calculator' && <Calculator size={15} />}
                      {snippet.icon === 'Layers' && <Layers size={15} />}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                      {snippet.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: snippet.color
                  }}>
                    {snippet.category}
                  </span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: 1.3 }}>
                  {snippet.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN STAGE: VISUAL METHOD COMPOSER & PARAMETER BINDING */}
      {/* ===================================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Method Header Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0d1322',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '60%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>METHOD CODE:</span>
              <input
                type="text"
                value={methodName}
                onChange={e => setMethodName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '4px 8px'
                }}
              />
            </div>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Method purpose / description"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#94a3b8',
                fontSize: '11.5px',
                width: '100%'
              }}
            />
          </div>

          <button
            onClick={() => onSaveMethod?.({ methodName, description, selectedSnippet, inputBindings, methodParams })}
            style={{
              height: '44px',
              padding: '0 20px',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle2 size={16} /> Save Method
          </button>
        </div>

        {/* Workspace Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Quick Bindings Toolbar */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
              <Sparkles size={13} style={{ color: '#f59e0b' }} />
              CLICK CHIP TO BIND VALUE INTO ACTIVE INPUT SLOT:
            </div>

            {/* Chips Container */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {/* Resource Properties */}
              {propertyChips.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    const firstInput = selectedSnippet.inputs[0]?.name;
                    if (firstInput) handleInsertChip(firstInput, c);
                  }}
                  title="Click to bind Resource Property"
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    cursor: 'pointer'
                  }}
                >
                  {c}
                </button>
              ))}

              {/* Method Parameters */}
              {paramChips.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    const secondInput = selectedSnippet.inputs[1]?.name || selectedSnippet.inputs[0]?.name;
                    if (secondInput) handleInsertChip(secondInput, c);
                  }}
                  title="Click to bind Method Invocation Parameter"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    cursor: 'pointer'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Declare new param */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Add new input param (e.g. targetSpeed)"
                value={newParamName}
                onChange={e => setNewParamName(e.target.value)}
                style={{
                  height: '32px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  padding: '0 8px'
                }}
              />
              <button
                onClick={handleAddParam}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  backgroundColor: '#334155',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} /> Add Param
              </button>
            </div>
          </div>

          {/* Dropped Snippet Visual Card */}
          <div style={{
            backgroundColor: '#0f172a',
            border: `2px solid ${selectedSnippet.color}`,
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4)`
          }}>
            {/* Snippet Card Header */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: `${selectedSnippet.color}20`,
                  color: selectedSnippet.color
                }}>
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Active Snippet: {selectedSnippet.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {selectedSnippet.description}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                JAVA INBUILT (HIGH SPEED)
              </div>
            </div>

            {/* Input Slots Grid */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: '#94a3b8', textTransform: 'uppercase' }}>
                Configure Input Slots (No-Code Bindings)
              </div>

              {selectedSnippet.inputs.map(input => {
                const currentVal = inputBindings[input.name] ?? '';
                const isDynamic = currentVal.startsWith('#{');
                return (
                  <div
                    key={input.name}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ width: '220px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                        {input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                        {input.description}
                      </div>
                    </div>

                    <ArrowRight size={14} color="#64748b" />

                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        value={currentVal}
                        onChange={e => handleInsertChip(input.name, e.target.value)}
                        placeholder={input.placeholder}
                        style={{
                          width: '100%',
                          height: '48px',
                          backgroundColor: '#090d16',
                          border: isDynamic ? '1px solid #38bdf8' : '1px solid #475569',
                          borderRadius: '6px',
                          color: isDynamic ? '#38bdf8' : '#f8fafc',
                          fontFamily: isDynamic ? 'monospace' : 'inherit',
                          fontSize: '12px',
                          padding: '0 12px',
                          boxSizing: 'border-box'
                        }}
                      />
                      {isDynamic && (
                        <span style={{
                          position: 'absolute',
                          right: '10px',
                          top: '16px',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#38bdf8',
                          pointerEvents: 'none'
                        }}>
                          BOUND
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Testing Sandbox Bar */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#0a0f1d',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>
                  <Terminal size={14} style={{ color: '#38bdf8' }} />
                  TEST RUN / SIMULATION OUTPUT CONSOLE
                </div>
                <button
                  onClick={handleSimulateExecution}
                  disabled={simulating}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: simulating ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Play size={12} /> {simulating ? 'Executing Snippet...' : 'Test Run Snippet'}
                </button>
              </div>

              {simulationLog && (
                <pre style={{
                  margin: 0,
                  padding: '10px 12px',
                  backgroundColor: '#030712',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  color: '#10b981',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {simulationLog}
                </pre>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
