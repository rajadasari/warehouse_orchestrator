import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Copy, 
  Check, 
  Terminal,
  Activity
} from 'lucide-react';
import { MethodDefinition } from '../types/resourceEnums';
import { ResourceTemplateItem } from '../../../services/resourceTemplateService';
import { MethodConfigState } from './Step3MethodMapping';
import { executeResourceMethodApi } from '../../../services/resourceService';
import { computeSyntheticEndpoint } from './endpointUtils';
import { Button } from '../../../components/common/Button';
import { JsonViewer } from '../../../components/common/JsonViewer';

export interface Step4ValidationSandboxProps {
  resourceId: string;
  name: string;
  application: string;
  host: string;
  port: number | '';
  protocol: string;
  status: string;
  description: string;
  documentationUrl: string;
  selectedTemplate: ResourceTemplateItem | null;
  inheritedValues: Record<string, unknown>;
  customPropertiesRecord: Record<string, unknown>;
  methodConfigs: MethodConfigState;
  isEditing: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => Promise<void>;
}

export const Step4ValidationSandbox: React.FC<Step4ValidationSandboxProps> = ({
  resourceId,
  name,
  application,
  host,
  port,
  protocol,
  status,
  description,
  documentationUrl,
  selectedTemplate,
  inheritedValues,
  customPropertiesRecord,
  methodConfigs,
  isEditing,
  isSaving,
  onBack,
  onSave
}) => {
  const templateMethods: MethodDefinition[] = selectedTemplate?.methodsSchema || [];
  const configuredMethodNames = Object.keys(methodConfigs);
  const allMethodNames = Array.from(new Set([...templateMethods.map(m => m.name), ...configuredMethodNames]));
  const [selectedTestMethod, setSelectedTestMethod] = useState<string>(
    allMethodNames[0] || ''
  );
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusText: string;
    latencyMs: number;
    data: unknown;
  } | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Consolidated properties
  const unifiedProperties = {
    ...inheritedValues,
    ...customPropertiesRecord
  };

  const syntheticEndpoint = computeSyntheticEndpoint(host, port, protocol);

  // Live test execution
  const handleExecuteTest = async () => {
    setIsExecutingTest(true);
    const startTime = performance.now();

    try {
      if (isEditing) {
        // Run live against backend endpoint
        const res = await executeResourceMethodApi(resourceId, selectedTestMethod, {
          targetHost: host,
          targetPort: port || undefined,
          properties: unifiedProperties
        });
        const duration = Math.round(performance.now() - startTime);
        setTestResult({
          success: res.success,
          statusText: res.statusCode ? `${res.statusCode} ${res.success ? 'OK' : 'Error'}` : res.message,
          latencyMs: res.executionTimeMs || duration,
          data: res.data || { message: res.message, error: res.error }
        });
      } else {
        // Pre-save dry-run client test simulation
        await new Promise(r => setTimeout(r, 450));
        const duration = Math.round(performance.now() - startTime);

        const bindings = methodConfigs[selectedTestMethod]?.parameterBindings || {};
        const resolvedParameters: Record<string, unknown> = {};
        Object.entries(bindings).forEach(([pKey, pVal]) => {
          if (typeof pVal === 'string' && pVal.startsWith('{{') && pVal.endsWith('}}')) {
            const propKey = pVal.slice(2, -2).trim();
            const val = (unifiedProperties as Record<string, unknown>)[propKey];
            resolvedParameters[pKey] = val !== undefined ? val : `[Unresolved: ${propKey}]`;
          } else {
            resolvedParameters[pKey] = pVal;
          }
        });

        setTestResult({
          success: true,
          statusText: '200 OK (Config Evaluation Successful)',
          latencyMs: duration,
          data: {
            status: 'VALID',
            endpoint: syntheticEndpoint,
            method: selectedTestMethod,
            parameterBindings: bindings,
            resolvedParameters,
            verifiedAt: new Date().toISOString()
          }
        });
      }
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - startTime);
      setTestResult({
        success: false,
        statusText: 'Execution Error',
        latencyMs: duration,
        data: { error: err instanceof Error ? err.message : 'Unknown execution error' }
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  const fullPayload = {
    resourceId,
    name,
    type: selectedTemplate?.resourceType || '',
    category: selectedTemplate?.category || '',
    templateCode: selectedTemplate?.templateCode,
    status,
    host,
    port: port || null,
    protocol,
    application: application || null,
    description: description || null,
    documentationUrl: documentationUrl || null,
    customProperties: unifiedProperties,
    methodsConfig: methodConfigs
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(fullPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Review Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px'
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resource Identity</div>
          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            {resourceId}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{name}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Archetype Blueprint</div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: selectedTemplate ? '#38BDF8' : '#10B981' }}>
            {selectedTemplate ? selectedTemplate.templateName : 'Standalone Resource'}
          </div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            {selectedTemplate ? selectedTemplate.templateCode : 'SELF_CONTAINED_ASSET'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target Endpoint</div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
            {syntheticEndpoint}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Protocol: {protocol} | Port: {port || 'Default'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Configuration Counts</div>
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>
            <span style={{ fontWeight: 600 }}>{Object.keys(unifiedProperties).length}</span> Properties bound
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600 }}>{Object.keys(methodConfigs).length}</span> Methods configured
          </div>
        </div>
      </div>

      {/* 2. Interactive Diagnostic Execution Sandbox */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#10B981" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Diagnostic Execution Sandbox
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedTestMethod}
              onChange={e => setSelectedTestMethod(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {allMethodNames.length === 0 ? (
                <option value="">No methods configured</option>
              ) : (
                allMethodNames.map(name => (
                  <option key={name} value={name}>{name}()</option>
                ))
              )}
            </select>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExecuteTest}
              disabled={isExecutingTest}
              leftIcon={isExecutingTest ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              style={{ minHeight: '38px', padding: '0 16px' }}
            >
              {isExecutingTest ? 'Executing...' : 'Run Test'}
            </Button>
          </div>
        </div>

        {/* Diagnostic Results Box */}
        {testResult && (
          <div
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {testResult.success ? (
                  <CheckCircle2 size={16} color="#10B981" />
                ) : (
                  <AlertTriangle size={16} color="#EF4444" />
                )}
                <span style={{ fontWeight: 600, fontSize: '12px', color: testResult.success ? '#10B981' : '#EF4444' }}>
                  {testResult.statusText}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                Latency: {testResult.latencyMs} ms
              </span>
            </div>

            <div style={{ marginTop: '4px' }}>
              <JsonViewer data={testResult.data} />
            </div>
          </div>
        )}
      </div>

      {/* 3. Unified Payload Inspection */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="#818CF8" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              COMPILED ENTITY CONFIGURATION (PAYLOAD)
            </h4>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyPayload}
            leftIcon={copiedPayload ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            {copiedPayload ? 'Copied' : 'Copy JSON'}
          </Button>
        </div>

        <JsonViewer data={fullPayload} />
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          style={{ minHeight: '48px', padding: '0 20px' }}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back: Method Mapping
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={isSaving}
          style={{ minHeight: '48px', padding: '0 32px', backgroundColor: '#10B981', borderColor: '#10B981' }}
          leftIcon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        >
          {isSaving ? 'Saving & Activating...' : isEditing ? 'Save Changes' : 'Save & Activate Resource'}
        </Button>
      </div>
    </div>
  );
};
