import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Sliders, 
  Cpu, 
  Code, 
  AlertCircle, 
  Activity, 
  Radio, 
  Zap 
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { 
  ResourceTemplateItem, 
  PropertySchemaItem, 
  IndustrialPropertyType,
  createResourceTemplateApi, 
  updateResourceTemplateApi 
} from '../../../services/resourceTemplateService';
import { MethodDefinition } from '../types/resourceEnums';
import { TemplateIdentityTab } from './templateStudio/TemplateIdentityTab';
import { TemplateBasePropertiesTab } from './templateStudio/TemplateBasePropertiesTab';
import { TemplateCustomPropertiesTab } from './templateStudio/TemplateCustomPropertiesTab';
import { TemplateBaseMethodsTab } from './templateStudio/TemplateBaseMethodsTab';
import { TemplateCustomMethodsTab } from './templateStudio/TemplateCustomMethodsTab';

interface TemplateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialTemplate?: ResourceTemplateItem | null;
  existingTemplateCodes?: string[];
}

type TabType = 'IDENTITY' | 'BASE_PROPERTIES' | 'CUSTOM_PROPERTIES' | 'BASE_METHODS' | 'CUSTOM_METHODS';

const CATEGORIES = [
  { key: 'PHYSICAL', label: 'Physical', desc: 'Shop-floor machines, AMRs, conveyors, sorters' },
  { key: 'SOFTWARE', label: 'Software', desc: 'WMS/ERP connectors, external web services' },
  { key: 'VIRTUAL', label: 'Virtual', desc: 'Digital twins, simulated machine replicas' },
  { key: 'LOGICAL', label: 'Logical', desc: 'Bins, pick zones, workflow queues' }
];

const PROPERTY_TYPES: IndustrialPropertyType[] = [
  'STRING', 'INTEGER', 'LONG', 'DOUBLE', 'BOOLEAN', 'DATETIME', 
  'SECRET', 'ENUM', 'LOCATION', 'MAP', 'ARRAY', 'BYTE_ARRAY'
];

const DEFAULT_BASE_PROPERTIES: PropertySchemaItem[] = [
  { key: 'operational_state', label: 'Operational State', type: 'ENUM', required: true, defaultValue: 'IDLE', options: ['IDLE', 'RUNNING', 'PAUSED', 'FAULTED', 'MAINTENANCE'], description: 'Primary machine lifecycle state for task dispatching', isBaseProperty: true },
  { key: 'health_status', label: 'Health Status', type: 'ENUM', required: true, defaultValue: 'HEALTHY', options: ['HEALTHY', 'DEGRADED', 'CRITICAL', 'OFFLINE'], description: 'Overall health tier for predictive maintenance alerts', isBaseProperty: true },
  { key: 'fault_code', label: 'Fault Code', type: 'STRING', required: false, defaultValue: '', description: 'Active error or fault tag reported by PLC/driver', isBaseProperty: true },
  { key: 'last_heartbeat', label: 'Last Heartbeat', type: 'DATETIME', required: true, description: 'High-precision timestamp of last communication ingestion', isBaseProperty: true }
];

const DEFAULT_BASE_METHODS: MethodDefinition[] = [
  { name: 'PING_HEALTH', type: 'DIAGNOSTIC', safetyTier: 'READ_ONLY', description: 'Latency and heartbeat verification before dispatching work orders' },
  { name: 'RESET_FAULT', type: 'CONTROL', safetyTier: 'OPERATIONAL', description: 'Clears latched machine error states once physically resolved' },
  { name: 'EMERGENCY_STOP', type: 'CONTROL', safetyTier: 'SAFETY_CRITICAL', description: 'Universal shop-floor safety stop (IEC 62443 dual-approval guarded)' }
];

