import React, { useState, useEffect, useMemo } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
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
  defaultType = 'SOFTWARE',
  onSuccess,
  onRefresh
}) => {
  const [formResourceId, setFormResourceId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<string>('SOFTWARE');
  const [formCategory, setFormCategory] = useState<string>('SOFTWARE');
  const [formTemplateCode, setFormTemplateCode] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');
  const [formIp, setFormIp] = useState<string>('');

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

  // Load templates on modal open
  useEffect(() => {
    if (!isOpen) return;
    fetchResourceTemplatesApi()
      .then(tpls => setAvailableTemplates(tpls))
      .catch(err => console.error('Failed to load templates in modal:', err));
  }, [isOpen]);

  // Initialize or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && initialData) {
      setFormResourceId(initialData.resourceId);
      setFormName(initialData.name);
      setFormType(initialData.type);
      setFormCategory(initialData.category || 'SOFTWARE');
      setFormTemplateCode(initialData.templateCode || '');
      setFormStatus(initialData.status);
      setFormIp(initialData.ip || '');
      setTemplateProps(initialData.templateProperties || {});

      const props = initialData.customProperties || {};
      const existingAuth = (props.auth && typeof props.auth === 'object') ? (props.auth as Record<string, unknown>) : {};
      const detectedMethod = existingAuth.method || props.authMethod || ((props.clientId || props.clientSecret) ? 'OAUTH2_BEARER' : 'NONE');
      setFormAuthMethod(String(detectedMethod));
      setFormTokenPath(String(props.tokenPath || existingAuth.tokenPath || '/WMS.Api/api/authentication'));
      setFormTokenResponseField(String(props.tokenResponseField || existingAuth.tokenResponseField || 'accessToken'));
      setFormApiKeyHeader(String(props.apiKeyHeader || existingAuth.header || 'X-API-KEY'));
      setFormApiKeyValue(String(props.apiKeyValue || existingAuth.keyValue || ''));
      setFormUsername(String(props.username || existingAuth.username || ''));
      setFormPassword(String(props.password || existingAuth.password || ''));

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
        { key: 'clientId', value: '', isSecret: false, useForAuth: true },
        { key: 'clientSecret', value: '', isSecret: true, useForAuth: true }
      ]);

      // Populate customPropRows for non-software
      const nonSwRows: Array<{ key: string; value: string }> = [];
      Object.entries(props).forEach(([k, v]) => {
        if (!['auth', 'authMethod', 'tokenPath', 'tokenResponseField', 'properties', 'clientId', 'clientSecret'].includes(k)) {
          nonSwRows.push({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
        }
      });
      setCustomPropRows(nonSwRows.length > 0 ? nonSwRows : [{ key: '', value: '' }]);

    } else {
      // Create Mode
      setFormResourceId('');
      setFormName('');
      setFormType(defaultType);
      setFormCategory(defaultType === 'HARDWARE' ? 'HARDWARE' : (defaultType === 'EQUIPMENT' || defaultType === 'PLC' ? 'DEVICE' : 'SOFTWARE'));
      setFormTemplateCode('');
      setFormStatus('ACTIVE');
      setFormIp('');
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
      setFormCategory(tpl.category);
      setFormType(tpl.resourceType);
      if (!formName) {
        setFormName(tpl.templateName);
      }
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

      // Pre-fill IP if template defines ip / plcIp
      if (initialProps.plcIp && !formIp) setFormIp(String(initialProps.plcIp));
      if (initialProps.ip && !formIp) setFormIp(String(initialProps.ip));
    }
  };

  const handleTemplatePropChange = (key: string, value: unknown) => {
    setTemplateProps(prev => ({ ...prev, [key]: value }));
  };

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

  const handleAddPropRow = () => {
    setCustomPropRows(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemovePropRow = (index: number) => {
    setCustomPropRows(prev => prev.filter((_, i) => i !== index));
  };

  const handlePropChange = (index: number, field: 'key' | 'value', value: string) => {
    setCustomPropRows(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const isSoftwareType = formType.toUpperCase() === 'SOFTWARE' || formType.toUpperCase() === 'WMS';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResourceId.trim() || !formName.trim() || !formType.trim()) {
      alert('Please provide Resource ID, Resource Name, and Type');
      return;
    }

    setIsSaving(true);
    try {
      const customProps: Record<string, unknown> = {};

      if (isSoftwareType) {
        const propList: Array<{ key: string; value: unknown; isSecret: boolean; useForAuth: boolean }> = [];
        const authPayload: Record<string, unknown> = {};

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
            if (row.useForAuth) {
              authPayload[k] = val;
            }
          }
        });

        customProps.properties = propList;

        if (formAuthMethod === 'OAUTH2_BEARER') {
          customProps.authMethod = 'OAUTH2_BEARER';
          customProps.tokenPath = formTokenPath.trim();
          customProps.tokenResponseField = formTokenResponseField.trim() || 'accessToken';
          customProps.auth = {
            method: 'OAUTH2_BEARER',
            tokenPath: formTokenPath.trim() || '/WMS.Api/api/authentication',
            tokenResponseField: formTokenResponseField.trim() || 'accessToken',
            requestPayload: authPayload
          };
          if (authPayload.clientId) customProps.clientId = authPayload.clientId;
          if (authPayload.clientSecret) customProps.clientSecret = authPayload.clientSecret;
        } else if (formAuthMethod === 'API_KEY') {
          customProps.apiKeyHeader = formApiKeyHeader.trim();
          customProps.apiKeyValue = formApiKeyValue.trim();
          customProps.authMethod = 'API_KEY';
          customProps.auth = {
            method: 'API_KEY',
            header: formApiKeyHeader.trim(),
            keyValue: formApiKeyValue.trim()
          };
        } else if (formAuthMethod === 'BASIC_AUTH') {
          customProps.username = formUsername.trim();
          customProps.password = formPassword.trim();
          customProps.authMethod = 'BASIC_AUTH';
          customProps.auth = {
            method: 'BASIC_AUTH',
            username: formUsername.trim(),
            password: formPassword.trim()
          };
        } else {
          customProps.authMethod = 'NONE';
          customProps.auth = { method: 'NONE' };
        }
      } else {
        customPropRows.forEach(row => {
          if (row.key.trim()) {
            const val = row.value.trim();
            if (val === 'true') customProps[row.key.trim()] = true;
            else if (val === 'false') customProps[row.key.trim()] = false;
            else if (!isNaN(Number(val)) && val !== '') customProps[row.key.trim()] = Number(val);
            else {
              try {
                customProps[row.key.trim()] = JSON.parse(val);
              } catch {
                customProps[row.key.trim()] = val;
              }
            }
          }
        });
      }

      const payload: CreateResourcePayload = {
        resourceId: formResourceId.trim(),
        name: formName.trim(),
        type: formType.trim().toUpperCase(),
        category: formCategory.trim().toUpperCase(),
        templateCode: formTemplateCode.trim() || undefined,
        status: formStatus.trim().toUpperCase(),
        ip: formIp.trim() || undefined,
        templateProperties: Object.keys(templateProps).length > 0 ? templateProps : undefined,
        customProperties: customProps
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
      subtitle="Configure warehouse software, WMS, PLC, or hardware nodes"
      maxWidth={isSoftwareType || formTemplateCode ? '740px' : '580px'}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Resource'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Template Selector Section */}
        <TemplatePropertiesFormSection
          templates={availableTemplates}
          selectedTemplateCode={formTemplateCode}
          onSelectTemplateCode={handleSelectTemplateCode}
          templateProperties={templateProps}
          onPropertyChange={handleTemplatePropChange}
          disabled={isEditing}
        />

        {/* Resource ID */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            Resource ID *
          </label>
          <input
            type="text"
            required
            disabled={isEditing}
            placeholder="e.g. CONV-LINE-01 or LOGIQS-AMBIENT-WMS"
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
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Resource Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            Resource Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Main Inbound S7 Conveyor Line"
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
              boxSizing: 'border-box'
            }}
          />
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
              placeholder="e.g. CONVEYOR, PLC, SOFTWARE"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
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
                boxSizing: 'border-box'
              }}
            >
              <option value="HARDWARE">HARDWARE</option>
              <option value="DEVICE">DEVICE</option>
              <option value="SOFTWARE">SOFTWARE</option>
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
                boxSizing: 'border-box'
              }}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
        </div>

        {/* IP / Host Address */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            {isSoftwareType ? 'Base URL (e.g. http://10.21.37.11:5000)' : 'Network IP Address / Host'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={isSoftwareType ? 'http://10.21.37.11:5000' : '192.168.1.10'}
              value={formIp}
              onChange={(e) => setFormIp(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
            <Globe size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>
        </div>

        {/* Conditional Form Sections: Software vs Non-software */}
        {isSoftwareType ? (
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
                    placeholder="Key (e.g. rack, slot, divisionGrams)"
                    value={row.key}
                    onChange={(e) => handlePropChange(idx, 'key', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 10 or true)"
                    value={row.value}
                    onChange={(e) => handlePropChange(idx, 'value', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
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
