import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Save, X, Loader2, CheckCircle2 } from 'lucide-react';
import { ResourceItem, CreateResourcePayload, resourceService } from '../../../services/resourceService';
import { ResourceTemplateItem, PropertySchemaItem, fetchResourceTemplatesApi } from '../../../services/resourceTemplateService';
import { MethodDefinition } from '../types/resourceEnums';
import { StudioStepper, StepItem } from './StudioStepper';
import { Step1Identity } from './Step1Identity';
import { Step2Properties, CustomPropertyRow } from './Step2Properties';
import { Step3MethodMapping, MethodConfigState } from './Step3MethodMapping';
import { Step3CodeMethodConfig } from './Step3CodeMethodConfig';
import { Step4ValidationSandbox } from './Step4ValidationSandbox';
import { Button } from '../../../components/common/Button';
import { Alert } from '../../../components/common/Alert';
import { extractConnectionCoordinates } from './endpointUtils';

export interface ResourceStudioViewProps {
  editingResource?: ResourceItem | null;
  onSaveSuccess: (savedResource: ResourceItem) => void;
  onCancel: () => void;
}

export const ResourceStudioView: React.FC<ResourceStudioViewProps> = ({
  editingResource,
  onSaveSuccess,
  onCancel
}) => {
  const isEditing = Boolean(editingResource);

  // Stepper state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Template state
  const [availableTemplates, setAvailableTemplates] = useState<ResourceTemplateItem[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<ResourceTemplateItem[]>([]);

  // Step 1: Definition fields
  const [resourceId, setResourceId] = useState<string>(editingResource?.resourceId || '');
  const [name, setName] = useState<string>(editingResource?.name || '');
  const [category, setCategory] = useState<string>(editingResource?.category || 'GENERAL');
  const [type, setType] = useState<string>(editingResource?.type || '');
  const [application, setApplication] = useState<string>(editingResource?.application || '');
  const [status, setStatus] = useState<string>(editingResource?.status || 'ACTIVE');
  const [description, setDescription] = useState<string>(editingResource?.description || '');
  const [documentationUrl, setDocumentationUrl] = useState<string>(editingResource?.documentationUrl || '');

  // Step 2: Consolidated Property Matrix (Default and Custom definitions)
  const [inheritedValues, setInheritedValues] = useState<Record<string, unknown>>({});
  const [customProperties, setCustomProperties] = useState<CustomPropertyRow[]>([]);
  const [inheritedAuthKeys, setInheritedAuthKeys] = useState<string[]>([]);

  // Step 3: Method configurations
  const [methodConfigs, setMethodConfigs] = useState<MethodConfigState>({});

  // Operational & Auto-save states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSoftware = useMemo(() => {
    return (category || 'GENERAL').toUpperCase() === 'SOFTWARE';
  }, [category]);

  const studioSteps: StepItem[] = useMemo(() => [
    { id: 1, label: 'Resource Definition', description: 'Blueprint, identity & specifications' },
    { id: 2, label: 'Properties Matrix', description: 'Inherited defaults & custom definitions' },
    { 
      id: 3, 
      label: isSoftware ? 'API Service Mapping' : 'Java & Python Services', 
      description: isSoftware ? 'Search-based parameter binder & endpoints' : 'Polyglot code logic & dynamic scripts' 
    },
    { id: 4, label: 'Validation Sandbox', description: 'Execution dry-run & activation' }
  ], [isSoftware]);

  // Combined synthetic template aggregating all selected templates
  const combinedTemplate: ResourceTemplateItem | null = useMemo(() => {
    if (selectedTemplates.length === 0) return null;
    if (selectedTemplates.length === 1) return selectedTemplates[0];

    const primary = selectedTemplates[0];
    const combinedProps: Record<string, unknown> = {};
    const combinedSchema: PropertySchemaItem[] = [];
    const seenPropKeys = new Set<string>();
    const combinedMethods: MethodDefinition[] = [];
    const seenMethodNames = new Set<string>();

    selectedTemplates.forEach((tpl, idx) => {
      // 1. Merge default properties: primary first, subsequent only add non-colliding
      if (tpl.defaultProperties) {
        Object.entries(tpl.defaultProperties).forEach(([k, v]) => {
          if (combinedProps[k] === undefined) {
            combinedProps[k] = v;
          }
        });
      }
      // 2. Merge propertySchema: primary first, subsequent only add non-colliding
      if (tpl.propertySchema) {
        tpl.propertySchema.forEach(p => {
          if (!seenPropKeys.has(p.key)) {
            seenPropKeys.add(p.key);
            combinedSchema.push({
              ...p,
              description: idx === 0 
                ? p.description 
                : p.description ? `[${tpl.templateCode}] ${p.description}` : `Inherited from ${tpl.templateCode}`
            });
          }
        });
      }
      // 3. Merge methodsSchema: primary first, subsequent only add non-colliding
      if (tpl.methodsSchema) {
        tpl.methodsSchema.forEach(m => {
          if (!seenMethodNames.has(m.name)) {
            seenMethodNames.add(m.name);
            combinedMethods.push({
              ...m,
              description: idx === 0 
                ? m.description 
                : m.description ? `[${tpl.templateCode}] ${m.description}` : `Inherited from ${tpl.templateCode}`
            });
          }
        });
      }
    });

    return {
      ...primary,
      templateCode: selectedTemplates.map(t => t.templateCode).join(','),
      templateName: selectedTemplates.map(t => t.templateName).join(' + '),
      propertySchema: combinedSchema,
      defaultProperties: combinedProps,
      methodsSchema: combinedMethods,
      supportedCommands: Array.from(new Set(selectedTemplates.flatMap(t => t.supportedCommands || [])))
    };
  }, [selectedTemplates]);

  // Fetch available templates on load and link editingResource template if present
  useEffect(() => {
    fetchResourceTemplatesApi()
      .then(templates => {
        setAvailableTemplates(templates);
        if (editingResource?.templateCode) {
          const codes = editingResource.templateCode.split(',').map(c => c.trim().toUpperCase());
          const matched = templates.filter(t => codes.includes(t.templateCode.toUpperCase()));
          if (matched.length > 0) {
            setSelectedTemplates(matched);
            if (matched[0].category) setCategory(matched[0].category);
          }
        } else if (!editingResource) {
          // Default to GENERIC_DIGITAL_TWIN or first GENERAL template
          const defaultTpl = templates.find(t => t.templateCode === 'GENERIC_DIGITAL_TWIN') ||
                             templates.find(t => (t.category || '').toUpperCase() === 'GENERAL') ||
                             templates[0];
          if (defaultTpl) {
            setSelectedTemplates([defaultTpl]);
            setCategory(defaultTpl.category || 'GENERAL');
            if (defaultTpl.resourceType) setType(defaultTpl.resourceType);
            const initialProps: Record<string, unknown> = { ...(defaultTpl.defaultProperties || {}) };
            if (defaultTpl.propertySchema) {
              defaultTpl.propertySchema.forEach(item => {
                if (item.defaultValue !== undefined && initialProps[item.key] === undefined) {
                  initialProps[item.key] = item.defaultValue;
                }
              });
            }
            setInheritedValues(initialProps);
          }
        }
      })
      .catch(err => console.error('Failed to load templates for studio:', err));
  }, [editingResource]);

  // Handle template toggle (multi-select for general/software, single-select for OT_DEVICE)
  const handleToggleTemplate = (tpl: ResourceTemplateItem) => {
    const isOtDevice = (category || tpl.category || '').toUpperCase() === 'OT_DEVICE';
    setSelectedTemplates(prev => {
      let updated: ResourceTemplateItem[];
      if (isOtDevice) {
        const exists = prev.some(t => t.templateCode === tpl.templateCode);
        updated = exists ? [] : [tpl];
      } else {
        const exists = prev.some(t => t.templateCode === tpl.templateCode);
        if (exists) {
          updated = prev.filter(t => t.templateCode !== tpl.templateCode);
        } else {
          updated = [...prev, tpl];
        }
      }

      // Re-aggregate default properties strictly from selected templates
      const mergedDefaults: Record<string, unknown> = {};
      updated.forEach(t => {
        if (t.defaultProperties) {
          Object.entries(t.defaultProperties).forEach(([k, v]) => {
            if (mergedDefaults[k] === undefined) {
              mergedDefaults[k] = v;
            }
          });
        }
        if (t.propertySchema) {
          t.propertySchema.forEach(item => {
            if (item.defaultValue !== undefined && mergedDefaults[item.key] === undefined) {
              mergedDefaults[item.key] = item.defaultValue;
            }
          });
        }
      });

      // Pure template defaults - no phantom coordinate accumulation
      setInheritedValues(mergedDefaults);

      if (updated.length > 0) {
        setType(updated[0].resourceType || '');
        if (!name) setName(updated[0].templateName);
      }
      return updated;
    });
  };

  // Handle category change: switches active category and keeps selection strictly within that category
  const handleChangeCategory = (newCat: string) => {
    setCategory(newCat);
    const templatesInNewCat = availableTemplates.filter(
      t => (t.category || 'GENERAL').toUpperCase() === newCat.toUpperCase()
    );
    const retained = selectedTemplates.filter(
      t => (t.category || 'GENERAL').toUpperCase() === newCat.toUpperCase()
    );

    if (retained.length > 0) {
      setSelectedTemplates(retained);
    } else if (templatesInNewCat.length > 0) {
      const first = templatesInNewCat[0];
      setSelectedTemplates([first]);
      const initialProps: Record<string, unknown> = { ...(first.defaultProperties || {}) };
      if (first.propertySchema) {
        first.propertySchema.forEach(item => {
          if (item.defaultValue !== undefined && initialProps[item.key] === undefined) {
            initialProps[item.key] = item.defaultValue;
          }
        });
      }
      setInheritedValues(initialProps);
      if (!type) setType(first.resourceType || '');
    } else {
      setSelectedTemplates([]);
      setInheritedValues({});
    }
  };

  // Initialize existing values when editing
  useEffect(() => {
    if (editingResource) {
      setResourceId(editingResource.resourceId);
      setName(editingResource.name);
      setStatus(editingResource.status || 'ACTIVE');
      setApplication(editingResource.application || '');
      setDescription(editingResource.description || '');
      setDocumentationUrl(editingResource.documentationUrl || '');

      const templateDefaults: Record<string, unknown> = {};
      if (combinedTemplate) {
        if (combinedTemplate.defaultProperties) Object.assign(templateDefaults, combinedTemplate.defaultProperties);
        if (combinedTemplate.propertySchema) {
          combinedTemplate.propertySchema.forEach(item => {
            if (item.defaultValue !== undefined && templateDefaults[item.key] === undefined) {
              templateDefaults[item.key] = item.defaultValue;
            }
          });
        }
      }

      const existingProps: Record<string, unknown> = {
        ...templateDefaults,
        ...(editingResource.templateProperties || {}),
        ...(editingResource.effectiveProperties || {}),
        ...(editingResource.customProperties || {})
      };

      if (editingResource.host && !existingProps['host'] && !existingProps['ip'] && !existingProps['ipAddress']) {
        existingProps['host'] = editingResource.host;
      }
      if (editingResource.port && !existingProps['port']) {
        existingProps['port'] = editingResource.port;
      }
      if (editingResource.protocol && !existingProps['protocol']) {
        existingProps['protocol'] = editingResource.protocol;
      }

      if (Array.isArray(existingProps.properties)) {
        const loadedCustom: CustomPropertyRow[] = [];
        const authKeys: string[] = [];
        existingProps.properties.forEach((p: Record<string, unknown>) => {
          if (p && p.key) {
            const k = String(p.key);
            if (p.useForAuth) authKeys.push(k);
            loadedCustom.push({
              id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              key: k,
              type: (p.type as CustomPropertyRow['type']) || (p.isSecret ? 'SECRET' : 'STRING'),
              value: String(p.value ?? ''),
              isSecretVisible: false,
              useForAuth: Boolean(p.useForAuth)
            });
          }
        });
        if (loadedCustom.length > 0) setCustomProperties(loadedCustom);
        else setCustomProperties([]);
        if (authKeys.length > 0) setInheritedAuthKeys(authKeys);
        else setInheritedAuthKeys([]);
      } else {
        setCustomProperties([]);
        setInheritedAuthKeys([]);
      }

      setInheritedValues(existingProps);

      if (editingResource.methodsConfig) {
        setMethodConfigs(editingResource.methodsConfig as MethodConfigState);
      } else {
        setMethodConfigs({});
      }
    }
  }, [editingResource, combinedTemplate]);

  // Inherited property change handler
  const handleChangeInheritedValue = (key: string, val: unknown) => {
    setInheritedValues(prev => ({ ...prev, [key]: val }));
  };

  const handleToggleInheritedAuth = (key: string) => {
    setInheritedAuthKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Custom property handlers
  const handleAddCustomProperty = () => {
    setCustomProperties(prev => [
      ...prev,
      {
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        key: '',
        type: 'STRING',
        value: '',
        isSecretVisible: false,
        useForAuth: false
      }
    ]);
  };

  const handleUpdateCustomProperty = (id: string, updates: Partial<CustomPropertyRow>) => {
    setCustomProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleRemoveCustomProperty = (id: string) => {
    setCustomProperties(prev => prev.filter(p => p.id !== id));
  };

  // Convert custom properties list into a key-value record
  const customPropertiesRecord = useMemo(() => {
    const rec: Record<string, unknown> = {};
    customProperties.forEach(p => {
      if (p.key.trim()) {
        let parsedVal: unknown = p.value;
        if (p.type === 'NUMBER') parsedVal = Number(p.value) || 0;
        else if (p.type === 'BOOLEAN') parsedVal = p.value === 'true';
        rec[p.key.trim()] = parsedVal;
      }
    });
    return rec;
  }, [customProperties]);

  // Dynamically extract connection coordinates from properties
  const connectionCoords = useMemo(() => {
    const merged = {
      ...inheritedValues,
      ...customPropertiesRecord
    };
    return extractConnectionCoordinates(merged, combinedTemplate);
  }, [inheritedValues, customPropertiesRecord, combinedTemplate]);

  // Step validation
  const isStepComplete = (stepId: number): boolean => {
    if (stepId === 1) return Boolean(resourceId.trim() && name.trim() && category.trim() && (selectedTemplates.length > 0 || isEditing));
    if (stepId === 2) return isStepComplete(1);
    if (stepId === 3) return isStepComplete(2);
    if (stepId === 4) return isStepComplete(3);
    return false;
  };

  // Construct current payload snapshot
  const buildCurrentPayload = useCallback((): CreateResourcePayload => {
    const effTemplateCode = selectedTemplates.length > 0 
      ? selectedTemplates.map(t => t.templateCode).join(',')
      : editingResource?.templateCode;

    const effType = (selectedTemplates[0]?.resourceType || type || editingResource?.type || 'GENERIC').trim();

    const structuredProperties = [
      ...customProperties.filter(c => c.key.trim()).map(c => ({
        key: c.key.trim(),
        value: c.value,
        type: c.type,
        isSecret: c.type === 'SECRET',
        useForAuth: Boolean(c.useForAuth)
      }))
    ];

    const customPropsPayload: Record<string, unknown> = {
      ...customPropertiesRecord
    };
    if (structuredProperties.length > 0) {
      customPropsPayload['properties'] = structuredProperties;
    }

    const allMerged = {
      ...inheritedValues,
      ...customPropsPayload
    };

    const { host: effHost, port: effPort, protocol: effProto } = extractConnectionCoordinates(
      allMerged,
      combinedTemplate
    );

    return {
      resourceId: resourceId.trim(),
      name: name.trim(),
      type: effType,
      category: (category || 'GENERAL').trim(),
      templateCode: effTemplateCode,
      status,
      host: effHost,
      port: effPort,
      protocol: effProto,
      application: application.trim() || undefined,
      description: description.trim() || undefined,
      documentationUrl: documentationUrl.trim() || undefined,
      templateProperties: inheritedValues,
      customProperties: customPropsPayload,
      methodsConfig: methodConfigs
    };
  }, [
    resourceId,
    name,
    category,
    type,
    status,
    application,
    description,
    documentationUrl,
    selectedTemplates,
    combinedTemplate,
    editingResource,
    inheritedValues,
    customPropertiesRecord,
    customProperties,
    methodConfigs
  ]);

  // Tab change handler: persists data and auto-saves so the user doesn't lose anything
  const handleStepTransition = async (targetStepId: number) => {
    if (targetStepId === currentStep) return;

    const payload = buildCurrentPayload();

    try {
      const draftKey = `res_draft_${resourceId.trim() || 'new'}`;
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      // ignore localStorage quota issues
    }

    if (isEditing && resourceId.trim() && name.trim()) {
      setIsAutoSaving(true);
      try {
        await resourceService.updateResource(resourceId.trim(), payload);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
      } catch (err) {
        console.warn('Auto-save on tab change encountered an issue:', err);
      } finally {
        setIsAutoSaving(false);
      }
    }

    setCurrentStep(targetStepId);
  };

  // Persistence Save Action
  const handleSave = async () => {
    if (!resourceId.trim() || !name.trim()) {
      setErrorMessage('Resource ID and Name are required in Step 1 Definition.');
      setCurrentStep(1);
      return;
    }
    if (selectedTemplates.length === 0 && !isEditing) {
      setErrorMessage('Please select at least one template blueprint in Step 1.');
      setCurrentStep(1);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload = buildCurrentPayload();

    try {
      let result: ResourceItem;
      if (isEditing) {
        result = await resourceService.updateResource(resourceId, payload);
      } else {
        result = await resourceService.createResource(payload);
      }
      try {
        localStorage.removeItem(`res_draft_${resourceId.trim() || 'new'}`);
      } catch {
        // ignore
      }
      onSaveSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save resource';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* 1. Header Navigation Bar with Breadcrumbs & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            title="Return to Resources"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Resources &gt; {isEditing ? `Edit ${editingResource?.resourceId}` : 'Create New Resource Studio'}
            </div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEditing ? `Edit Resource: ${name || editingResource?.name}` : 'Resource Creation & Configuration Studio'}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Auto-save Status Badge */}
          {isAutoSaving ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#38BDF8' }}>
              <Loader2 size={13} className="animate-spin" />
              <span>Auto-saving tab changes...</span>
            </div>
          ) : lastSavedTime ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10B981' }}>
              <CheckCircle2 size={13} />
              <span>Saved at {lastSavedTime}</span>
            </div>
          ) : null}

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
            disabled={isSaving || !resourceId.trim() || !name.trim() || (selectedTemplates.length === 0 && !isEditing)}
            leftIcon={isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            style={{ minHeight: '40px', padding: '0 20px', backgroundColor: '#10B981', borderColor: '#10B981' }}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save & Activate'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="danger" title="Validation / Storage Error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* 2. Stepper Component */}
      <StudioStepper
        steps={studioSteps}
        currentStep={currentStep}
        onSelectStep={stepId => handleStepTransition(stepId)}
        isStepComplete={isStepComplete}
        isEditing={isEditing}
      />

      {/* 3. Step Content Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {currentStep === 1 && (
          <Step1Identity
            availableTemplates={availableTemplates}
            selectedTemplates={selectedTemplates}
            onToggleTemplate={handleToggleTemplate}
            category={category}
            onChangeCategory={handleChangeCategory}
            type={type}
            onChangeType={setType}
            resourceId={resourceId}
            onChangeResourceId={setResourceId}
            name={name}
            onChangeName={setName}
            application={application}
            onChangeApplication={setApplication}
            description={description}
            onChangeDescription={setDescription}
            documentationUrl={documentationUrl}
            onChangeDocumentationUrl={setDocumentationUrl}
            status={status}
            onChangeStatus={setStatus}
            isEditing={isEditing}
            onNext={() => handleStepTransition(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2Properties
            selectedTemplate={combinedTemplate}
            category={category}
            inheritedValues={inheritedValues}
            onChangeInheritedValue={handleChangeInheritedValue}
            customProperties={customProperties}
            onAddCustomProperty={handleAddCustomProperty}
            onUpdateCustomProperty={handleUpdateCustomProperty}
            onRemoveCustomProperty={handleRemoveCustomProperty}
            inheritedAuthKeys={inheritedAuthKeys}
            onToggleInheritedAuth={handleToggleInheritedAuth}
            onBack={() => handleStepTransition(1)}
            onNext={() => handleStepTransition(3)}
          />
        )}

        {currentStep === 3 && (
          isSoftware ? (
            <Step3MethodMapping
              selectedTemplate={combinedTemplate}
              resourceId={resourceId}
              host={connectionCoords.host}
              port={connectionCoords.port ?? ''}
              protocol={connectionCoords.protocol}
              inheritedValues={inheritedValues}
              customProperties={customProperties}
              methodConfigs={methodConfigs}
              onChangeMethodConfigs={setMethodConfigs}
              onBack={() => handleStepTransition(2)}
              onNext={() => handleStepTransition(4)}
            />
          ) : (
            <Step3CodeMethodConfig
              selectedTemplate={combinedTemplate}
              resourceId={resourceId}
              category={category}
              inheritedValues={inheritedValues}
              customProperties={customProperties}
              methodConfigs={methodConfigs}
              onChangeMethodConfigs={setMethodConfigs}
              onBack={() => handleStepTransition(2)}
              onNext={() => handleStepTransition(4)}
            />
          )
        )}

        {currentStep === 4 && (
          <Step4ValidationSandbox
            resourceId={resourceId}
            name={name}
            application={application}
            host={connectionCoords.host}
            port={connectionCoords.port ?? ''}
            protocol={connectionCoords.protocol}
            status={status}
            description={description}
            documentationUrl={documentationUrl}
            selectedTemplate={combinedTemplate}
            inheritedValues={inheritedValues}
            customPropertiesRecord={customPropertiesRecord}
            methodConfigs={methodConfigs}
            isEditing={isEditing}
            isSaving={isSaving}
            onBack={() => handleStepTransition(3)}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};
