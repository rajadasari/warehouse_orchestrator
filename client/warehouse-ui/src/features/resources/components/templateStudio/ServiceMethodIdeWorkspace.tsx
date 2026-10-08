import React, { useState, useEffect, useId } from 'react';
import { 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Globe, 
  Calculator, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight, 
  Zap, 
  Activity,
  Code2,
  Database
} from 'lucide-react';
import { MethodDefinition, MethodTraceLog } from '../../types/resourceEnums';
import { ServiceMethodTestBench } from './ServiceMethodTestBench';
import { testMethodExecution, PropertySchemaItem } from '../../../../services/resourceTemplateService';

interface ServiceMethodIdeWorkspaceProps {
  method?: MethodDefinition;
  availableProperties?: string[];
  templateProperties?: PropertySchemaItem[];
  onSave?: (method: MethodDefinition) => void;
  onExecuteTest?: (methodName: string, javaCode: string, params: Record<string, unknown>, storeProp?: string, properties?: Record<string, unknown>) => Promise<{
    success: boolean;
    data?: unknown;
    traceLogs?: MethodTraceLog[];
    updatedProperties?: Record<string, unknown>;
    executionTimeMs?: number;
    error?: string;
  }>;
}

export const ServiceMethodIdeWorkspace: React.FC<ServiceMethodIdeWorkspaceProps> = ({
  method,
  availableProperties = [],
  templateProperties = [],
  onSave,
  onExecuteTest
}) => {
  const methodIdFieldId = useId();
  const descFieldId = useId();
  const returnTypeFieldId = useId();
  const writeBackPropFieldId = useId();
  const chainedEventFieldId = useId();

  // Method metadata
  const [methodName, setMethodName] = useState(method?.name || '');
  const [description, setDescription] = useState(method?.description || '');
  const [returnType, setReturnType] = useState(method?.outputType || 'OBJECT');
  const [storeResultToProperty, setStoreResultToProperty] = useState(method?.storeResultToProperty || '');
  const [chainedEvent, setChainedEvent] = useState('');

  // Input Parameters
  const [inputs, setInputs] = useState<Array<{ name: string; type: string; defaultValue?: string }>>(
    method?.inputs || []
  );
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState('number');

  // Language & Code Editor
  const [language, setLanguage] = useState<'JAVA' | 'PYTHON'>(
    (method?.language === 'PYTHON' || (method as unknown as { pythonCode?: string })?.pythonCode) ? 'PYTHON' : 'JAVA'
  );

  const JAVA_STARTER = `// Dynamic In-Memory Java Logic (Compiled to JVM Bytecode in RAM < 1µs)
// Context available:
// - properties: Map<String, Object> (twin state)
// - params: Map<String, Object> (inputs)
// - resources: Cross-twin references
// - traceLogs: Diagnostic log collector

return null;`;

  const PYTHON_STARTER = `# Dynamic Python Logic (PyCode Bytecode Cached < 150µs)
# Context available:
# - properties: dict (twin state)
# - params: dict (inputs)
# - resources: Cross-twin references
# - traceLogs: Diagnostic log collector

# Example calculation:
a = float(properties.get("one", 0.0))
b = float(properties.get("two", 0.0))
result = a + b`;

  const [javaCode, setJavaCode] = useState<string>(() => {
    if (method?.language === 'PYTHON' || (method as unknown as { pythonCode?: string })?.pythonCode) {
      return (method as unknown as { pythonCode?: string })?.pythonCode || method?.javaCode || PYTHON_STARTER;
    }
    return method?.javaCode || JAVA_STARTER;
  });

  const handleLanguageChange = (newLang: 'JAVA' | 'PYTHON') => {
    if (newLang === language) return;
    setLanguage(newLang);
    if (!javaCode.trim() || javaCode === JAVA_STARTER || javaCode === PYTHON_STARTER) {
      setJavaCode(newLang === 'JAVA' ? JAVA_STARTER : PYTHON_STARTER);
    }
  };

  // Test Dock State
  const [testParams, setTestParams] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (method?.inputs || []).forEach(inp => {
      initial[inp.name] = inp.defaultValue || '';
    });
    return initial;
  });

  const [testProperties, setTestProperties] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    templateProperties.forEach(p => {
      initial[p.key] = p.defaultValue !== undefined && p.defaultValue !== null ? String(p.defaultValue) : '';
    });
    return initial;
  });

  useEffect(() => {
    if (templateProperties.length > 0) {
      setTestProperties(prev => {
        const next = { ...prev };
        templateProperties.forEach(p => {
          if (next[p.key] === undefined) {
            next[p.key] = p.defaultValue !== undefined && p.defaultValue !== null ? String(p.defaultValue) : '';
          }
        });
        return next;
      });
    }
  }, [templateProperties]);

  const [enableTraceLogs, setEnableTraceLogs] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data?: unknown;
    traceLogs: MethodTraceLog[];
    executionTimeMs?: number;
    error?: string;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state whenever selected method changes
  useEffect(() => {
    if (method) {
      setMethodName(method.name || '');
      setDescription(method.description || '');
      setReturnType(method.outputType || 'OBJECT');
      setStoreResultToProperty(method.storeResultToProperty || '');
      setInputs(method.inputs || []);
      const isPy = method.language === 'PYTHON' || !!(method as unknown as { pythonCode?: string })?.pythonCode;
      setLanguage(isPy ? 'PYTHON' : 'JAVA');
      const initialCode = (method as unknown as { pythonCode?: string })?.pythonCode || method.javaCode;
      setJavaCode(initialCode || (isPy ? PYTHON_STARTER : JAVA_STARTER));
      const initial: Record<string, string> = {};
      (method.inputs || []).forEach(inp => {
        initial[inp.name] = inp.defaultValue || '';
      });
      setTestParams(initial);
      setTestResult(null);
    }
  }, [method]);

  // Snippet Templates
  const handleInsertSnippet = (snippetType: 'MATH' | 'REST' | 'PLC_READ' | 'PLC_WRITE' | 'THRESHOLD') => {
    let snippet = '';
    if (language === 'PYTHON') {
      switch (snippetType) {
        case 'MATH':
          snippet = `\n# Math Scaler (Python)\nbase = float(params.get("base", 0.0))\nmultiplier = 1.15\nresult = base * multiplier\n`;
          break;
        case 'REST':
          snippet = `\n# REST API Payload (Python)\npayload = {\n    "resourceId": properties.get("resourceId"),\n    "timestamp": int(properties.get("timestamp", 0))\n}\nresult = payload\n`;
          break;
        case 'PLC_READ':
          snippet = `\n# Read PLC Tag (Python)\ntag = str(properties.get("tagPrefix", "")) + ".Sensors.Infeed"\nresult = properties.get(tag, False)\n`;
          break;
        case 'PLC_WRITE':
          snippet = `\n# Write PLC Setpoint (Python)\ntag = str(properties.get("tagPrefix", "")) + ".Commands.Speed"\nproperties[tag] = params.get("speed")\nresult = params.get("speed")\n`;
          break;
        case 'THRESHOLD':
          snippet = `\n# Guard Check (Python)\nval = float(params.get("value", 0.0))\nif val > 85.0:\n    properties["status"] = "FAULT_HIGH_TEMP"\n    result = False\nelse:\n    result = True\n`;
          break;
      }
    } else {
      switch (snippetType) {
        case 'MATH':
          snippet = `\n// Standard Math Scaler\ndouble base = ((Number) params.get("base")).doubleValue();\ndouble multiplier = 1.15;\nreturn Double.valueOf(base * multiplier);\n`;
          break;
        case 'REST':
          snippet = `\n// REST API Payload Preparation\nMap payload = new HashMap();\npayload.put("resourceId", properties.get("resourceId"));\npayload.put("timestamp", System.currentTimeMillis());\nreturn payload;\n`;
          break;
        case 'PLC_READ':
          snippet = `\n// Read PLC Tag Value from local cache\nString tag = properties.get("tagPrefix") + ".Sensors.Infeed";\nreturn properties.getOrDefault(tag, Boolean.FALSE);\n`;
          break;
        case 'PLC_WRITE':
          snippet = `\n// PLC Setpoint Dispatch\nString tag = properties.get("tagPrefix") + ".Commands.Speed";\nproperties.put(tag, params.get("speed"));\nreturn params.get("speed");\n`;
          break;
        case 'THRESHOLD':
          snippet = `\n// Safety Guard Check\ndouble val = ((Number) params.get("value")).doubleValue();\nif (val > 85.0) {\n    properties.put("status", "FAULT_HIGH_TEMP");\n    return Boolean.FALSE;\n}\nreturn Boolean.TRUE;\n`;
          break;
      }
    }
    setJavaCode(prev => prev + snippet);
  };

  const handleAddInput = () => {
    if (!newParamName.trim()) return;
    const clean = newParamName.trim().replace(/\s+/g, '_');
    if (!inputs.some(i => i.name === clean)) {
      setInputs(prev => [...prev, { name: clean, type: newParamType, defaultValue: '' }]);
      setTestParams(prev => ({ ...prev, [clean]: '' }));
      setNewParamName('');
    }
  };

  const handleRemoveInput = (idx: number) => {
    const target = inputs[idx];
    setInputs(prev => prev.filter((_, i) => i !== idx));
    setTestParams(prev => {
      const copy = { ...prev };
      delete copy[target.name];
      return copy;
    });
  };

  const handleInsertToken = (token: string) => {
    setJavaCode(prev => prev + ' ' + token);
  };

  const handleRunTest = async () => {
    setIsExecuting(true);

    // Prepare typed parameters
    const parsedParams: Record<string, unknown> = {};
    inputs.forEach(i => {
      const raw = testParams[i.name] ?? i.defaultValue ?? '';
      if (i.type === 'number') {
        parsedParams[i.name] = Number(raw) || 0;
      } else if (i.type === 'boolean') {
        parsedParams[i.name] = raw === 'true' || raw === '1';
      } else {
        parsedParams[i.name] = raw;
      }
    });

    // Prepare typed twin properties
    const parsedProps: Record<string, unknown> = {};
    Object.entries(testProperties).forEach(([k, rawVal]) => {
      const pDef = templateProperties.find(p => p.key === k);
      const pType = pDef?.type?.toUpperCase();
      if (pType === 'DOUBLE' || pType === 'NUMBER' || pType === 'INTEGER' || pType === 'LONG') {
        parsedProps[k] = rawVal !== '' && !isNaN(Number(rawVal)) ? Number(rawVal) : 0.0;
      } else if (pType === 'BOOLEAN') {
        parsedProps[k] = rawVal === 'true' || rawVal === '1';
      } else {
        parsedProps[k] = !isNaN(Number(rawVal)) && rawVal.trim() !== '' ? Number(rawVal) : rawVal;
      }
    });

    try {
      const res = onExecuteTest
        ? await onExecuteTest(methodName, javaCode, parsedParams, storeResultToProperty, parsedProps)
        : await testMethodExecution({
            methodName: methodName || 'TEST_METHOD',
            language,
            javaCode,
            script: javaCode,
            parameters: parsedParams,
            properties: parsedProps,
            storeResultToProperty
          });

      // Synchronize updated properties back to test inputs if write-back updated any property
      if (res.updatedProperties) {
        setTestProperties(prev => {
          const next = { ...prev };
          Object.entries(res.updatedProperties!).forEach(([uk, uv]) => {
            next[uk] = String(uv);
          });
          return next;
        });
      }

      setTestResult({
        success: res.success,
        data: res.data,
        traceLogs: res.traceLogs || [],
        executionTimeMs: res.executionTimeMs,
        error: res.error
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        traceLogs: [
          { timestamp: '+0.01ms', phase: 'INIT', message: `Test execution initiated for '${methodName || 'UNTITLED'}' (${language})`, level: 'INFO' },
          { timestamp: '+0.45ms', phase: 'ERROR', message: errorMsg, level: 'ERROR' }
        ],
        error: errorMsg
      });
    }
    setIsExecuting(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        name: methodName,
        description,
        language,
        javaCode: language === 'JAVA' ? javaCode : undefined,
        pythonCode: language === 'PYTHON' ? javaCode : undefined,
        script: javaCode,
        inputs,
        outputType: returnType,
        storeResultToProperty
      });
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '760px',
      backgroundColor: '#090d16',
      border: '1px solid #1e293b',
      borderRadius: '10px',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & NATURAL LANGUAGE SUMMARY BANNER */}
      {/* ===================================================================== */}
      <div style={{
        padding: '12px 18px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#3b82f620',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Code2 size={18} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div>
                <label htmlFor={methodIdFieldId} style={{ display: 'none' }}>Service Identifier</label>
                <input
                  id={methodIdFieldId}
                  type="text"
                  value={methodName}
                  onChange={e => setMethodName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="SERVICE_NAME"
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    width: '220px'
                  }}
                />
              </div>
              <div>
                <label htmlFor={descFieldId} style={{ display: 'none' }}>Description</label>
                <input
                  id={descFieldId}
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of this service logic..."
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid transparent',
                    borderBottom: '1px solid #334155',
                    color: '#94a3b8',
                    fontSize: '12px',
                    padding: '4px 8px',
                    width: '380px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: '#10b98120',
              color: '#34d399',
              border: '1px solid #10b98140'
            }}>
              <Zap size={11} /> Java JVM Bytecode (&lt; 1µs)
            </span>
            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: saveSuccess ? '#10b981' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {saveSuccess ? <Check size={14} /> : <CheckCircle2 size={14} />}
              {saveSuccess ? 'Saved' : 'Save Service'}
            </button>
          </div>
        </div>

        {/* Natural Language Pipeline Summary */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: '#070b14',
          borderRadius: '6px',
          border: '1px solid #1e293b',
          fontSize: '11.5px',
          color: '#cbd5e1'
        }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Pipeline:</span>
          <span>Takes</span>
          <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
            {inputs.length > 0 ? inputs.map(i => `#{params.${i.name}}`).join(', ') : 'none'}
          </span>
          <ArrowRight size={12} color="#64748b" />
          <span>Executes in-memory</span>
          <span style={{ color: '#34d399', fontWeight: 600 }}>Java Bytecode (Janino)</span>
          <ArrowRight size={12} color="#64748b" />
          <span>Writes result to</span>
          <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>
            {storeResultToProperty ? `#{properties.${storeResultToProperty}}` : 'None (Pure Return)'}
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. THREE-COLUMN WORKSPACE (Inputs | Java Editor | Outputs) */}
      {/* ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 260px',
        flex: 1,
        minHeight: 0,
        borderBottom: '1px solid #1e293b'
      }}>
        {/* ------------------------------------------------------------- */}
        {/* LEFT COLUMN: Inputs & Digital Twin Properties Explorer */}
        {/* ------------------------------------------------------------- */}
        <div style={{
          backgroundColor: '#0c1222',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px',
          overflowY: 'auto',
          gap: '14px'
        }}>
          {/* Method Inputs */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>
                Service Inputs ({inputs.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {inputs.map((inp, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    backgroundColor: '#1e293b80',
                    border: '1px solid #334155',
                    borderRadius: '5px',
                    fontSize: '11.5px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleInsertToken(`params.get("${inp.name}")`)}
                    title="Click to insert parameter into code"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    {inp.name}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '2px 5px', borderRadius: '3px' }}>
                      {inp.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInput(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Input */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              <input
                type="text"
                value={newParamName}
                onChange={e => setNewParamName(e.target.value)}
                placeholder="+ parameter name"
                style={{
                  flex: 1,
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  padding: '4px 6px'
                }}
              />
              <select
                value={newParamType}
                onChange={e => setNewParamType(e.target.value)}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#94a3b8',
                  fontSize: '11px',
                  padding: '4px'
                }}
              >
                <option value="number">num</option>
                <option value="string">str</option>
                <option value="boolean">bool</option>
              </select>
              <button
                type="button"
                onClick={handleAddInput}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Digital Twin Properties */}
          <div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>
                Twin Properties
              </span>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                1-click token insert (Zero DB load)
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {availableProperties.map(prop => (
                <button
                  key={prop}
                  type="button"
                  onClick={() => handleInsertToken(`properties.get("${prop}")`)}
                  title={`Insert properties.get("${prop}")`}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    padding: '3px 7px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Database size={10} color="#f59e0b" /> {prop}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CENTER COLUMN: Java Code Editor & Snippet Toolbar */}
        {/* ------------------------------------------------------------- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#070b14',
          minWidth: 0
        }}>
          {/* Quick-Insert Snippets Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            backgroundColor: '#0c1222',
            borderBottom: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Snippets:</span>
              <button
                type="button"
                onClick={() => handleInsertSnippet('MATH')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#8b5cf620',
                  color: '#a78bfa',
                  border: '1px solid #8b5cf640',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Calculator size={11} /> + Math Calc
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('REST')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#3b82f620',
                  color: '#60a5fa',
                  border: '1px solid #3b82f640',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Globe size={11} /> + REST API
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('PLC_READ')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#06b6d420',
                  color: '#22d3ee',
                  border: '1px solid #06b6d440',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Cpu size={11} /> + Read PLC
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('PLC_WRITE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#10b98120',
                  color: '#34d399',
                  border: '1px solid #10b98140',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Cpu size={11} /> + Write PLC
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('THRESHOLD')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#f59e0b20',
                  color: '#fbbf24',
                  border: '1px solid #f59e0b40',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Activity size={11} /> + Guard Check
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Language Switcher Segmented Control */}
              <div style={{ display: 'flex', backgroundColor: '#070b14', borderRadius: '5px', padding: '2px', border: '1px solid #1e293b' }}>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('JAVA')}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: language === 'JAVA' ? '#2563eb' : 'transparent',
                    color: language === 'JAVA' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ☕ Java
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('PYTHON')}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: language === 'PYTHON' ? '#059669' : 'transparent',
                    color: language === 'PYTHON' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🐍 Python
                </button>
              </div>

              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                {language === 'JAVA' ? 'Janino Bytecode < 1µs' : 'PyCode Cache < 150µs'} | Output: {returnType}
              </div>
            </div>
          </div>

          {/* Dynamic Code Area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <textarea
              value={javaCode}
              onChange={e => setJavaCode(e.target.value)}
              placeholder={language === 'JAVA' ? '// Write Java method body...' : '# Write Python method script...'}
              spellCheck={false}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#070b14',
                color: '#f8fafc',
                fontFamily: 'Consolas, "Fira Code", monospace',
                fontSize: '12.5px',
                lineHeight: '1.6',
                border: 'none',
                padding: '14px 16px',
                boxSizing: 'border-box',
                resize: 'none',
                outline: 'none',
                tabSize: 4
              }}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Outputs & Bindings */}
        {/* ------------------------------------------------------------- */}
        <div style={{
          backgroundColor: '#0c1222',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>
              Output Binding
            </span>
          </div>

          <div>
            <label htmlFor={returnTypeFieldId} style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              Return Data Type
            </label>
            <select
              id={returnTypeFieldId}
              value={returnType}
              onChange={e => setReturnType(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                padding: '6px 8px'
              }}
            >
              <option value="NUMBER">NUMBER (double/int)</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="STRING">STRING</option>
              <option value="MAP">OBJECT / MAP</option>
              <option value="VOID">VOID (Side-effects only)</option>
            </select>
          </div>

          <div>
            <label htmlFor={writeBackPropFieldId} style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              Property Write-Back Target
            </label>
            <select
              id={writeBackPropFieldId}
              value={storeResultToProperty}
              onChange={e => setStoreResultToProperty(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f59e0b',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '6px 8px'
              }}
            >
              <option value="">None (Pure method return)</option>
              {availableProperties.map(p => (
                <option key={p} value={p}>this.properties.{p}</option>
              ))}
            </select>
            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
              Updates local RAM twin instantly; flushes to DB asynchronously without latency.
            </div>
          </div>

          <div>
            <label htmlFor={chainedEventFieldId} style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              Chained Event Trigger
            </label>
            <input
              id={chainedEventFieldId}
              type="text"
              value={chainedEvent}
              onChange={e => setChainedEvent(e.target.value)}
              placeholder="e.g. ON_SPEED_UPDATED"
              style={{
                width: '100%',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                padding: '6px 8px',
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div style={{
            marginTop: 'auto',
            padding: '10px',
            backgroundColor: '#1e293b50',
            border: '1px solid #334155',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#94a3b8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600, marginBottom: '3px' }}>
              <Layers size={13} /> Zero-DB Twin Cache
            </div>
            Properties read and written during execution incur 0 SQL load.
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. BOTTOM FULL-WIDTH TEST DOCK & MICROSECOND TRACE TERMINAL */}
      {/* ===================================================================== */}
      <ServiceMethodTestBench
        methodName={methodName}
        inputs={inputs}
        testParams={testParams}
        setTestParams={setTestParams}
        testProperties={testProperties}
        setTestProperties={setTestProperties}
        isExecuting={isExecuting}
        testResult={testResult}
        enableTraceLogs={enableTraceLogs}
        setEnableTraceLogs={setEnableTraceLogs}
        onRunTest={handleRunTest}
      />
    </div>
  );
};
