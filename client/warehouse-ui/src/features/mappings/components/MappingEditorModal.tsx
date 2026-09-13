import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, 
  Zap, 
  Loader2, 
  ShieldCheck 
} from 'lucide-react';
import { 
  dynamicMappingService, 
  ApiIntegrationMappingItem, 
  SchemaDictionary 
} from '../../../services/dynamicMappingService';
import { resourceService, ResourceItem } from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { TokenPalette, DictionaryCategory } from './TokenPalette';
import { MappingTestRunner } from './MappingTestRunner';

export interface MappingEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  initialMapping: ApiIntegrationMappingItem | null;
  resources: ResourceItem[];
  dictionary: SchemaDictionary | null;
  onSuccess: (msg: string) => void;
  onRefresh: () => Promise<void>;
}

export const MappingEditorModal: React.FC<MappingEditorModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  initialMapping,
  resources,
  dictionary,
  onSuccess,
  onRefresh
}) => {
  // Form Fields
  const [formMappingCode, setFormMappingCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formOperationType, setFormOperationType] = useState<string>('PRE_ANNOUNCE');
  const [formTargetResourceId, setFormTargetResourceId] = useState<string>('');
  const [formHttpMethod, setFormHttpMethod] = useState<string>('POST');
  const [formEndpointUrl, setFormEndpointUrl] = useState<string>('/api/v1/orders/pre-announce');
  const [formHeadersTemplate, setFormHeadersTemplate] = useState<string>(
    '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "Bearer <token>"\n}'
  );
  const [formPayloadTemplate, setFormPayloadTemplate] = useState<string>(
    '{\n  "palletId": "{{pallet.lpn}}",\n  "type": "{{pallet.palletType}}",\n  "weightKg": {{pallet.currentWeightKg}},\n  "facilityId": "{{resource.customProperties.facility_code}}",\n  "clientId": "{{resource.customProperties.wms_client_id}}",\n  "timestamp": "{{fn.now}}"\n}'
  );
  const [formActive, setFormActive] = useState<boolean>(true);

  // Field Palette Category Tab
  const [activeDictionaryTab, setActiveDictionaryTab] = useState<DictionaryCategory>('pallet');
  const payloadTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview State
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Test Context State
  const [testVariablesJson, setTestVariablesJson] = useState<string>(
    '{\n  "palletId": "PAL-9901",\n  "orderId": "ORD-5001",\n  "status": "ACTIVE"\n}'
  );
  const [showVariablesEditor, setShowVariablesEditor] = useState<boolean>(true);

  // Test Run State
  const [testRunResult, setTestRunResult] = useState<any>(null);
  const [isTestRunLoading, setIsTestRunLoading] = useState<boolean>(false);
  const [testRunError, setTestRunError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Resource Auth State
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Extract variable tokens from URL (e.g. {palletId} or {{palletId}})
  const extractVariablesFromText = (text: string): string[] => {
    const vars = new Set<string>();
    if (!text) return [];
    const singleMatches = text.matchAll(/(?<!\{)\{([a-zA-Z0-9_.-]+)\}(?!\})/g);
    for (const m of singleMatches) {
      if (m[1]) vars.add(m[1].trim());
    }
    const doubleMatches = text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)(?:\s*\|[^}]+)?\s*\}\}/g);
    for (const m of doubleMatches) {
      if (m[1] && !m[1].startsWith('fn.')) {
        vars.add(m[1].trim());
      }
    }
    return Array.from(vars);
  };

  // Dynamic sample variable fallback without hardcoded year
  const getSampleValueForVar = (name: string): any => {
    const lower = name.toLowerCase();
    const currentYear = new Date().getFullYear();
    if (lower.includes('pallet')) return 'PAL-9901';
    if (lower.includes('order')) return 'ORD-5001';
    if (lower.includes('item') || lower.includes('sku') || lower.includes('material')) return 'MAT-1001';
    if (lower.includes('qty') || lower.includes('quantity') || lower.includes('count')) return 10;
    if (lower.includes('weight')) return 500.0;
    if (lower.includes('status')) return 'ACTIVE';
    if (lower.includes('type')) return 'STANDARD';
    if (lower.includes('facility') || lower.includes('warehouse')) return 'WH-MAIN';
    if (lower.includes('batch') || lower.includes('lot')) return `BAT-${currentYear}`;
    if (lower.includes('line')) return 1;
    if (lower.includes('id')) return '1001';
    if (lower.includes('code')) return 'CODE-01';
    if (lower.includes('user')) return 'USER-01';
    return `TEST_${name.toUpperCase()}`;
  };

  const buildContextFromUrl = (url: string, mergeWithExisting?: boolean, currentJson?: string): string => {
    const urlVars = extractVariablesFromText(url);
    const existing: Record<string, any> = {};
    if (mergeWithExisting && currentJson) {
      try {
        const parsed = JSON.parse(currentJson);
        if (parsed && typeof parsed === 'object') {
          Object.assign(existing, parsed);
        }
      } catch { }
    }

    const result: Record<string, any> = {};
    if (urlVars.length > 0) {
      for (const v of urlVars) {
        if (existing[v] !== undefined) {
          result[v] = existing[v];
        } else {
          result[v] = getSampleValueForVar(v);
        }
      }
      if (mergeWithExisting) {
        for (const [k, val] of Object.entries(existing)) {
          if (result[k] === undefined) {
            result[k] = val;
          }
        }
      }
    } else {
      if (mergeWithExisting && Object.keys(existing).length > 0) {
        Object.assign(result, existing);
      } else {
        result["status"] = "ACTIVE";
      }
    }
    return JSON.stringify(result, null, 2);
  };

  const detectedUrlVars = useMemo(() => {
    return extractVariablesFromText(formEndpointUrl);
  }, [formEndpointUrl]);

  // Check resource authentication status
  const checkResourceAuth = async (targetResId: string) => {
    if (!targetResId) return;
    try {
      await resourceService.getResourceTokenStatus(targetResId);
    } catch {
      // Ignored
    }
  };

  const handleAuthResource = async () => {
    if (!formTargetResourceId) return;
    setIsAuthenticating(true);
    try {
      const res = await resourceService.authorizeResource(formTargetResourceId);
      if (res.success) {
        onSuccess(`Resource '${formTargetResourceId}' authenticated! Real token stored in WES memory.`);
      } else {
        setTestRunError(`Auth failed for ${formTargetResourceId}: ${res.error || res.message}`);
      }
    } catch (err: any) {
      setTestRunError(`Auth error: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Initialize form state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && initialMapping) {
      setFormMappingCode(initialMapping.mappingCode);
      setFormName(initialMapping.name);
      setFormDescription(initialMapping.description || '');
      setFormOperationType(initialMapping.operationType);
      setFormTargetResourceId(initialMapping.targetResourceId);
      setFormHttpMethod(initialMapping.httpMethod);
      setFormEndpointUrl(initialMapping.endpointUrl);
      setFormHeadersTemplate(
        typeof initialMapping.headersTemplate === 'string'
          ? initialMapping.headersTemplate
          : JSON.stringify(initialMapping.headersTemplate, null, 2)
      );
      setFormPayloadTemplate(
        typeof initialMapping.payloadTemplate === 'string'
          ? initialMapping.payloadTemplate
          : JSON.stringify(initialMapping.payloadTemplate, null, 2)
      );
      setFormActive(initialMapping.active);
      setPreviewResult(null);
      setPreviewError(null);
      setTestRunResult(null);
      setTestRunError(null);
      checkResourceAuth(initialMapping.targetResourceId);
    } else {
      const defaultResource = resources.length > 0 ? resources[0].resourceId : '';
      setFormMappingCode(`MAP_${Date.now().toString().slice(-6)}`);
      setFormName('Custom Pre-Announce Mapping');
      setFormDescription('Dynamic template mapping for WMS outbound pre-announce payload');
      setFormOperationType('PRE_ANNOUNCE');
      setFormTargetResourceId(defaultResource);
      setFormHttpMethod('POST');
      setFormEndpointUrl('/api/v1/orders/pre-announce');
      setFormHeadersTemplate('{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "Bearer <token>"\n}');
      setFormPayloadTemplate('{\n  "palletId": "{{pallet.lpn}}",\n  "type": "{{pallet.palletType}}",\n  "weightKg": {{pallet.currentWeightKg}},\n  "facilityId": "{{resource.customProperties.facility_code}}",\n  "clientId": "{{resource.customProperties.wms_client_id}}",\n  "timestamp": "{{fn.now}}"\n}');
      setFormActive(true);
      setPreviewResult(null);
      setPreviewError(null);
      setTestRunResult(null);
      setTestRunError(null);
      checkResourceAuth(defaultResource);
    }
  }, [isOpen, isEditing, initialMapping, resources]);

  // Insert token chip into payload textarea at cursor position
  const handleInsertToken = (token: string) => {
    const placeholder = `{{${token}}}`;
    const textarea = payloadTextareaRef.current;
    if (!textarea) {
      setFormPayloadTemplate(prev => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formPayloadTemplate;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    setFormPayloadTemplate(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 50);
  };

  // Live Preview Payload & Endpoint URL Resolution
  const handleLivePreview = async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);
    try {
      let parsedContext: Record<string, any> | undefined = undefined;
      if (testVariablesJson && testVariablesJson.trim()) {
        try {
          parsedContext = JSON.parse(testVariablesJson.trim());
        } catch (err: any) {
          setPreviewError(`Invalid Test Context JSON: ${err.message}`);
          setIsPreviewLoading(false);
          return;
        }
      }

      const cleanEndpoint = formEndpointUrl.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, '').trim();

      const res = await dynamicMappingService.previewPayload({
        resourceId: formTargetResourceId || undefined,
        endpointUrl: cleanEndpoint,
        payloadTemplate: formPayloadTemplate,
        testContext: parsedContext
      });

      if (res.success) {
        try {
          const parsed = JSON.parse(res.resolvedPayload);
          setPreviewResult(JSON.stringify(parsed, null, 2));
        } catch {
          setPreviewResult(res.resolvedPayload);
        }
      } else {
        setPreviewError('Failed to resolve dynamic tokens.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Preview generation failed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Dry-run / Test Run API
  const handleTestRun = async () => {
    setIsTestRunLoading(true);
    setTestRunError(null);
    setTestRunResult(null);
    try {
      let parsedContext: Record<string, any> | undefined = undefined;
      if (testVariablesJson && testVariablesJson.trim()) {
        try {
          parsedContext = JSON.parse(testVariablesJson.trim());
        } catch (err: any) {
          setTestRunError(`Invalid Test Context JSON: ${err.message}`);
          setIsTestRunLoading(false);
          return;
        }
      }

      const cleanEndpoint = formEndpointUrl.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, '').trim();

      const res = await dynamicMappingService.testRun({
        resourceId: formTargetResourceId || undefined,
        httpMethod: formHttpMethod,
        endpointUrl: cleanEndpoint,
        headersTemplate: formHeadersTemplate,
        payloadTemplate: formPayloadTemplate,
        testContext: parsedContext
      });
      setTestRunResult(res);
    } catch (err: any) {
      setTestRunError(err.message || 'Test run failed');
    } finally {
      setIsTestRunLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Handle Save
  const handleSave = async () => {
    if (!formMappingCode.trim() || !formName.trim() || !formEndpointUrl.trim()) {
      alert('Mapping Code, Name, and Endpoint URL are required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<ApiIntegrationMappingItem> = {
        mappingCode: formMappingCode.trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        operationType: formOperationType,
        targetResourceId: formTargetResourceId.trim(),
        httpMethod: formHttpMethod,
        endpointUrl: formEndpointUrl.trim(),
        headersTemplate: formHeadersTemplate.trim(),
        payloadTemplate: formPayloadTemplate.trim(),
        conditionRules: '[]',
        active: formActive
      };

      if (isEditing && initialMapping?.id) {
        await dynamicMappingService.updateMapping(initialMapping.id, payload);
        onSuccess(`Mapping '${formMappingCode}' updated successfully`);
      } else {
        await dynamicMappingService.createMapping(payload);
        onSuccess(`Mapping '${formMappingCode}' created successfully`);
      }

      onClose();
      await onRefresh();
    } catch (err: any) {
      alert(`Error saving mapping: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Network size={20} color="var(--color-primary-600, #4F46E5)" />
          <span>{isEditing ? `Edit Mapping: ${formMappingCode}` : 'Create New API Mapping'}</span>
        </div>
      }
      subtitle="Define dynamic placeholders like {{pallet.lpn}} or {{resource.customProperties.clientID}}"
      maxWidth="1200px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Mapping'}
          </Button>
        </div>
      }
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(380px, 1fr)',
        gap: '24px'
      }}>
        {/* Left Column: Form & Payload Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Basic Meta Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Mapping Code *
              </label>
              <input
                type="text"
                disabled={isEditing}
                value={formMappingCode}
                onChange={(e) => setFormMappingCode(e.target.value)}
                placeholder="e.g. LOGIQS_PREANNOUNCE"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Mapping Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Logiqs Ambient Pre-Announce"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Resource & Operation Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 100px', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Target Resource *
                </label>
                {formTargetResourceId && (
                  <button
                    type="button"
                    onClick={handleAuthResource}
                    disabled={isAuthenticating}
                    title="Authenticate against resource using configured properties"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-600, #2563EB)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    {isAuthenticating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                    <span>{isAuthenticating ? 'Authenticating...' : 'Authenticate'}</span>
                  </button>
                )}
              </div>
              <select
                value={formTargetResourceId}
                onChange={(e) => {
                  setFormTargetResourceId(e.target.value);
                  checkResourceAuth(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Select Target System --</option>
                {resources.map(r => (
                  <option key={r.resourceId} value={r.resourceId}>
                    {r.resourceId} ({r.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Operation Type *
              </label>
              <select
                value={formOperationType}
                onChange={(e) => setFormOperationType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="PRE_ANNOUNCE">PRE_ANNOUNCE</option>
                <option value="PALLET_STATUS_QUERY">PALLET_STATUS_QUERY</option>
                <option value="LOAD_CONFIRMATION">LOAD_CONFIRMATION</option>
                <option value="ROUTE_OPTIMIZATION">ROUTE_OPTIMIZATION</option>
                <option value="FAULT_NOTIFICATION">FAULT_NOTIFICATION</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Active *
              </label>
              <select
                value={formActive ? 'YES' : 'NO'}
                onChange={(e) => setFormActive(e.target.value === 'YES')}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="YES">Active</option>
                <option value="NO">Inactive</option>
              </select>
            </div>
          </div>

          {/* HTTP Method & Endpoint URL */}
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                HTTP Method
              </label>
              <select
                value={formHttpMethod}
                onChange={(e) => setFormHttpMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Endpoint URL Path *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {['{palletId}', '{orderId}'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const clean = formEndpointUrl.replace(/\/+$/, '');
                        const newUrl = `${clean}/${v}`;
                        setFormEndpointUrl(newUrl);
                        setTestVariablesJson(buildContextFromUrl(newUrl, true, testVariablesJson));
                      }}
                      style={{
                        border: '1px solid var(--border-default)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: '#38BDF8',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(56, 189, 248, 0.08)'
                      }}
                      title={`Append ${v} to URL path & sync variable`}
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formEndpointUrl}
                onChange={(e) => {
                  let val = e.target.value;
                  const match = val.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.*)$/i);
                  if (match) {
                    setFormHttpMethod(match[1].toUpperCase());
                    val = match[2];
                  }
                  setFormEndpointUrl(val);
                }}
                placeholder="/api/v1/entities/{id}/status"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Supports dynamic path variables like <code>&#123;id&#125;</code> and query parameters like <code>?status=&#123;status&#125;</code>.
              </div>
            </div>
          </div>

          {/* Dynamic Field Palette */}
          <TokenPalette
            dictionary={dictionary}
            activeTab={activeDictionaryTab}
            onTabChange={setActiveDictionaryTab}
            onInsertToken={handleInsertToken}
          />

          {/* Payload Template Editor */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                JSON Payload Template (Must be valid JSON after token substitution)
              </label>
            </div>
            <textarea
              ref={payloadTextareaRef}
              rows={9}
              value={formPayloadTemplate}
              onChange={(e) => setFormPayloadTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: '#0F172A',
                color: '#38BDF8',
                fontSize: '12px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineHeight: '1.5',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Headers Template */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Headers Template (JSON format)
            </label>
            <textarea
              rows={3}
              value={formHeadersTemplate}
              onChange={(e) => setFormHeadersTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: '#0F172A',
                color: '#94A3B8',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} />
              <span>Backend automatically replaces &apos;&lt;token&gt;&apos; with the live Bearer token.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Evaluation & Dry Run Inspector */}
        <MappingTestRunner
          testVariablesJson={testVariablesJson}
          setTestVariablesJson={setTestVariablesJson}
          showVariablesEditor={showVariablesEditor}
          setShowVariablesEditor={setShowVariablesEditor}
          detectedUrlVars={detectedUrlVars}
          formEndpointUrl={formEndpointUrl}
          buildContextFromUrl={buildContextFromUrl}
          handleLivePreview={handleLivePreview}
          isPreviewLoading={isPreviewLoading}
          previewResult={previewResult}
          previewError={previewError}
          handleTestRun={handleTestRun}
          isTestRunLoading={isTestRunLoading}
          testRunResult={testRunResult}
          testRunError={testRunError}
          copiedText={copiedText}
          copyToClipboard={copyToClipboard}
        />
      </div>
    </Modal>
  );
};