export const TemplateStudioModal: React.FC<TemplateStudioModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialTemplate,
  existingTemplateCodes = []
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('IDENTITY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [templateCode, setTemplateCode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('PHYSICAL');
  const [resourceType, setResourceType] = useState('');
  const [communicationMethod, setCommunicationMethod] = useState('OPC_UA');
  const [description, setDescription] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');

  // Properties State
  const [baseProperties, setBaseProperties] = useState<PropertySchemaItem[]>(DEFAULT_BASE_PROPERTIES);
  const [customProperties, setCustomProperties] = useState<PropertySchemaItem[]>([]);

  // Methods State
  const [baseMethods, setBaseMethods] = useState<MethodDefinition[]>(DEFAULT_BASE_METHODS);
  const [customMethods, setCustomMethods] = useState<MethodDefinition[]>([]);

  // Supported Commands State
  const [commandInput, setCommandInput] = useState('');
  const [supportedCommands, setSupportedCommands] = useState<string[]>(['START', 'STOP', 'RESET']);

  useEffect(() => {
    if (initialTemplate) {
      setTemplateCode(initialTemplate.templateCode);
      setTemplateName(initialTemplate.templateName);
      setCategory(initialTemplate.category || 'PHYSICAL');
      setResourceType(initialTemplate.resourceType || '');
      setCommunicationMethod(initialTemplate.communicationMethod || initialTemplate.communicationProtocol || 'OPC_UA');
      setDescription(initialTemplate.description || '');
      setDocumentationUrl(initialTemplate.documentationUrl || '');

      const baseKeys = new Set(DEFAULT_BASE_PROPERTIES.map(p => p.key));
      const loadedBase: PropertySchemaItem[] = [];
      const loadedCustom: PropertySchemaItem[] = [];

      (initialTemplate.propertySchema || []).forEach(p => {
        if (baseKeys.has(p.key) || p.isBaseProperty) {
          loadedBase.push({ ...p, isBaseProperty: true });
        } else {
          loadedCustom.push(p);
        }
      });

      DEFAULT_BASE_PROPERTIES.forEach(def => {
        if (!loadedBase.some(b => b.key === def.key)) loadedBase.push(def);
      });

      setBaseProperties(loadedBase);
      setCustomProperties(loadedCustom);

      const baseMethodNames = new Set(DEFAULT_BASE_METHODS.map(m => m.name));
      const loadedBaseM: MethodDefinition[] = [];
      const loadedCustomM: MethodDefinition[] = [];

      (initialTemplate.methodsSchema || []).forEach(m => {
        if (baseMethodNames.has(m.name)) loadedBaseM.push(m);
        else loadedCustomM.push(m);
      });

      DEFAULT_BASE_METHODS.forEach(defM => {
        if (!loadedBaseM.some(b => b.name === defM.name)) loadedBaseM.push(defM);
      });

      setBaseMethods(loadedBaseM);
      setCustomMethods(loadedCustomM);
      setSupportedCommands(initialTemplate.supportedCommands || ['START', 'STOP', 'RESET']);
    } else {
      setTemplateCode('');
      setTemplateName('');
      setCategory('PHYSICAL');
      setResourceType('CONVEYOR');
      setCommunicationMethod('OPC_UA');
      setDescription('');
      setDocumentationUrl('');
      setBaseProperties(DEFAULT_BASE_PROPERTIES);
      setCustomProperties([]);
      setBaseMethods(DEFAULT_BASE_METHODS);
      setCustomMethods([]);
      setSupportedCommands(['START', 'STOP', 'RESET']);
      setActiveTab('IDENTITY');
    }
    setErrorMessage(null);
  }, [initialTemplate, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialTemplate);
  const isCodeDuplicate = !isEditing && existingTemplateCodes.some(
    c => c.trim().toUpperCase() === templateCode.trim().toUpperCase()
  );

  const handleAddCustomProperty = () => {
    setCustomProperties([
      ...customProperties,
      {
        key: `prop_${customProperties.length + 1}`,
        label: `Property ${customProperties.length + 1}`,
        type: 'STRING',
        required: false,
        defaultValue: '',
        unit: '',
        description: ''
      }
    ]);
  };

  const handleUpdateCustomProperty = (index: number, patch: Partial<PropertySchemaItem>) => {
    const updated = [...customProperties];
    updated[index] = { ...updated[index], ...patch };
    setCustomProperties(updated);
  };

  const handleRemoveCustomProperty = (index: number) => {
    setCustomProperties(customProperties.filter((_, i) => i !== index));
  };

  const handleAddCustomMethod = () => {
    setCustomMethods([
      ...customMethods,
      {
        name: `customMethod${customMethods.length + 1}`,
        type: 'CONTROL',
        safetyTier: 'OPERATIONAL',
        description: 'Custom execution service'
      }
    ]);
  };

  const handleUpdateCustomMethod = (index: number, patch: Partial<MethodDefinition>) => {
    const updated = [...customMethods];
    updated[index] = { ...updated[index], ...patch };
    setCustomMethods(updated);
  };

  const handleRemoveCustomMethod = (index: number) => {
    setCustomMethods(customMethods.filter((_, i) => i !== index));
  };

  const handleAddCommand = () => {
    if (!commandInput.trim()) return;
    const clean = commandInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!supportedCommands.includes(clean)) {
      setSupportedCommands([...supportedCommands, clean]);
    }
    setCommandInput('');
  };

  const handleRemoveCommand = (cmd: string) => {
    setSupportedCommands(supportedCommands.filter(c => c !== cmd));
  };

  const handleSave = async () => {
    if (!templateCode.trim()) {
      setErrorMessage('Template code is required');
      setActiveTab('IDENTITY');
      return;
    }
    if (isCodeDuplicate) {
      setErrorMessage(`Template code '${templateCode}' already exists in database`);
      setActiveTab('IDENTITY');
      return;
    }
    if (!templateName.trim()) {
      setErrorMessage('Template name is required');
      setActiveTab('IDENTITY');
      return;
    }
    if (!resourceType.trim()) {
      setErrorMessage('Resource type is required');
      setActiveTab('IDENTITY');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const mergedProperties = [...baseProperties, ...customProperties];
    const mergedMethods = [...baseMethods, ...customMethods];
    const defaultPropsMap: Record<string, unknown> = {};
    mergedProperties.forEach(p => {
      if (p.defaultValue !== undefined && p.defaultValue !== '') {
        defaultPropsMap[p.key] = p.defaultValue;
      }
    });

    const payload: ResourceTemplateItem = {
      templateCode: templateCode.trim().toUpperCase(),
      templateName: templateName.trim(),
      category: category.trim().toUpperCase(),
      resourceType: resourceType.trim().toUpperCase(),
      communicationProtocol: communicationMethod,
      communicationMethod,
      description: description.trim(),
      documentationUrl: documentationUrl.trim(),
      propertySchema: mergedProperties,
      defaultProperties: defaultPropsMap,
      methodsSchema: mergedMethods,
      supportedCommands,
      active: true
    };

    try {
      if (isEditing) {
        await updateResourceTemplateApi(templateCode, payload);
      } else {
        await createResourceTemplateApi(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.82)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '940px',
        height: '86vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6'
            }}>
              <Cpu size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {isEditing ? `Edit Template: ${templateCode}` : 'Create Platform Resource Template'}
              </h2>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Sovereign Warehouse Orchestrator (WO) Class Definition
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              minWidth: '48px',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          padding: '0 16px',
          gap: '6px'
        }}>
          <button
            onClick={() => setActiveTab('IDENTITY')}
            style={{
              padding: '12px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'IDENTITY' ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === 'IDENTITY' ? '#3B82F6' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px'
            }}
          >
            <Radio size={14} /> 1. Identity & OT Gateway
          </button>
          <button
            onClick={() => setActiveTab('BASE_PROPERTIES')}
            style={{
              padding: '12px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'BASE_PROPERTIES' ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === 'BASE_PROPERTIES' ? '#3B82F6' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px'
            }}
          >
            <Activity size={14} /> 2. Base Properties ({baseProperties.length})
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM_PROPERTIES')}
            style={{
              padding: '12px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'CUSTOM_PROPERTIES' ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === 'CUSTOM_PROPERTIES' ? '#3B82F6' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px'
            }}
          >
            <Sliders size={14} /> 3. Custom Properties ({customProperties.length})
          </button>
          <button
            onClick={() => setActiveTab('BASE_METHODS')}
            style={{
              padding: '12px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'BASE_METHODS' ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === 'BASE_METHODS' ? '#3B82F6' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px'
            }}
          >
            <Zap size={14} /> 4. Base Methods ({baseMethods.length})
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM_METHODS')}
            style={{
              padding: '12px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'CUSTOM_METHODS' ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === 'CUSTOM_METHODS' ? '#3B82F6' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '48px'
            }}
          >
            <Code size={14} /> 5. Custom Methods ({customMethods.length})
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              borderRadius: '6px',
              color: '#EF4444',
              fontSize: '12px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'IDENTITY' && (
            <TemplateIdentityTab
              isEditing={isEditing}
              templateCode={templateCode}
              setTemplateCode={setTemplateCode}
              templateName={templateName}
              setTemplateName={setTemplateName}
              category={category}
              setCategory={setCategory}
              resourceType={resourceType}
              setResourceType={setResourceType}
              description={description}
              setDescription={setDescription}
              documentationUrl={documentationUrl}
              setDocumentationUrl={setDocumentationUrl}
              isCodeDuplicate={isCodeDuplicate}
              categories={CATEGORIES}
            />
          )}

          {activeTab === 'BASE_PROPERTIES' && (
            <TemplateBasePropertiesTab
              baseProperties={baseProperties}
              setBaseProperties={setBaseProperties}
            />
          )}

          {activeTab === 'CUSTOM_PROPERTIES' && (
            <TemplateCustomPropertiesTab
              customProperties={customProperties}
              handleAddCustomProperty={handleAddCustomProperty}
              handleUpdateCustomProperty={handleUpdateCustomProperty}
              handleRemoveCustomProperty={handleRemoveCustomProperty}
              propertyTypes={PROPERTY_TYPES}
            />
          )}

          {activeTab === 'BASE_METHODS' && (
            <TemplateBaseMethodsTab
              baseMethods={baseMethods}
            />
          )}

          {activeTab === 'CUSTOM_METHODS' && (
            <TemplateCustomMethodsTab
              customMethods={customMethods}
              handleAddCustomMethod={handleAddCustomMethod}
              handleUpdateCustomMethod={handleUpdateCustomMethod}
              handleRemoveCustomMethod={handleRemoveCustomMethod}
              commandInput={commandInput}
              setCommandInput={setCommandInput}
              supportedCommands={supportedCommands}
              handleAddCommand={handleAddCommand}
              handleRemoveCommand={handleRemoveCommand}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-subtle)'
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Total Elements: {baseProperties.length + customProperties.length} Properties, {baseMethods.length + customMethods.length} Methods
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSubmitting || isCodeDuplicate}
              leftIcon={<Save size={14} />}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Template' : 'Save Template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
