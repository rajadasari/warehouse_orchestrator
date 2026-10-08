import React, { useState, useEffect, useMemo } from 'react';
import { 
  Code2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Zap,
  Info
} from 'lucide-react';
import { ResourceItem, executeResourceMethodApi } from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JsonViewer } from '../../../components/common/JsonViewer';

export interface ResourceCodeMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  onSuccess?: (msg: string) => void;
  onRefresh?: () => Promise<void>;
}

export interface CodeMethodSummary {
  name: string;
  displayName?: string;
  language?: string;
  script?: string;
}

export const ResourceCodeMethodModal: React.FC<ResourceCodeMethodModalProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  if (!resource) return null;

  const [selectedMethodName, setSelectedMethodName] = useState<string>('');
  const [paramsInput, setParamsInput] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<{
    success: boolean;
    message: string;
    executionTimeMs?: number;
    statusCode?: number;
    data?: unknown;
    error?: string;
  } | null>(null);

  // Extract available code methods from resource's methodsConfig and effectiveMethods
  const availableMethods = useMemo<CodeMethodSummary[]>(() => {
    const list: CodeMethodSummary[] = [];
    const seen = new Set<string>();

    const cfg = (resource.methodsConfig || {}) as Record<string, unknown>;
    Object.keys(cfg).forEach(k => {
      seen.add(k);
      const val = cfg[k] as Record<string, unknown> | undefined;
      list.push({
        name: k,
        displayName: (val?.displayName as string) || k,
        language: (val?.language as string) || 'JAVA',
        script: (val?.script as string) || (val?.javaCode as string) || (val?.pythonCode as string) || ''
      });
    });

    if (Array.isArray(resource.effectiveMethods)) {
      resource.effectiveMethods.forEach((m: Record<string, unknown>) => {
        const name = String(m.name || '');
        if (name && !seen.has(name)) {
          seen.add(name);
          list.push({
            name,
            displayName: (m.displayName as string) || name,
            language: (m.language as string) || 'JAVA',
            script: (m.script as string) || (m.javaCode as string) || (m.pythonCode as string) || ''
          });
        }
      });
    }

    return list;
  }, [resource]);

  // Reset state when switching resources
  useEffect(() => {
    setSelectedMethodName(availableMethods[0]?.name || '');
    setExecResult(null);
    setParamsInput('{}');
  }, [resource?.resourceId]);

  useEffect(() => {
    if (availableMethods.length > 0) {
      if (!selectedMethodName || !availableMethods.some(m => m.name === selectedMethodName)) {
        setSelectedMethodName(availableMethods[0].name);
      }
    } else {
      setSelectedMethodName('');
    }
  }, [availableMethods, selectedMethodName]);

  const activeMethod = availableMethods.find(m => m.name === selectedMethodName) || availableMethods[0];

  const handleExecute = async () => {
    if (!resource || !selectedMethodName) return;

    let parsedParams: Record<string, unknown> = {};
    try {
      if (paramsInput.trim()) {
        parsedParams = JSON.parse(paramsInput);
      }
    } catch {
      setExecResult({
        success: false,
        message: 'Invalid JSON format in Parameters input.',
        error: 'JSON parse error in parameters payload'
      });
      return;
    }

    setIsExecuting(true);
    setExecResult(null);

    try {
      const res = await executeResourceMethodApi(resource.resourceId, selectedMethodName, parsedParams);
      setExecResult({
        success: res.success,
        message: res.message || (res.success ? 'Execution succeeded' : 'Execution failed'),
        executionTimeMs: res.executionTimeMs,
        statusCode: res.statusCode,
        data: res.data,
        error: res.error
      });
    } catch (err: unknown) {
      setExecResult({
        success: false,
        message: err instanceof Error ? err.message : 'Execution error',
        error: String(err)
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={18} color="#10B981" />
          <span>Java & Python Services Execution</span>
        </div>
      }
      subtitle={`Resource: ${resource.resourceId} (${resource.name}) - Category: ${(resource.category || 'PHYSICAL').toUpperCase()}`}
      maxWidth="720px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <Info size={13} />
            <span>Executes dynamic script logic in isolated runner environment.</span>
          </div>
          <Button variant="secondary" onClick={onClose} disabled={isExecuting}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Informational banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        }}>
          <Code2 size={16} color="#10B981" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            This resource executes <strong>Java</strong> or <strong>Python</strong> code-based services. Select a service below to dry-run logic against runtime properties.
          </div>
        </div>

        {/* Service Selection Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Select Target Service
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {availableMethods.length > 0 ? (
              <select
                value={selectedMethodName}
                onChange={e => {
                  setSelectedMethodName(e.target.value);
                  setExecResult(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace'
                }}
              >
                {availableMethods.map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name} {m.displayName ? `(${m.displayName})` : ''} [{m.language || 'JAVA'}]
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Enter service name (e.g. COMPUTE_LOAD)"
                value={selectedMethodName}
                onChange={e => setSelectedMethodName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace'
                }}
              />
            )}

            {activeMethod && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: activeMethod.language === 'PYTHON' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: activeMethod.language === 'PYTHON' ? '#10B981' : '#3B82F6'
              }}>
                {activeMethod.language === 'PYTHON' ? <Zap size={11} /> : <Code2 size={11} />}
                {activeMethod.language || 'JAVA'}
              </span>
            )}
          </div>
        </div>

        {/* Script Preview (if configured) */}
        {activeMethod?.script && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Script Source Preview
            </span>
            <pre style={{
              margin: 0,
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: '#0F172A',
              color: '#38BDF8',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              maxHeight: '130px',
              overflowY: 'auto'
            }}>
              {activeMethod.script}
            </pre>
          </div>
        )}

        {/* Parameter JSON Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Execution Parameters (JSON)
          </label>
          <textarea
            rows={3}
            value={paramsInput}
            onChange={e => setParamsInput(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-page)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        {/* Action Button */}
        <div>
          <Button
            variant="primary"
            leftIcon={isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            onClick={handleExecute}
            disabled={isExecuting || !selectedMethodName.trim()}
            style={{ width: '100%', minHeight: '38px' }}
          >
            {isExecuting ? 'Executing Dynamic Method...' : `Run ${selectedMethodName || 'Method'}`}
          </Button>
        </div>

        {/* Execution Result Box */}
        {execResult && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: execResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${execResult.success ? '#10B981' : '#EF4444'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {execResult.success ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: execResult.success ? '#10B981' : '#EF4444' }}>
                  {execResult.success ? 'Method Executed Successfully' : 'Execution Failed'}
                </span>
              </div>
              {execResult.executionTimeMs !== undefined && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} /> {execResult.executionTimeMs} ms
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {execResult.message}
            </p>

            {execResult.data !== undefined && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Result Payload:
                </span>
                <JsonViewer data={execResult.data} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
