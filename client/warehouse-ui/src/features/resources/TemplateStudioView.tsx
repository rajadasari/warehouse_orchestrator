import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Loader2,
  Layers,
  Sliders,
  Cpu,
  Circle
} from 'lucide-react';
import { 
  ResourceTemplateItem, 
  PropertySchemaItem, 
  IndustrialPropertyType,
  createResourceTemplateApi, 
  updateResourceTemplateApi 
} from '../../services/resourceTemplateService';
import { MethodDefinition } from './types/resourceEnums';
import { TemplateIdentityTab } from './components/templateStudio/TemplateIdentityTab';
import { TemplatePropertiesTab } from './components/templateStudio/TemplatePropertiesTab';
import { TemplateCustomMethodsTab } from './components/templateStudio/TemplateCustomMethodsTab';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';

export interface TemplateStudioViewProps {
  editingTemplate?: ResourceTemplateItem | null;
  onSaveSuccess: (savedTemplate: ResourceTemplateItem) => void;
  onCancel: () => void;
  existingTemplateCodes?: string[];
}

export type TemplateTabKey = 'IDENTITY' | 'PROPERTIES' | 'METHODS';

interface TabDefinition {
  key: TemplateTabKey;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const TEMPLATE_TABS: TabDefinition[] = [
  { key: 'IDENTITY', label: 'Identity & Info', sublabel: 'Code, Name, Category & Type', icon: <Layers size={15} /> },
  { key: 'PROPERTIES', label: 'Properties Matrix', sublabel: 'Variables, Units & Telemetry', icon: <Sliders size={15} /> },
  { key: 'METHODS', label: 'Operations & Methods', sublabel: 'Commands & Safety Tiering', icon: <Cpu size={15} /> }
];

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

export const TemplateStudioView: React.FC<TemplateStudioViewProps> = ({
  editingTemplate,
  onSaveSuccess,
  onCancel,
  existingTemplateCodes = []
}) => {
  const isEditing = Boolean(editingTemplate);
  const [activeTab, setActiveTab] = useState<TemplateTabKey>('IDENTITY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State (Identity)
  const [templateCode, setTemplateCode] = useState(editingTemplate?.templateCode || '');
  const [templateName, setTemplateName] = useState(editingTemplate?.templateName || '');
  const [category, setCategory] = useState(editingTemplate?.category || 'PHYSICAL');
  const [resourceType, setResourceType] = useState(editingTemplate?.resourceType || 'CONVEYOR');
  const [communicationMethod, setCommunicationMethod] = useState(
    editingTemplate?.communicationMethod || editingTemplate?.communicationProtocol || 'OPC_UA'
  );
  const [description, setDescription] = useState(editingTemplate?.description || '');
  const [documentationUrl, setDocumentationUrl] = useState(editingTemplate?.documentationUrl || '');

  // Properties State (User defined properties matrix)
  const [properties, setProperties] = useState<PropertySchemaItem[]>([]);

  // Methods State (User defined operations)
  const [methods, setMethods] = useState<MethodDefinition[]>([]);

  // Supported Commands State
  const [commandInput, setCommandInput] = useState('');
  const [supportedCommands, setSupportedCommands] = useState<string[]>([]);

  // Initial Snapshot to detect unsaved changes per tab
  const [initialSnapshot, setInitialSnapshot] = useState<{
    identity: string;
    properties: string;
    methods: string;
  } | null>(null);

  useEffect(() => {
    if (editingTemplate) {
      setTemplateCode(editingTemplate.templateCode);
      setTemplateName(editingTemplate.templateName);
      setCategory(editingTemplate.category || 'PHYSICAL');
      setResourceType(editingTemplate.resourceType || '');
      setCommunicationMethod(editingTemplate.communicationMethod || editingTemplate.communicationProtocol || 'OPC_UA');
      setDescription(editingTemplate.description || '');
      setDocumentationUrl(editingTemplate.documentationUrl || '');

      const loadedProps: PropertySchemaItem[] = [...(editingTemplate.propertySchema || [])];
      setProperties(loadedProps);

      const loadedMethods: MethodDefinition[] = [...(editingTemplate.methodsSchema || [])];
      setMethods(loadedMethods);

      const cmds = editingTemplate.supportedCommands ? [...editingTemplate.supportedCommands] : [];
      setSupportedCommands(cmds);

      setInitialSnapshot({
        identity: JSON.stringify({
          code: editingTemplate.templateCode,
          name: editingTemplate.templateName,
          cat: editingTemplate.category || 'PHYSICAL',
          resType: editingTemplate.resourceType || '',
          comm: editingTemplate.communicationMethod || editingTemplate.communicationProtocol || 'OPC_UA',
          desc: editingTemplate.description || '',
          doc: editingTemplate.documentationUrl || ''
        }),
        properties: JSON.stringify(loadedProps),
        methods: JSON.stringify({ methods: loadedMethods, cmds })
      });
    } else {
      setTemplateCode('');
      setTemplateName('');
      setCategory('PHYSICAL');
      setResourceType('CONVEYOR');
      setCommunicationMethod('OPC_UA');
      setDescription('');
      setDocumentationUrl('');
      setProperties([]);
      setMethods([]);
      setSupportedCommands([]);

      setInitialSnapshot({
        identity: JSON.stringify({
          code: '',
          name: '',
          cat: 'PHYSICAL',
          resType: 'CONVEYOR',
          comm: 'OPC_UA',
          desc: '',
          doc: ''
        }),
        properties: JSON.stringify([]),
        methods: JSON.stringify({ methods: [], cmds: [] })
      });
      setActiveTab('IDENTITY');
    }
    setErrorMessage(null);
  }, [editingTemplate]);

  // Track unsaved modifications per tab
  const unsavedTabs = useMemo(() => {
    if (!initialSnapshot) return { IDENTITY: false, PROPERTIES: false, METHODS: false };

    const currentIdentity = JSON.stringify({
      code: templateCode,
      name: templateName,
      cat: category,
      resType: resourceType,
      comm: communicationMethod,
      desc: description,
      doc: documentationUrl
    });

    const currentProperties = JSON.stringify(properties);
    const currentMethods = JSON.stringify({ methods, cmds: supportedCommands });

    return {
      IDENTITY: currentIdentity !== initialSnapshot.identity,
      PROPERTIES: currentProperties !== initialSnapshot.properties,
      METHODS: currentMethods !== initialSnapshot.methods
    };
  }, [
    initialSnapshot,
    templateCode,
    templateName,
    category,
    resourceType,
    communicationMethod,
    description,
    documentationUrl,
    properties,
    methods,
    supportedCommands
  ]);

  const hasAnyUnsavedChanges = unsavedTabs.IDENTITY || unsavedTabs.PROPERTIES || unsavedTabs.METHODS;

  const isCodeDuplicate = !isEditing && existingTemplateCodes.some(
    c => c.trim().toUpperCase() === templateCode.trim().toUpperCase()
  );

  // Property Handlers
  const handleAddProperty = (newProp?: PropertySchemaItem) => {
    if (newProp) {
      setProperties([...properties, newProp]);
    } else {
      setProperties([
        ...properties,
        {
          key: `prop_${properties.length + 1}`,
          label: `Property ${properties.length + 1}`,
          type: 'STRING',
          required: false,
          defaultValue: '',
          unit: '',
          description: ''
        }
      ]);
    }
  };

  const handleUpdateProperty = (index: number, patch: Partial<PropertySchemaItem>) => {
    const updated = [...properties];
    if (index >= updated.length) {
      updated.push(patch as PropertySchemaItem);
    } else {
      updated[index] = { ...updated[index], ...patch };
    }
    setProperties(updated);
  };

  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  // Method Handlers
  const handleAddMethod = () => {
    setMethods([
      ...methods,
      {
        name: `method_${methods.length + 1}`,
        displayName: `Method ${methods.length + 1}`,
        category: 'CUSTOM',
        description: 'Operation execution service'
      }
    ]);
  };

  const handleUpdateMethod = (index: number, patch: Partial<MethodDefinition>) => {
    const updated = [...methods];
    updated[index] = { ...updated[index], ...patch };
    setMethods(updated);
  };

  const handleRemoveMethod = (index: number) => {
    setMethods(methods.filter((_, i) => i !== index));
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
      setErrorMessage('Template code is required in "Identity & Protocol" tab.');
      setActiveTab('IDENTITY');
      return;
    }
    if (isCodeDuplicate) {
      setErrorMessage(`Template code '${templateCode}' already exists in database.`);
      setActiveTab('IDENTITY');
      return;
    }
    if (!templateName.trim()) {
      setErrorMessage('Template name is required in "Identity & Protocol" tab.');
      setActiveTab('IDENTITY');
      return;
    }
    if (!resourceType.trim()) {
      setErrorMessage('Resource type is required in "Identity & Protocol" tab.');
      setActiveTab('IDENTITY');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const defaultPropsMap: Record<string, unknown> = {};
    properties.forEach(p => {
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
      propertySchema: properties,
      defaultProperties: defaultPropsMap,
      methodsSchema: methods,
      supportedCommands,
      active: true
    };

    try {
      let saved: ResourceTemplateItem;
      if (isEditing) {
        saved = await updateResourceTemplateApi(templateCode, payload);
      } else {
        saved = await createResourceTemplateApi(payload);
      }
      onSaveSuccess(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
      {/* 1. Header Navigation Bar with Persistent In-Memory State & Save Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            title="Return to Templates"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              minWidth: '48px',
              minHeight: '48px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Template Studio &gt; {isEditing ? `Edit ${templateCode}` : 'Create Platform Template'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isEditing ? `Edit Template: ${templateName || templateCode}` : 'Define Platform Resource Template'}
              </h2>
              {hasAnyUnsavedChanges && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#F59E0B',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Circle size={6} fill="#F59E0B" color="#F59E0B" />
                  Unsaved Changes in Memory
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {properties.length} Properties &bull; {methods.length} Methods
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            leftIcon={<X size={14} />}
            style={{ minHeight: '40px' }}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || !templateCode.trim() || isCodeDuplicate || !templateName.trim() || !resourceType.trim()}
            leftIcon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            style={{
              minHeight: '40px',
              padding: '0 20px',
              backgroundColor: '#10B981',
              borderColor: '#10B981',
              boxShadow: hasAnyUnsavedChanges ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            {isSubmitting ? 'Saving to DB...' : isEditing ? 'Save to DB' : 'Save Template to DB'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="danger" title="Validation / Persistence Error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* 2. Top Tabs Strip with Unsaved Highlights */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: 'var(--bg-surface)',
          padding: '6px 8px',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          flexShrink: 0
        }}
      >
        {TEMPLATE_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const isUnsaved = unsavedTabs[tab.key];

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '6px',
                border: isActive
                  ? '1px solid var(--color-primary-500, #3B82F6)'
                  : isUnsaved
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid transparent',
                backgroundColor: isActive
                  ? 'var(--bg-surface-subtle, #1e293b)'
                  : isUnsaved
                  ? 'rgba(245, 158, 11, 0.05)'
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s ease',
                minHeight: '48px'
              }}
            >
              <div style={{
                color: isActive ? 'var(--color-primary-500, #38BDF8)' : isUnsaved ? '#F59E0B' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {tab.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}>
                    {tab.label}
                  </span>
                  {/* Unsaved indicator badge */}
                  {isUnsaved && (
                    <span
                      title="Unsaved changes in this tab (saved in memory)"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        padding: '1px 5px',
                        borderRadius: '10px'
                      }}
                    >
                      <Circle size={5} fill="#F59E0B" color="#F59E0B" />
                      UNSAVED
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '10.5px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {tab.sublabel}
                </div>
              </div>

              {/* Bottom active accent bar */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  backgroundColor: 'var(--color-primary-500, #3B82F6)',
                  borderRadius: '2px'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content Body with In-Memory State Retention */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: activeTab === 'PROPERTIES' ? 'hidden' : 'auto',
        display: activeTab === 'PROPERTIES' ? 'flex' : 'block',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '16px'
      }}>
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

        {activeTab === 'PROPERTIES' && (
          <TemplatePropertiesTab
            properties={properties}
            handleAddProperty={handleAddProperty}
            handleUpdateProperty={handleUpdateProperty}
            handleRemoveProperty={handleRemoveProperty}
            propertyTypes={PROPERTY_TYPES}
          />
        )}

        {activeTab === 'METHODS' && (
          <TemplateCustomMethodsTab
            customMethods={methods}
            handleAddCustomMethod={handleAddMethod}
            handleUpdateCustomMethod={handleUpdateMethod}
            handleRemoveCustomMethod={handleRemoveMethod}
            commandInput={commandInput}
            setCommandInput={setCommandInput}
            supportedCommands={supportedCommands}
            handleAddCommand={handleAddCommand}
            handleRemoveCommand={handleRemoveCommand}
          />
        )}
      </div>
    </div>
  );
};
