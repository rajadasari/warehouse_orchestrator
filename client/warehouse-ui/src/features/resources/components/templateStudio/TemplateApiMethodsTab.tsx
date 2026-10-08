import React, { useState, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Globe, 
  Trash2
} from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { MethodDefinition } from '../../types/resourceEnums';
import { PropertySchemaItem } from '../../../../services/resourceTemplateService';
import { 
  MethodExpansionDrawer, 
  MethodDrawerConfig, 
  AvailableProperty 
} from '../../studio/components/MethodExpansionDrawer';
import { SimulationResult } from '../../studio/components/MethodSimulationBox';
import { testRunMappingApi } from '../../../../services/apiMappingService';

export interface TemplateApiMethodsTabProps {
  methods: MethodDefinition[];
  availableProperties: string[];
  templateProperties: PropertySchemaItem[];
  handleAddMethod: () => void;
  handleUpdateMethod: (index: number, patch: Partial<MethodDefinition>) => void;
  handleRemoveMethod: (index: number) => void;
  commandInput?: string;
  setCommandInput?: (val: string) => void;
  supportedCommands?: string[];
  handleAddCommand?: () => void;
  handleRemoveCommand?: (cmd: string) => void;
}

export const TemplateApiMethodsTab: React.FC<TemplateApiMethodsTabProps> = ({
  methods,
  templateProperties = [],
  handleAddMethod,
  handleUpdateMethod,
  handleRemoveMethod,
  commandInput = '',
  setCommandInput,
  supportedCommands = [],
  handleAddCommand,
  handleRemoveCommand
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(methods.length > 0 ? 0 : null);

  // Convert template properties into AvailableProperty structure for drawer bindings
  const drawerAvailableProps: AvailableProperty[] = useMemo(() => {
    return templateProperties.map(p => ({
      key: p.key,
      label: p.label || p.key,
      type: String(p.type || 'STRING'),
      source: 'CUSTOM',
      sampleValue: p.defaultValue !== undefined ? String(p.defaultValue) : ''
    }));
  }, [templateProperties]);

  const currentMethod = expandedIndex !== null && expandedIndex < methods.length ? methods[expandedIndex] : null;

  // Adapt MethodDefinition to MethodDrawerConfig
  const getDrawerConfig = (m: MethodDefinition): MethodDrawerConfig => {
    return {
      httpMethod: m.httpMethod || 'POST',
      port: '',
      urlPath: m.pathTemplate || '/api/v1/resource/endpoint',
      displayName: m.displayName || m.name,
      operationCode: m.name,
      headersTemplate: (m as unknown as { headersTemplate?: string }).headersTemplate || 
        '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "Bearer <token>"\n}',
      payloadTemplate: (m as unknown as { payloadTemplate?: string }).payloadTemplate || '{\n  \n}',
      propertyBindings: (m.parametersSchema as Record<string, string>) || {},
      pathVariables: {},
      mappingId: undefined
    };
  };

  const handleDrawerConfigChange = (updated: MethodDrawerConfig) => {
    if (expandedIndex === null || expandedIndex >= methods.length) return;
    handleUpdateMethod(expandedIndex, {
      name: updated.operationCode || methods[expandedIndex].name,
      displayName: updated.displayName,
      httpMethod: updated.httpMethod,
      pathTemplate: updated.urlPath,
      category: 'SOFTWARE_API',
      parametersSchema: updated.propertyBindings,
      ...({
        headersTemplate: updated.headersTemplate,
        payloadTemplate: updated.payloadTemplate
      } as Record<string, unknown>)
    });
  };

  const handleSimulate = useCallback(
    async (
      resolvedUrl: string,
      payload: Record<string, string>,
      payloadTemplateOverride?: string,
      headersTemplateOverride?: string
    ): Promise<SimulationResult> => {
      try {
        const resp = await testRunMappingApi({
          resourceId: 'TEMPLATE_SANDBOX',
          endpointUrl: resolvedUrl,
          httpMethod: currentMethod?.httpMethod || 'POST',
          headersTemplate: headersTemplateOverride || '{"Content-Type": "application/json"}',
          payloadTemplate: payloadTemplateOverride || JSON.stringify(payload),
          testContext: payload
        });
        return {
          success: resp.success ?? false,
          statusCode: resp.statusCode ?? 200,
          responsePayload: resp.responsePayload ?? JSON.stringify(resp),
          targetUrl: resp.targetUrl ?? resolvedUrl,
          executionTimeMs: 0,
          error: resp.error
        };
      } catch (err) {
        return {
          success: false,
          statusCode: 500,
          responsePayload: '',
          targetUrl: resolvedUrl,
          executionTimeMs: 0,
          error: err instanceof Error ? err.message : 'API Simulation failed'
        };
      }
    },
    [currentMethod]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Notice Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
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
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#3B82F6'
          }}>
            <Globe size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Software Resource Template: API Method Configuration Screen
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Software archetypes dispatch operations via REST API endpoints, token headers, and JSON request payloads.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => {
              handleAddMethod();
              setExpandedIndex(methods.length);
            }}
          >
            Add API Method
          </Button>
        </div>
      </div>

      {methods.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          border: '1px dashed var(--border-default)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          textAlign: 'center'
        }}>
          <Globe size={36} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No API Services Defined
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '420px' }}>
            Declare REST endpoints, HTTP service verbs (GET, POST, PUT, DELETE), and payload templates that resources created from this template will inherit.
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => {
              handleAddMethod();
              setExpandedIndex(0);
            }}
          >
            Add First API Service
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: currentMethod ? '340px 1fr' : '1fr', gap: '16px' }}>
          {/* Services List Column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '12px',
            maxHeight: 'calc(100vh - 280px)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Configured API Services ({methods.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus size={12} />}
                onClick={() => {
                  handleAddMethod();
                  setExpandedIndex(methods.length);
                }}
                style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
              >
                Add
              </Button>
            </div>

            {methods.map((m, idx) => {
              const isSelected = expandedIndex === idx;
              const verb = (m.httpMethod || 'POST').toUpperCase();
              return (
                <div
                  key={idx}
                  onClick={() => setExpandedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #3B82F6' : '1px solid var(--border-default)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: verb === 'GET' ? 'rgba(16, 185, 129, 0.15)' : verb === 'POST' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: verb === 'GET' ? '#10B981' : verb === 'POST' ? '#38BDF8' : '#F59E0B'
                      }}>
                        {verb}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {m.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.pathTemplate || '/api/v1/...'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMethod(idx);
                      if (expandedIndex === idx) setExpandedIndex(null);
                    }}
                    title="Remove method"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      padding: '4px',
                      borderRadius: '4px',
                      marginLeft: '6px'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Method Detail Drawer / Configurator */}
          {currentMethod && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto'
            }}>
              <MethodExpansionDrawer
                methodName={currentMethod.name}
                methodType={currentMethod.category || 'SOFTWARE_API'}
                config={getDrawerConfig(currentMethod)}
                onConfigChange={handleDrawerConfigChange}
                availableProperties={drawerAvailableProps}
                host="software-gateway.internal"
                protocol="HTTPS"
                defaultPort="443"
                isCustom={true}
                onSave={() => {}}
                onSimulate={handleSimulate}
              />
            </div>
          )}
        </div>
      )}

      {/* Supported Commands Panel */}
      {setCommandInput && handleAddCommand && handleRemoveCommand && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px 16px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Supported Industrial Commands
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Direct machine control verbs mapped to software actions
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. SYNC_INVENTORY"
                value={commandInput}
                onChange={e => setCommandInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCommand();
                  }
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  width: '180px'
                }}
              />
              <Button variant="secondary" size="sm" onClick={handleAddCommand}>
                Add Command
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {supportedCommands.map(cmd => (
              <span
                key={cmd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#3B82F6',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace'
                }}
              >
                {cmd}
                <button
                  type="button"
                  onClick={() => handleRemoveCommand(cmd)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
