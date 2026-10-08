import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Code2, 
  Sparkles, 
  ListFilter
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { MethodDefinition, MethodTraceLog } from '../types/resourceEnums';
import { ResourceTemplateItem, PropertySchemaItem, testMethodExecution } from '../../../services/resourceTemplateService';
import { CustomPropertyRow } from './Step2Properties';
import { MethodConfigState } from './Step3MethodMapping';
import { ServiceMethodIdeWorkspace } from '../components/templateStudio/ServiceMethodIdeWorkspace';
import { DefinedMethodsTableView } from '../components/templateStudio/DefinedMethodsTableView';

export interface Step3CodeMethodConfigProps {
  selectedTemplate: ResourceTemplateItem | null;
  resourceId: string;
  category?: string;
  inheritedValues: Record<string, unknown>;
  customProperties: CustomPropertyRow[];
  methodConfigs: MethodConfigState;
  onChangeMethodConfigs: (configs: MethodConfigState) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step3CodeMethodConfig: React.FC<Step3CodeMethodConfigProps> = ({
  selectedTemplate,
  resourceId,
  category = 'PHYSICAL',
  inheritedValues,
  customProperties,
  methodConfigs,
  onChangeMethodConfigs,
  onBack,
  onNext
}) => {
  const [activeMode, setActiveMode] = useState<'IDE_WORKSPACE' | 'LIST'>('IDE_WORKSPACE');
  const [selectedMethodName, setSelectedMethodName] = useState<string>('');

  // Extract merged available properties for IDE parameter autocomplete & write-back
  const availableProperties = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(inheritedValues).forEach(k => keys.add(k));
    customProperties.forEach(c => {
      if (c.key.trim()) keys.add(c.key.trim());
    });
    return Array.from(keys);
  }, [inheritedValues, customProperties]);

  const templateProperties: PropertySchemaItem[] = useMemo(() => {
    return selectedTemplate?.propertySchema || [];
  }, [selectedTemplate]);

  // Unified list of methods: template defaults + resource configured methods
  const methodsList: MethodDefinition[] = useMemo(() => {
    const list: MethodDefinition[] = [];
    const seen = new Set<string>();

    // 1. Inherited template methods
    if (selectedTemplate?.methodsSchema) {
      selectedTemplate.methodsSchema.forEach(m => {
        seen.add(m.name);
        const configured = methodConfigs[m.name];
        if (configured) {
          list.push({
            ...m,
            displayName: configured.displayName || m.displayName,
            language: configured.language || m.language || 'JAVA',
            javaCode: configured.javaCode ?? m.javaCode,
            pythonCode: configured.pythonCode ?? m.pythonCode,
            script: configured.script ?? m.script,
            inputs: configured.inputs ?? m.inputs,
            outputType: configured.outputType ?? m.outputType,
            storeResultToProperty: configured.storeResultToProperty ?? m.storeResultToProperty
          });
        } else {
          list.push(m);
        }
      });
    }

    // 2. Custom code methods added directly in resource config
    Object.keys(methodConfigs).forEach(key => {
      if (!seen.has(key)) {
        seen.add(key);
        const cfg = methodConfigs[key];
        list.push({
          name: key,
          displayName: cfg.displayName || key,
          category: 'CONTROL',
          description: `Custom code method for ${resourceId}`,
          language: cfg.language || 'JAVA',
          javaCode: cfg.javaCode,
          pythonCode: cfg.pythonCode,
          script: cfg.script,
          inputs: cfg.inputs,
          outputType: cfg.outputType,
          storeResultToProperty: cfg.storeResultToProperty
        });
      }
    });

    return list;
  }, [selectedTemplate, methodConfigs, resourceId]);

  // Set default selected method on mount or change
  useEffect(() => {
    if (methodsList.length > 0 && (!selectedMethodName || !methodsList.some(m => m.name === selectedMethodName))) {
      setSelectedMethodName(methodsList[0].name);
    }
  }, [methodsList, selectedMethodName]);

  const activeMethod = useMemo(() => {
    return methodsList.find(m => m.name === selectedMethodName) || methodsList[0];
  }, [methodsList, selectedMethodName]);

  // Handle saving a method from the 3-Column IDE Workspace
  const handleSaveMethod = useCallback((updated: MethodDefinition) => {
    const effScript = updated.language === 'PYTHON' ? (updated.pythonCode || updated.javaCode || '') : (updated.javaCode || '');
    const newConfigs: MethodConfigState = {
      ...methodConfigs,
      [updated.name]: {
        displayName: updated.displayName || updated.name,
        operationCode: updated.name,
        language: updated.language || 'JAVA',
        javaCode: updated.language === 'JAVA' ? updated.javaCode : undefined,
        pythonCode: updated.language === 'PYTHON' ? (updated.pythonCode || updated.javaCode) : undefined,
        script: effScript,
        inputs: updated.inputs,
        outputType: updated.outputType,
        storeResultToProperty: updated.storeResultToProperty,
        type: 'CODE_METHOD'
      }
    };
    onChangeMethodConfigs(newConfigs);
    setSelectedMethodName(updated.name);
  }, [methodConfigs, onChangeMethodConfigs]);

  // Handle adding a new custom code method
  const handleAddNewMethod = useCallback(() => {
    const nextIdx = methodsList.length + 1;
    const newName = `METHOD_${nextIdx}`;
    const newConfigs: MethodConfigState = {
      ...methodConfigs,
      [newName]: {
        displayName: `Method ${nextIdx}`,
        operationCode: newName,
        language: 'JAVA',
        javaCode: '// Dynamic Java Logic\nreturn null;',
        inputs: [],
        outputType: 'OBJECT',
        type: 'CODE_METHOD'
      }
    };
    onChangeMethodConfigs(newConfigs);
    setSelectedMethodName(newName);
    setActiveMode('IDE_WORKSPACE');
  }, [methodsList, methodConfigs, onChangeMethodConfigs]);

  // Handle removing a custom method
  const handleRemoveMethod = useCallback((methodName: string) => {
    const updated = { ...methodConfigs };
    delete updated[methodName];
    onChangeMethodConfigs(updated);
    if (selectedMethodName === methodName) {
      const remaining = methodsList.filter(m => m.name !== methodName);
      setSelectedMethodName(remaining[0]?.name || '');
    }
  }, [methodConfigs, onChangeMethodConfigs, selectedMethodName, methodsList]);

  // Execute dynamic test run via testMethodExecution using unified live properties
  const handleExecuteTest = useCallback(async (
    methodName: string,
    scriptCode: string,
    params: Record<string, unknown>,
    storeProp?: string
  ): Promise<{
    success: boolean;
    data?: unknown;
    traceLogs?: MethodTraceLog[];
    updatedProperties?: Record<string, unknown>;
    executionTimeMs?: number;
    error?: string;
  }> => {
    const unifiedProperties: Record<string, unknown> = { ...inheritedValues };
    customProperties.forEach(c => {
      if (c.key.trim()) unifiedProperties[c.key.trim()] = c.value;
    });

    const isPy = activeMethod?.language === 'PYTHON';

    try {
      const res = await testMethodExecution({
        methodName,
        language: isPy ? 'PYTHON' : 'JAVA',
        javaCode: isPy ? undefined : scriptCode,
        script: scriptCode,
        parameters: params,
        properties: unifiedProperties,
        storeResultToProperty: storeProp
      });

      return {
        success: res.success,
        data: res.data,
        traceLogs: res.traceLogs,
        updatedProperties: res.updatedProperties,
        executionTimeMs: res.executionTimeMs,
        error: res.error
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: msg
      };
    }
  }, [inheritedValues, customProperties, activeMethod]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Notice Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981'
          }}>
            <Code2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {category.toUpperCase()} Resource: Java & Python Service Configuration Screen
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Physical and general resources execute high-performance compiled Java bytecode or cached Python scripts (&lt; 150µs PyCode cache).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={handleAddNewMethod}
          >
            New Service
          </Button>
        </div>
      </div>

      {/* Mode Switcher and Quick Service Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Design Mode:
          </span>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={() => setActiveMode('IDE_WORKSPACE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeMode === 'IDE_WORKSPACE' ? '#10B981' : 'transparent',
                color: activeMode === 'IDE_WORKSPACE' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={13} /> 3-Column Service IDE
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('LIST')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeMode === 'LIST' ? '#10B981' : 'transparent',
                color: activeMode === 'LIST' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ListFilter size={13} /> Defined Services ({methodsList.length})
            </button>
          </div>

          {activeMode === 'IDE_WORKSPACE' && methodsList.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Editing:</span>
              <select
                value={selectedMethodName}
                onChange={e => setSelectedMethodName(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11.5px',
                  fontFamily: 'monospace'
                }}
              >
                {methodsList.map((m, idx) => (
                  <option key={idx} value={m.name}>{m.displayName ? `${m.name} (${m.displayName})` : m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3-Column Method IDE Workspace */}
      {activeMode === 'IDE_WORKSPACE' && (
        <div>
          {activeMethod ? (
            <ServiceMethodIdeWorkspace
              method={activeMethod}
              availableProperties={availableProperties}
              templateProperties={templateProperties}
              onSave={handleSaveMethod}
              onExecuteTest={handleExecuteTest}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              border: '1px dashed var(--border-default)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <Code2 size={36} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Code Methods Configured
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Add your first Java or Python method to execute dynamic logic directly on this physical or general resource.
              </p>
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={handleAddNewMethod}>
                Add Code Method
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Methods Table View (Structured Rows) */}
      {activeMode === 'LIST' && (
        <DefinedMethodsTableView
          methods={methodsList}
          onOpenInIde={(idx: number) => {
            const target = methodsList[idx];
            if (target) {
              setSelectedMethodName(target.name);
              setActiveMode('IDE_WORKSPACE');
            }
          }}
          onAddMethod={handleAddNewMethod}
          onRemoveMethod={(idx: number) => {
            const target = methodsList[idx];
            if (target) {
              handleRemoveMethod(target.name);
            }
          }}
        />
      )}

      {/* Bottom Step Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        marginTop: '8px'
      }}>
        <Button
          variant="secondary"
          leftIcon={<ArrowLeft size={14} />}
          onClick={onBack}
        >
          Back to Properties Matrix
        </Button>
        <Button
          variant="primary"
          rightIcon={<ArrowRight size={14} />}
          onClick={onNext}
        >
          Next to Validation Sandbox
        </Button>
      </div>
    </div>
  );
};
