import React, { useState, useEffect, useMemo } from 'react';
import { Globe, Plus, Trash2, ExternalLink, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  resourceService, 
  ResourceItem, 
  CreateResourcePayload 
} from '../../../services/resourceService';
import { 
  fetchResourceTemplatesApi, 
  ResourceTemplateItem 
} from '../../../services/resourceTemplateService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { SoftwareAuthFormSection, SoftwarePropRow } from './SoftwareAuthFormSection';
import { TemplatePropertiesFormSection } from './TemplatePropertiesFormSection';

export interface CreateEditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  initialData?: ResourceItem | null;
  defaultType?: string;
  onSuccess: (msg: string) => void;
  onRefresh: () => Promise<void>;
}

export const CreateEditResourceModal: React.FC<CreateEditResourceModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  initialData,
  defaultType = 'REST_GENERIC',
  onSuccess,
  onRefresh
}) => {
  const [formResourceId, setFormResourceId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formApplication, setFormApplication] = useState<string>('WMS');
  const [formProtocol, setFormProtocol] = useState<string>('');
  const [formHost, setFormHost] = useState<string>('');
  const [formPort, setFormPort] = useState<number | ''>('');
  const [formDocumentationUrl, setFormDocumentationUrl] = useState<string>('');
  const [formType, setFormType] = useState<string>('PHYSICAL_ASSET');
  const [formCategory, setFormCategory] = useState<string>('GENERAL');
  const [formTemplateCode, setFormTemplateCode] = useState<string>('REST_API_GENERIC');
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');

  // Templates list
  const [availableTemplates, setAvailableTemplates] = useState<ResourceTemplateItem[]>([]);
  const [templateProps, setTemplateProps] = useState<Record<string, unknown>>({});

  // Software auth configuration
  const [formAuthMethod, setFormAuthMethod] = useState<string>('OAUTH2_BEARER');
  const [formTokenPath, setFormTokenPath] = useState<string>('/WMS.Api/api/authentication');
  const [formTokenResponseField, setFormTokenResponseField] = useState<string>('accessToken');
  const [formApiKeyHeader, setFormApiKeyHeader] = useState<string>('X-API-KEY');
  const [formApiKeyValue, setFormApiKeyValue] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');

  // Software dynamic properties
  const [softwareProps, setSoftwareProps] = useState<SoftwarePropRow[]>([
    { key: 'clientId', value: '', isSecret: false, useForAuth: true },
    { key: 'clientSecret', value: '', isSecret: true, useForAuth: true }
  ]);

  // Non-software custom properties
  const [customPropRows, setCustomPropRows] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTestingMethod, setIsTestingMethod] = useState<boolean>(false);
  const [methodTestResult, setMethodTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load templates on modal open
  useEffect(() => {
    if (!isOpen) return;
    fetchResourceTemplatesApi()
      .then(tpls => {
        setAvailableTemplates(tpls);
        if (!isEditing && !formTemplateCode && tpls.length > 0) {
          const defaultTpl = tpls.find(t => t.templateCode === 'REST_API_GENERIC') || tpls[0];
          handleSelectTemplateCode(defaultTpl.templateCode);
        }
      })
      .catch(err => console.error('Failed to load templates in modal:', err));
  }, [isOpen]);

  // Initialize or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && initialData) {
      setFormResourceId(initialData.resourceId);
      setFormName(initialData.name);
      setFormDescription(initialData.description || '');
      setFormApplication(initialData.application || 'WMS');
      setFormProtocol(initialData.protocol || 'http');
      setFormHost(initialData.host || initialData.ip || '127.0.0.1');
      setFormPort(initialData.port || 8080);
      setFormDocumentationUrl(initialData.documentationUrl || '');
      setFormType(initialData.type || 'REST_GENERIC');
      setFormCategory(initialData.category || 'GENERAL');
      setFormTemplateCode(initialData.templateCode || '');
      setFormStatus(initialData.status || 'ACTIVE');
      setTemplateProps(initialData.templateProperties || {});

      const props = initialData.customProperties || {};
      const methodsCfg = initialData.methodsConfig || {};
      const authConfig = (methodsCfg.AUTHENTICATE && typeof methodsCfg.AUTHENTICATE === 'object') 
        ? (methodsCfg.AUTHENTICATE as Record<string, unknown>) 
        : ((props.auth && typeof props.auth === 'object') ? (props.auth as Record<string, unknown>) : {});

      const detectedMethod = authConfig.strategy || authConfig.method || props.authMethod || 
        ((props.clientId || props.clientSecret) ? 'OAUTH2_BEARER' : 'NONE');
      setFormAuthMethod(String(detectedMethod));
      setFormTokenPath(String(props.tokenPath || authConfig.tokenPath || '/WMS.Api/api/authentication'));
      setFormTokenResponseField(String(props.tokenResponseField || authConfig.tokenResponseField || 'accessToken'));
      setFormApiKeyHeader(String(props.apiKeyHeader || authConfig.apiKeyHeader || authConfig.header || 'X-API-KEY'));
      setFormApiKeyValue(String(props.apiKeyValue || authConfig.apiKeyValue || authConfig.keyValue || ''));
      setFormUsername(String(props.username || authConfig.username || ''));
      setFormPassword(String(props.password || authConfig.password || ''));

      // Populate softwareProps table
      const swRows: SoftwarePropRow[] = [];
      if (Array.isArray(props.properties)) {
        props.properties.forEach((p: unknown) => {
          if (p && typeof p === 'object' && 'key' in p) {
            const item = p as { key: string; value: unknown; isSecret?: boolean; useForAuth?: boolean };
            swRows.push({
              key: item.key,
              value: item.value !== undefined ? String(item.value) : '',
              isSecret: Boolean(item.isSecret),
              useForAuth: Boolean(item.useForAuth)
            });
          }
        });
      } else {
        if (props.clientId) swRows.push({ key: 'clientId', value: String(props.clientId), isSecret: false, useForAuth: true });
        if (props.clientSecret) swRows.push({ key: 'clientSecret', value: String(props.clientSecret), isSecret: true, useForAuth: true });
      }
      setSoftwareProps(swRows.length > 0 ? swRows : [
        { key: '', value: '', isSecret: false, useForAuth: false }
      ]);

      // Populate customPropRows for non-software
      const nonSwRows: Array<{ key: string; value: string }> = [];
      Object.entries(props).forEach(([k, v]) => {
        if (!['auth', 'authMethod', 'tokenPath', 'tokenResponseField', 'properties', 'clientId', 'clientSecret', 'ip', 'host', 'port', 'protocol'].includes(k)) {
          nonSwRows.push({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
        }
      });
      setCustomPropRows(nonSwRows.length > 0 ? nonSwRows : [{ key: '', value: '' }]);

    } else {
      // Create Mode
      setFormResourceId('');
      setFormName('');
      setFormDescription('');
      setFormApplication('GENERIC_REST_APP');
      setFormProtocol('http');
      setFormHost('127.0.0.1');
      setFormPort(8080);
      setFormDocumentationUrl('/docs/apps/generic-rest.html');
      setFormType(defaultType);
      setFormCategory('GENERAL');
      setFormTemplateCode('REST_API_GENERIC');
      setFormStatus('ACTIVE');
      setTemplateProps({});
      setFormAuthMethod('OAUTH2_BEARER');
      setFormTokenPath('/WMS.Api/api/authentication');
      setFormTokenResponseField('accessToken');
      setFormApiKeyHeader('X-API-KEY');
      setFormApiKeyValue('');
      setFormUsername('');
      setFormPassword('');
      setCustomPropRows([{ key: '', value: '' }]);
      setSoftwareProps([
        { key: 'clientId', value: '', isSecret: false, useForAuth: true },
        { key: 'clientSecret', value: '', isSecret: true, useForAuth: true }
      ]);
    }
  }, [isOpen, isEditing, initialData, defaultType]);

  // Handle template selection and auto-configuration
  const handleSelectTemplateCode = (code: string) => {
    setFormTemplateCode(code);
    if (!code) return;

    const tpl = availableTemplates.find(t => t.templateCode === code);
    if (tpl) {
      setFormCategory(tpl.category || 'GENERAL');
      setFormType(tpl.resourceType);
      if (!formName) setFormName(tpl.templateName);
      if (!formDescription && tpl.description) setFormDescription(tpl.description);
      if (tpl.application) setFormApplication(tpl.application);
      if (tpl.defaultProtocol) setFormProtocol(tpl.defaultProtocol);
      if (tpl.defaultHost) setFormHost(tpl.defaultHost);
      if (tpl.defaultPort) setFormPort(tpl.defaultPort);
      if (tpl.documentationUrl) setFormDocumentationUrl(tpl.documentationUrl);

      // Populate default properties from schema
      const initialProps: Record<string, unknown> = { ...(tpl.defaultProperties || {}) };
      if (tpl.propertySchema) {
        tpl.propertySchema.forEach(item => {
          if (item.defaultValue !== undefined && initialProps[item.key] === undefined) {
            initialProps[item.key] = item.defaultValue;
          }
        });
      }
      setTemplateProps(initialProps);
    }
  };

  const handleTemplatePropChange = (key: string, value: unknown) => {
    setTemplateProps(prev => ({ ...prev, [key]: value }));
  };

  // Live Synthesized Base URL
  const synthesizedBaseUrl = useMemo(() => {
    if (!formProtocol && !formHost) return 'Digital Twin (Pure State & Methods - No External Socket)';
    const p = formProtocol.trim().toLowerCase() || 'http';
    const h = formHost.trim() || 'localhost';
    const portPart = formPort && Number(formPort) !== 80 && Number(formPort) !== 443 ? `:${formPort}` : '';
    return `${p}://${h}${portPart}`;
  }, [formProtocol, formHost, formPort]);

  // Live Auth Payload Preview for Software
  const liveAuthPayload = useMemo(() => {
    const payload: Record<string, unknown> = {};
    softwareProps.forEach(p => {
      if (p.useForAuth && p.key.trim()) {
        payload[p.key.trim()] = p.isSecret && !p.showSecret ? '••••••••' : (p.value || '');
      }
    });
    return payload;
  }, [softwareProps]);

  // Host input sanitizer (auto-extracts scheme or embedded port)
  const handleHostChange = (raw: string) => {
    let clean = raw.trim();
    if (clean.startsWith('opc.tcp://')) {
      setFormProtocol('opc.tcp');
      clean = clean.replace('opc.tcp://', '');
    } else if (clean.startsWith('http://')) {
      setFormProtocol('http');
      clean = clean.replace('http://', '');
    } else if (clean.startsWith('https://')) {
      setFormProtocol('https');
      clean = clean.replace('https://', '');
    }
    if (clean.includes(':')) {
      const parts = clean.split(':');
      clean = parts[0];
      const parsedPort = parseInt(parts[1], 10);
      if (!isNaN(parsedPort) && parsedPort > 0) {
        setFormPort(parsedPort);
      }
    }
    setFormHost(clean);
  };

  const handleAddPropRow = () => setCustomPropRows(prev => [...prev, { key: '', value: '' }]);
  const handleRemovePropRow = (index: number) => setCustomPropRows(prev => prev.filter((_, i) => i !== index));
  const handlePropChange = (index: number, field: 'key' | 'value', value: string) => {
    setCustomPropRows(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const isSoftwareType = formType.toUpperCase() === 'SOFTWARE' || formType.toUpperCase() === 'WMS' || formType.toUpperCase() === 'REST_GENERIC';

  const handleTestAuthMethod = async () => {
    if (!formResourceId.trim()) {
      alert('Please specify Resource ID before testing method execution');
      return;
    }
    setIsTestingMethod(true);
    setMethodTestResult(null);
    try {
      const authPayload: Record<string, unknown> = {};
      softwareProps.forEach(row => {
        if (row.key.trim() && row.useForAuth) authPayload[row.key.trim()] = row.value.trim();
      });

      const res = await resourceService.testAuthConnection({
        resourceId: formResourceId.trim(),
        baseUrl: synthesizedBaseUrl,
        tokenPath: formTokenPath.trim(),
        tokenField: formTokenResponseField.trim(),
        authMethod: formAuthMethod,
        authPayload: authPayload,
        apiKeyHeader: formApiKeyHeader.trim(),
        apiKeyValue: formApiKeyValue.trim(),
        username: formUsername.trim(),
        password: formPassword.trim()
      });

      setMethodTestResult({
        success: res.success,
        message: res.message || (res.success ? 'Authentication successful!' : 'Authentication failed')
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      setMethodTestResult({ success: false, message: msg });
    } finally {
      setIsTestingMethod(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResourceId.trim() || !formName.trim()) {
      alert('Please provide Resource ID and Resource Name');
      return;
    }

    setIsSaving(true);
    try {
      const customProps: Record<string, unknown> = {};
      const authPayload: Record<string, unknown> = {};

      if (isSoftwareType) {
        const propList: Array<{ key: string; value: unknown; isSecret: boolean; useForAuth: boolean }> = [];
        softwareProps.forEach(row => {
          if (row.key.trim()) {
            const k = row.key.trim();
            let val: unknown = row.value.trim();
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(Number(val)) && val !== '') val = Number(val);

            propList.push({
              key: k,
              value: val,
              isSecret: Boolean(row.isSecret),
              useForAuth: Boolean(row.useForAuth)
            });
            customProps[k] = val;
            if (row.useForAuth) authPayload[k] = val;
          }
        });
        customProps.properties = propList;
      } else {
        customPropRows.forEach(row => {
          if (row.key.trim()) customProps[row.key.trim()] = row.value.trim();
        });
      }

      const payload: CreateResourcePayload = {
        resourceId: formResourceId.trim(),
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        application: formApplication.trim() || 'WMS',
        protocol: formProtocol.trim() ? formProtocol.trim().toLowerCase() : undefined,
        host: formHost.trim() || undefined,
        port: formPort ? Number(formPort) : undefined,
        documentationUrl: formDocumentationUrl.trim() || undefined,
        type: formType.trim().toUpperCase(),
        category: (formCategory || 'GENERAL').trim().toUpperCase(),
        templateCode: formTemplateCode.trim() || undefined,
        status: formStatus.trim().toUpperCase(),
        ip: formHost.trim(),
        templateProperties: Object.keys(templateProps).length > 0 ? templateProps : undefined,
        customProperties: customProps,
        methodsConfig: {
          AUTHENTICATE: {
            strategy: formAuthMethod,
            tokenPath: formTokenPath.trim(),
            tokenResponseField: formTokenResponseField.trim(),
            apiKeyHeader: formApiKeyHeader.trim(),
            apiKeyValue: formApiKeyValue.trim(),
            username: formUsername.trim(),
            password: formPassword.trim(),
            payload: authPayload
          }
        }
      };

      if (isEditing) {
        await resourceService.updateResource(formResourceId.trim(), payload);
        onSuccess(`Resource '${formResourceId.trim()}' updated successfully`);
      } else {
        await resourceService.createResource(payload);
        onSuccess(`Resource '${formResourceId.trim()}' created successfully`);
      }

      onClose();
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving resource';
      alert(`Error saving resource: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Resource: ${formResourceId}` : 'Add New Resource'}
      subtitle="Configure scalable OOP Software & Hardware nodes with clean host, port, and AI-application binding"
      maxWidth="760px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving} style={{ minHeight: '48px', minWidth: '48px' }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving} style={{ minHeight: '48px', minWidth: '48px' }}>
            {isEditing ? 'Save Changes' : 'Create Resource'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Step 1: Archetype Blueprint Selection */}
        <TemplatePropertiesFormSection
          templates={availableTemplates}
          selectedTemplateCode={formTemplateCode}
          onSelectTemplateCode={handleSelectTemplateCode}
          templateProperties={templateProps}
          onPropertyChange={handleTemplatePropChange}
          disabled={isEditing}
        />

        {/* Identity & Description Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Resource ID *
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              placeholder="e.g. ERP-CONNECTOR-01 or WMS-CLIENT-02"
              value={formResourceId}
              onChange={(e) => setFormResourceId(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                minHeight: '48px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Resource Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Generic Enterprise ERP REST Gateway"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                boxSizing: 'border-box',
                minHeight: '48px'
              }}
            />
          </div>
        </div>

        {/* Application Tag & Description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Application / Subsystem *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. WMS, ERP, INVENTORY_APP"
              value={formApplication}
              onChange={(e) => setFormApplication(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                boxSizing: 'border-box',
                minHeight: '48px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Description
            </label>
            <input
              type="text"
              placeholder="Operational description or context for human and AI agents"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                boxSizing: 'border-box',
                minHeight: '48px'
              }}
            />
          </div>
        </div>

        {/* Connection Coordinates: Protocol, Host, Port Separation with Live URL Preview */}
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              Connection Coordinates & Multi-Port Resolution
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              Base URL: <strong className="text-cyan">{synthesizedBaseUrl}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Protocol
              </label>
              <select
                value={formProtocol}
                onChange={(e) => setFormProtocol(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  minHeight: '48px'
                }}
              >
                <option value="">None (Twin)</option>
                <option value="http">http://</option>
                <option value="https">https://</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Host / IP Address {formProtocol ? '*' : '(Optional)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required={Boolean(formProtocol)}
                  placeholder="127.0.0.1 or api.company.internal"
                  value={formHost}
                  onChange={(e) => handleHostChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    minHeight: '48px'
                  }}
                />
                <Globe size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '16px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Default Port *
              </label>
              <input
                type="number"
                required
                min={1}
                max={65535}
                value={formPort}
                onChange={(e) => setFormPort(Number(e.target.value) || 8080)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  minHeight: '48px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Documentation URL link */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Documentation / OpenAPI Spec URL (e.g. /docs/apps/generic-rest.html)"
                value={formDocumentationUrl}
                onChange={(e) => setFormDocumentationUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  minHeight: '38px'
                }}
              />
            </div>
            {formDocumentationUrl && (
              <a
                href={formDocumentationUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  minHeight: '38px',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={13} />
                <span>Open Specs</span>
              </a>
            )}
          </div>
        </div>

        {/* Row: Type, Category & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Resource Type *
            </label>
            <input
              type="text"
              required
              value={formType}
              onChange={(e) => setFormType(e.target.value.toUpperCase())}
              placeholder="REST_GENERIC"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                minHeight: '48px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                minHeight: '48px',
                boxSizing: 'border-box'
              }}
            >
              <option value="GENERAL">GENERAL</option>
              <option value="PHYSICAL">PHYSICAL</option>
              <option value="SOFTWARE">SOFTWARE</option>
              <option value="LOGICAL">LOGICAL</option>
              <option value="VIRTUAL">VIRTUAL</option>
              <option value="CONTROLLER">CONTROLLER</option>
              <option value="DEVICE">DEVICE</option>
              <option value="HARDWARE">HARDWARE</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Status *
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                minHeight: '48px',
                boxSizing: 'border-box'
              }}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
        </div>

        {/* Polymorphic Methods & Auth Configuration */}
        {isSoftwareType ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Polymorphic Capability: AUTHENTICATE
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestAuthMethod}
                isLoading={isTestingMethod}
                leftIcon={<Play size={13} color="#10B981" />}
                style={{ minHeight: '38px' }}
              >
                Test Authentication
              </Button>
            </div>

            {methodTestResult && (
              <div style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: methodTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${methodTestResult.success ? '#10B981' : '#EF4444'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px'
              }}>
                {methodTestResult.success ? <CheckCircle size={15} color="#10B981" /> : <AlertTriangle size={15} color="#EF4444" />}
                <span>{methodTestResult.message}</span>
              </div>
            )}

            <SoftwareAuthFormSection
              formAuthMethod={formAuthMethod}
              setFormAuthMethod={setFormAuthMethod}
              formTokenPath={formTokenPath}
              setFormTokenPath={setFormTokenPath}
              formTokenResponseField={formTokenResponseField}
              setFormTokenResponseField={setFormTokenResponseField}
              formApiKeyHeader={formApiKeyHeader}
              setFormApiKeyHeader={setFormApiKeyHeader}
              formApiKeyValue={formApiKeyValue}
              setFormApiKeyValue={setFormApiKeyValue}
              formUsername={formUsername}
              setFormUsername={setFormUsername}
              formPassword={formPassword}
              setFormPassword={setFormPassword}
              softwareProps={softwareProps}
              setSoftwareProps={setSoftwareProps}
              liveAuthPayload={liveAuthPayload}
            />
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Custom Property Overrides</label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddPropRow}
                style={{ fontSize: '11px', padding: '4px 10px', minHeight: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} />
                <span>Add Property</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {customPropRows.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Key"
                    value={row.key}
                    onChange={(e) => handlePropChange(idx, 'key', e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => handlePropChange(idx, 'value', e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleRemovePropRow(idx)}
                    style={{ padding: '6px', color: 'var(--color-danger, #EF4444)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
