import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  Clock, 
  Save, 
  HelpCircle, 
  Check, 
  AlertCircle,
  Plus,
  Trash2,
  BookmarkPlus,
  Database,
  Variable,
  Hash
} from 'lucide-react';
import { WorkflowNode, workflowService } from '../../../../services/workflowService';
import { fetchResourcesApi, ResourceItem } from '../../../../services/resourceService';
import { ContextVariableChips, ContextVariableItem } from './ContextVariableChips';

interface ResourceActionConfigInspectorProps {
  node: WorkflowNode;
  onUpdateConfig: (newConfig: Record<string, unknown>) => void;
  availableVariables?: ContextVariableItem[];
}

interface MethodParamDef {
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

interface EffectiveMethodItem {
  methodName: string;
  displayName?: string;
  description?: string;
  source?: string;
  targetProtocol?: string;
  parameters?: MethodParamDef[];
  inputParameters?: MethodParamDef[];
}

export const ResourceActionConfigInspector: React.FC<ResourceActionConfigInspectorProps> = ({
  node,
  onUpdateConfig,
  availableVariables = []
}) => {
  const cfg = node.config || {};
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [composedName, setComposedName] = useState('');
  const [composedCode, setComposedCode] = useState('');
  const [composedDesc, setComposedDesc] = useState('');
  const [savingComposed, setSavingComposed] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const selectedResourceCode = String(cfg.resourceCode || '');
  const selectedMethodName = String(cfg.methodName || '');
  const currentParams = (typeof cfg.parameters === 'object' && cfg.parameters !== null)
    ? { ...(cfg.parameters as Record<string, unknown>) }
    : {};
  const timeoutMs = typeof cfg.timeoutMs === 'number' ? cfg.timeoutMs : 5000;

  // Load resources
  useEffect(() => {
    setLoadingResources(true);
    fetchResourcesApi()
      .then(res => setResources(res || []))
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false));
  }, []);

  const activeResource = resources.find(
    r => (r.resourceId && r.resourceId === selectedResourceCode) || (r.name && r.name === selectedResourceCode)
  );

  // Extract effective methods
  const availableMethods: EffectiveMethodItem[] = React.useMemo(() => {
    if (!activeResource) return [];
    if (Array.isArray(activeResource.effectiveMethods) && activeResource.effectiveMethods.length > 0) {
      return activeResource.effectiveMethods.map(m => ({
        methodName: String(m.methodName || m.name || ''),
        displayName: String(m.displayName || m.name || m.methodName || ''),
        description: String(m.description || ''),
        source: String(m.source || ''),
        targetProtocol: String(m.targetProtocol || ''),
        parameters: (Array.isArray(m.parameters) ? m.parameters : (Array.isArray(m.inputParameters) ? m.inputParameters : [])) as MethodParamDef[]
      })).filter(m => m.methodName.length > 0);
    }
    // Fallback to methodsConfig keys
    if (activeResource.methodsConfig && typeof activeResource.methodsConfig === 'object') {
      return Object.keys(activeResource.methodsConfig).map(k => ({
        methodName: k,
        displayName: k,
        description: 'Configured equipment method',
        source: 'INSTANCE_CUSTOM',
        parameters: []
      }));
    }
    return [];
  }, [activeResource]);

  const activeMethod = availableMethods.find(m => m.methodName === selectedMethodName);

  const handleResourceChange = (resCode: string) => {
    const res = resources.find(r => r.resourceId === resCode || r.name === resCode);
    const firstMethod = (res?.effectiveMethods && res.effectiveMethods.length > 0)
      ? String((res.effectiveMethods[0] as Record<string, unknown>).methodName || '')
      : '';
    onUpdateConfig({
      ...cfg,
      resourceId: resCode,
      resourceCode: resCode,
      methodName: firstMethod,
      parameters: {}
    });
  };

  const handleMethodChange = (methodName: string) => {
    const m = availableMethods.find(x => x.methodName === methodName);
    const initialParams: Record<string, unknown> = {};
    if (m && m.parameters) {
      m.parameters.forEach(p => {
        if (p.defaultValue !== undefined) {
          initialParams[p.name] = p.defaultValue;
        }
      });
    }
    onUpdateConfig({
      ...cfg,
      methodName,
      parameters: initialParams
    });
  };

  const handleParamChange = (paramName: string, value: unknown) => {
    onUpdateConfig({
      ...cfg,
      parameters: {
        ...currentParams,
        [paramName]: value
      }
    });
  };

  const handleAddCustomParam = () => {
    const key = `param_${Object.keys(currentParams).length + 1}`;
    handleParamChange(key, '');
  };

  const handleRemoveParam = (paramName: string) => {
    const updated = { ...currentParams };
    delete updated[paramName];
    onUpdateConfig({
      ...cfg,
      parameters: updated
    });
  };

  const handleSaveAsComposedNode = async () => {
    if (!composedCode.trim() || !composedName.trim()) {
      setSaveErrorMsg('Template Code and Name are required');
      return;
    }
    setSavingComposed(true);
    setSaveErrorMsg(null);
    try {
      await workflowService.createNodeTemplate({
        templateCode: composedCode.trim().toUpperCase(),
        name: composedName.trim(),
        description: composedDesc.trim() || `Composed Resource Action: ${selectedResourceCode}.${selectedMethodName}`,
        nodeType: 'RESOURCE_ACTION',
        category: 'EQUIPMENT',
        icon: 'Cpu',
        color: 'emerald',
        resourceCode: selectedResourceCode,
        targetMethod: selectedMethodName,
        configuration: {
          ...cfg,
          resourceCode: selectedResourceCode,
          methodName: selectedMethodName,
          parameters: currentParams,
          timeoutMs
        },
        inputSchema: { properties: currentParams }
      });
      setSaveSuccessMsg(`Template '${composedCode}' saved to Palette!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setSaveModalOpen(false);
      }, 1800);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to save node template');
    } finally {
      setSavingComposed(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
      {/* 1. Target Resource Selector */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
          <Cpu size={14} style={{ color: '#10b981' }} />
          Target Resource / Gateway
        </label>
        <select
          value={selectedResourceCode}
          onChange={e => handleResourceChange(e.target.value)}
          disabled={loadingResources}
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            color: '#f8fafc',
            padding: '0 12px',
            fontSize: '12px',
            outline: 'none'
          }}
        >
          <option value="">-- Select Hardware / Software Resource --</option>
          {resources.map(r => (
            <option key={r.id || r.resourceId} value={r.resourceId || r.name}>
              {r.name} ({r.resourceId}) [{r.type || r.protocol || 'GENERIC'}]
            </option>
          ))}
        </select>
        {activeResource && (
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Protocol: <span style={{ color: '#38bdf8' }}>{activeResource.protocol || activeResource.type || 'N/A'}</span>
            {activeResource.templateCode && <> | Template: <span style={{ color: '#a78bfa' }}>{activeResource.templateCode}</span></>}
          </div>
        )}
      </div>

      {/* 2. Target Method Selector */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
          <Layers size={14} style={{ color: '#38bdf8' }} />
          Action / Method to Execute
        </label>
        <select
          value={selectedMethodName}
          onChange={e => handleMethodChange(e.target.value)}
          disabled={!selectedResourceCode || availableMethods.length === 0}
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            color: '#f8fafc',
            padding: '0 12px',
            fontSize: '12px',
            outline: 'none'
          }}
        >
          <option value="">-- Select Inherited / Custom Method --</option>
          {availableMethods.map(m => (
            <option key={m.methodName} value={m.methodName}>
              {m.displayName || m.methodName} ({m.source || 'METHOD'})
            </option>
          ))}
        </select>

        {activeMethod && (
          <div style={{
            marginTop: '6px',
            padding: '8px',
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{activeMethod.displayName || activeMethod.methodName}</span>
              <span style={{
                fontSize: '9px',
                padding: '2px 5px',
                borderRadius: '4px',
                backgroundColor: activeMethod.source === 'SYSTEM_ARCHETYPE' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: activeMethod.source === 'SYSTEM_ARCHETYPE' ? '#38bdf8' : '#10b981'
              }}>
                {activeMethod.source || 'METHOD'}
              </span>
            </div>
            {activeMethod.description && (
              <div style={{ color: '#94a3b8' }}>{activeMethod.description}</div>
            )}
          </div>
        )}
      </div>

      {/* 3. Parameter Bindings */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#94a3b8' }}>
            <HelpCircle size={14} style={{ color: '#a78bfa' }} />
            Parameter Bindings
          </label>
          <button
            onClick={handleAddCustomParam}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <Plus size={12} /> Add Param
          </button>
        </div>

        {/* Render method-defined parameters or custom params */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeMethod?.parameters && activeMethod.parameters.length > 0 ? (
            activeMethod.parameters.map(p => {
              const val = String(currentParams[p.name] ?? '');
              const isContextRef = val.startsWith('#{') || val.startsWith('context.');
              return (
                <div key={p.name} style={{
                  padding: '10px',
                  backgroundColor: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '11px' }}>
                      {p.name} {p.required && <span style={{ color: '#ef4444' }}>*</span>}
                      <span style={{ marginLeft: '6px', color: '#64748b', fontWeight: 400 }}>({p.type || 'string'})</span>
                    </span>
                    
                    {/* Toggle between Static and Context Ref */}
                    <div style={{ display: 'flex', gap: '2px', backgroundColor: '#0f172a', padding: '2px', borderRadius: '4px', border: '1px solid #334155' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isContextRef) {
                            handleParamChange(p.name, '');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '3px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: !isContextRef ? '#38bdf8' : 'transparent',
                          color: !isContextRef ? '#0f172a' : '#94a3b8'
                        }}
                      >
                        <Hash size={11} /> Static
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isContextRef) {
                            handleParamChange(p.name, `#{context.${p.name}}`);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '3px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: isContextRef ? '#a855f7' : 'transparent',
                          color: isContextRef ? '#ffffff' : '#94a3b8'
                        }}
                      >
                        <Variable size={11} /> Context Ref
                      </button>
                    </div>
                  </div>

                  {isContextRef ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        type="text"
                        value={val}
                        onChange={e => handleParamChange(p.name, e.target.value)}
                        placeholder={`#{context.${p.name}}`}
                        style={{
                          height: '48px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #7c3aed',
                          borderRadius: '6px',
                          color: '#c084fc',
                          fontFamily: 'monospace',
                          padding: '0 10px',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      {availableVariables.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Quick bind:</span>
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                handleParamChange(p.name, `#{context.${e.target.value}}`);
                              }
                            }}
                            defaultValue=""
                            style={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '4px',
                              color: '#cbd5e1',
                              fontSize: '10px',
                              padding: '2px 6px'
                            }}
                          >
                            <option value="">-- Choose Context Variable --</option>
                            {availableVariables.map(v => (
                              <option key={v.name} value={v.name}>
                                {v.name} ({v.type || 'string'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={val}
                      onChange={e => handleParamChange(p.name, e.target.value)}
                      placeholder={`Static value for ${p.name}`}
                      style={{
                        height: '48px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        padding: '0 10px',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>
              );
            })
          ) : null}

          {/* Any additional params configured */}
          {Object.keys(currentParams)
            .filter(k => !activeMethod?.parameters?.some(p => p.name === k))
            .map(k => {
              const val = String(currentParams[k] ?? '');
              const isContextRef = val.startsWith('#{') || val.startsWith('context.');
              return (
                <div key={k} style={{
                  padding: '8px',
                  backgroundColor: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={k}
                      readOnly
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#cbd5e1',
                        fontWeight: 600,
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '2px', backgroundColor: '#0f172a', padding: '2px', borderRadius: '4px', border: '1px solid #334155' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isContextRef) handleParamChange(k, '');
                          }}
                          style={{
                            padding: '2px 5px',
                            fontSize: '9px',
                            fontWeight: 600,
                            borderRadius: '3px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: !isContextRef ? '#38bdf8' : 'transparent',
                            color: !isContextRef ? '#0f172a' : '#94a3b8'
                          }}
                        >
                          Static
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isContextRef) handleParamChange(k, `#{context.${k}}`);
                          }}
                          style={{
                            padding: '2px 5px',
                            fontSize: '9px',
                            fontWeight: 600,
                            borderRadius: '3px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: isContextRef ? '#a855f7' : 'transparent',
                            color: isContextRef ? '#ffffff' : '#94a3b8'
                          }}
                        >
                          Context
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveParam(k)}
                        style={{
                          height: '24px',
                          width: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={val}
                    onChange={e => handleParamChange(k, e.target.value)}
                    placeholder={isContextRef ? `#{context.${k}}` : 'Value'}
                    style={{
                      height: '48px',
                      backgroundColor: '#0f172a',
                      border: `1px solid ${isContextRef ? '#7c3aed' : '#1e293b'}`,
                      borderRadius: '6px',
                      color: isContextRef ? '#c084fc' : '#f8fafc',
                      fontFamily: isContextRef ? 'monospace' : 'inherit',
                      padding: '0 8px',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
              );
            })}
        </div>
      </div>

      {/* Upstream context variable chips for easy copy/paste */}
      {availableVariables.length > 0 && (
        <ContextVariableChips
          variables={availableVariables}
          onInsertVariable={token => {
            const keys = Object.keys(currentParams);
            if (keys.length > 0) {
              handleParamChange(keys[0], `#{${token}}`);
            } else {
              handleParamChange('value', `#{${token}}`);
            }
          }}
        />
      )}

      {/* 4. Output Context Variable */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
          <Database size={14} style={{ color: '#10b981' }} />
          Output Context Variable
        </label>
        <input
          type="text"
          value={String(cfg.outputVariable || 'actionResult')}
          onChange={e => onUpdateConfig({ ...cfg, outputVariable: e.target.value.trim() })}
          placeholder="e.g. actionResult or countIncremented"
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            color: '#f8fafc',
            padding: '0 12px',
            fontSize: '12px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
          Outcome is stored in context as: <code style={{ color: '#10b981', backgroundColor: '#090d16', padding: '1px 5px', borderRadius: '3px' }}>{`#{context.${cfg.outputVariable || 'actionResult'}}`}</code>
        </div>
      </div>

      {/* 5. Timeout & Simulation Option */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
            <Clock size={14} style={{ color: '#f59e0b' }} />
            Execution Timeout (ms)
          </label>
          <input
            type="number"
            value={timeoutMs}
            onChange={e => onUpdateConfig({ ...cfg, timeoutMs: Number(e.target.value) || 5000 })}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#090d16',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              color: '#f8fafc',
              padding: '0 12px',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '48px', padding: '0 4px' }}>
          <input
            type="checkbox"
            id="exec-sim-cb"
            checked={Boolean(cfg.executeInSimulation)}
            onChange={e => onUpdateConfig({ ...cfg, executeInSimulation: e.target.checked })}
            style={{ width: '20px', height: '20px', accentColor: '#10b981', cursor: 'pointer' }}
          />
          <label htmlFor="exec-sim-cb" style={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', userSelect: 'none' }}>
            Execute Live Resource Method during Simulator Runs
          </label>
        </div>
      </div>

      {/* 5. Save as Composed Node Button */}
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={() => {
            setComposedCode(`ACTION_${(selectedResourceCode || 'RES').toUpperCase()}_${(selectedMethodName || 'STEP').toUpperCase()}`);
            setComposedName(`${selectedResourceCode || 'Resource'} - ${selectedMethodName || 'Action'}`);
            setSaveModalOpen(true);
          }}
          disabled={!selectedResourceCode || !selectedMethodName}
          style={{
            width: '100%',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            color: '#c084fc',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: !selectedResourceCode || !selectedMethodName ? 'not-allowed' : 'pointer',
            opacity: !selectedResourceCode || !selectedMethodName ? 0.5 : 1
          }}
        >
          <BookmarkPlus size={16} /> Save as Composed Palette Node
        </button>
      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div style={{
          padding: '12px',
          backgroundColor: '#0b1120',
          border: '1px solid #334155',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
            Save as Reusable Node Template
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Template Code (Unique identifier)</label>
            <input
              type="text"
              value={composedCode}
              onChange={e => setComposedCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '0 10px',
                fontSize: '12px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Display Name</label>
            <input
              type="text"
              value={composedName}
              onChange={e => setComposedName(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '0 10px',
                fontSize: '12px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Description</label>
            <input
              type="text"
              value={composedDesc}
              onChange={e => setComposedDesc(e.target.value)}
              placeholder="Short description for palette tooltip"
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '0 10px',
                fontSize: '12px'
              }}
            />
          </div>

          {saveErrorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '11px' }}>
              <AlertCircle size={14} /> {saveErrorMsg}
            </div>
          )}
          {saveSuccessMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11px' }}>
              <Check size={14} /> {saveSuccessMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setSaveModalOpen(false)}
              style={{
                flex: 1,
                height: '48px',
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '6px',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAsComposedNode}
              disabled={savingComposed}
              style={{
                flex: 1,
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#8b5cf6',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: savingComposed ? 'wait' : 'pointer'
              }}
            >
              <Save size={14} /> {savingComposed ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
