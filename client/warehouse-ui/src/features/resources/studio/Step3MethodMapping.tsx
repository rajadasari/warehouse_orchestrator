import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Globe,
  Layers,
  Wrench,
  Loader2,
} from 'lucide-react';
import { MethodDefinition } from '../types/resourceEnums';
import { ResourceTemplateItem } from '../../../services/resourceTemplateService';
import { CustomPropertyRow } from './Step2Properties';
import { Button } from '../../../components/common/Button';
import { computeSyntheticEndpoint } from './endpointUtils';
import {
  ApiIntegrationMapping,
  fetchMappingsApi,
  createMappingApi,
  updateMappingApi,
  deleteMappingApi,
  testRunMappingApi,
} from '../../../services/apiMappingService';

import { MethodTableRow } from './components/MethodTableRow';
import {
  MethodExpansionDrawer,
  MethodDrawerConfig,
  AvailableProperty,
} from './components/MethodExpansionDrawer';
import { SimulationResult } from './components/MethodSimulationBox';
import { TokenRefreshConfig } from './components/TokenLifecycleCard';

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export interface MethodConfigState {
  [methodName: string]: {
    httpMethod?: string;
    port?: string;
    path?: string;
    displayName?: string;
    operationCode?: string;
    mappingId?: string;
    headersTemplate?: string;
    payloadTemplate?: string;
    parameterBindings?: Record<string, string>;
    pathVariables?: Record<string, string>;
    propertyBindings?: Record<string, string>;
    tokenRefreshConfig?: TokenRefreshConfig;
    language?: 'JAVA' | 'PYTHON' | 'JAVASCRIPT';
    javaCode?: string;
    pythonCode?: string;
    script?: string;
    inputs?: Array<{ name: string; type: string; defaultValue?: string; description?: string }>;
    outputType?: string;
    storeResultToProperty?: string;
    type?: string;
  };
}

export interface CustomMethodRow {
  id: string;
  name: string;
  displayName: string;
  httpMethod: string;
  port: string;
  urlPath: string;
  type: string;
  safetyTier?: string;
  /** Backend api_integration_mapping UUID. */
  mappingId?: string;
}

export interface Step3MethodMappingProps {
  selectedTemplate: ResourceTemplateItem | null;
  /** Resource identity — used as targetResourceId for api_integration_mapping. */
  resourceId: string;
  host: string;
  port: number | '';
  protocol: string;
  inheritedValues: Record<string, unknown>;
  customProperties: CustomPropertyRow[];
  methodConfigs: MethodConfigState;
  onChangeMethodConfigs: (configs: MethodConfigState) => void;
  onBack: () => void;
  onNext: () => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const Step3MethodMapping: React.FC<Step3MethodMappingProps> = ({
  selectedTemplate,
  resourceId,
  host,
  port,
  protocol,
  inheritedValues,
  customProperties,
  methodConfigs,
  onChangeMethodConfigs,
  onBack,
  onNext,
}) => {
  const defaultMethods: MethodDefinition[] = selectedTemplate?.methodsSchema ?? [];

  /** Expanded row tracker — strictly only one unique method key expanded at a time. */
  const [expandedMethodKey, setExpandedMethodKey] = useState<string | null>(null);

  /** Custom extension methods loaded from api_integration_mapping + locally added. */
  const [customMethods, setCustomMethods] = useState<CustomMethodRow[]>([]);

  /** Loading state for initial mapping fetch. */
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);

  /** Saving state for individual method save actions. */
  const [savingMethod, setSavingMethod] = useState<string | null>(null);

  /** Cached token from authentication test run to inject into subsequent service tests. */
  const [cachedSimulationToken, setCachedSimulationToken] = useState<string>('');

  /* ---------- Load existing api_integration_mapping records on mount ---------- */

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;

    async function loadMappings() {
      setIsLoadingMappings(true);
      try {
        const mappings = await fetchMappingsApi(resourceId);
        if (cancelled) return;

        const loaded: CustomMethodRow[] = [];
        // Only start from default blueprint methods defined in the template
        const configPatches: MethodConfigState = {};
        defaultMethods.forEach(dm => {
          if (methodConfigs[dm.name]) {
            configPatches[dm.name] = { ...methodConfigs[dm.name] };
          }
        });

        mappings.forEach(m => {
          const operationKey = m.operationType || m.mappingCode;

          // Check if this maps to a default method
          const isDefault = defaultMethods.some(
            dm => dm.name === operationKey,
          );

          const tokenRefreshConfig = (() => {
            try {
              return m.conditionRules && m.conditionRules !== '[]' ? JSON.parse(m.conditionRules) : undefined;
            } catch {
              return undefined;
            }
          })();

          if (isDefault) {
            // Hydrate default method config from persisted mapping
            configPatches[operationKey] = {
              ...configPatches[operationKey],
              httpMethod: m.httpMethod,
              port: '',
              path: m.endpointUrl,
              displayName: m.name,
              mappingId: m.id,
              headersTemplate: m.headersTemplate,
              payloadTemplate: m.payloadTemplate,
              parameterBindings: safeParseJson(m.payloadTemplate),
              propertyBindings: safeParseJson(m.payloadTemplate),
              pathVariables: {},
              tokenRefreshConfig,
            };
          } else {
            // Custom extension method
            loaded.push({
              id: m.id ?? `mapping-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: operationKey,
              displayName: m.name,
              httpMethod: m.httpMethod,
              port: '',
              urlPath: m.endpointUrl,
              type: 'EXECUTION',
              mappingId: m.id,
            });

            configPatches[operationKey] = {
              ...configPatches[operationKey],
              httpMethod: m.httpMethod,
              port: '',
              path: m.endpointUrl,
              displayName: m.name,
              mappingId: m.id,
              headersTemplate: m.headersTemplate,
              payloadTemplate: m.payloadTemplate,
              parameterBindings: safeParseJson(m.payloadTemplate),
              propertyBindings: safeParseJson(m.payloadTemplate),
              pathVariables: {},
              tokenRefreshConfig,
            };
          }
        });

        setCustomMethods(loaded);
        onChangeMethodConfigs(configPatches);
      } catch (err) {
        console.error('Failed to load api_integration_mappings:', err);
      } finally {
        if (!cancelled) setIsLoadingMappings(false);
      }
    }

    loadMappings();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]);

  /* ---------- Unified property pool from Step 2 ---------- */

  const availableProperties: AvailableProperty[] = useMemo(() => {
    const list: AvailableProperty[] = [];

    if (selectedTemplate?.propertySchema) {
      selectedTemplate.propertySchema.forEach(p => {
        const val = inheritedValues[p.key] ?? p.defaultValue ?? '';
        list.push({
          key: p.key,
          label: p.label,
          source: 'INHERITED',
          type: p.type,
          sampleValue: String(val),
        });
      });
    }

    customProperties.forEach(c => {
      if (c.key.trim()) {
        list.push({
          key: c.key,
          label: c.key,
          source: 'CUSTOM',
          type: c.type,
          sampleValue: c.type === 'SECRET' ? '••••••••' : c.value,
        });
      }
    });

    return list;
  }, [selectedTemplate, inheritedValues, customProperties]);

  /* ---------- Config helpers ---------- */

  const getDrawerConfig = useCallback(
    (methodName: string, fallbackHttp?: string, fallbackUrl?: string, fallbackName?: string): MethodDrawerConfig => {
      const cfg = methodConfigs[methodName];
      const defaultHeaders = '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "Bearer <token>"\n}';
      const defaultPayload = '{\n  \n}';
      return {
        httpMethod: cfg?.httpMethod ?? fallbackHttp ?? 'POST',
        port: cfg?.port ?? String(port || ''),
        urlPath: cfg?.path ?? fallbackUrl ?? '/',
        displayName: cfg?.displayName ?? fallbackName ?? '',
        operationCode: cfg?.operationCode ?? methodName,
        headersTemplate: cfg?.headersTemplate ?? defaultHeaders,
        payloadTemplate: cfg?.payloadTemplate ?? defaultPayload,
        propertyBindings: cfg?.propertyBindings ?? cfg?.parameterBindings ?? {},
        pathVariables: cfg?.pathVariables ?? {},
        mappingId: cfg?.mappingId,
        tokenRefreshConfig: cfg?.tokenRefreshConfig,
      };
    },
    [methodConfigs, port],
  );

  const handleDrawerConfigChange = useCallback(
    (methodName: string, updated: MethodDrawerConfig) => {
      const nextConfigs = { ...methodConfigs };
      const newMethodName = updated.operationCode?.trim() || methodName;

      if (newMethodName !== methodName) {
        delete nextConfigs[methodName];
      }

      nextConfigs[newMethodName] = {
        ...(methodConfigs[methodName] || {}),
        httpMethod: updated.httpMethod,
        port: updated.port,
        path: updated.urlPath,
        displayName: updated.displayName,
        operationCode: newMethodName,
        mappingId: updated.mappingId,
        headersTemplate: updated.headersTemplate,
        payloadTemplate: updated.payloadTemplate,
        parameterBindings: updated.propertyBindings,
        propertyBindings: updated.propertyBindings,
        pathVariables: updated.pathVariables,
        tokenRefreshConfig: updated.tokenRefreshConfig,
      };

      onChangeMethodConfigs(nextConfigs);

      // Also sync displayName & name back into customMethods if it's a custom method
      setCustomMethods(prev =>
        prev.map(cm =>
          cm.name === methodName
            ? {
                ...cm,
                displayName: updated.displayName,
                httpMethod: updated.httpMethod,
                urlPath: updated.urlPath,
                port: updated.port,
                name: newMethodName,
              }
            : cm,
        ),
      );
    },
    [methodConfigs, onChangeMethodConfigs],
  );

  /* ---------- Save method → persist to api_integration_mapping ---------- */

  const handleSaveMethod = useCallback(
    async (methodName: string) => {
      if (!resourceId) return;
      setSavingMethod(methodName);
      const cfg = methodConfigs[methodName];
      if (!cfg) { setSavingMethod(null); return; }

      const mappingPayload: Omit<ApiIntegrationMapping, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
        mappingCode: `${resourceId}_${methodName}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        name: cfg.displayName || methodName,
        description: `Method ${methodName} for resource ${resourceId}`,
        operationType: cfg.operationCode || methodName,
        targetResourceId: resourceId,
        httpMethod: cfg.httpMethod || 'POST',
        endpointUrl: cfg.path || '/',
        headersTemplate: cfg.headersTemplate || '{"Content-Type": "application/json"}',
        payloadTemplate: cfg.payloadTemplate || JSON.stringify(cfg.propertyBindings ?? cfg.parameterBindings ?? {}),
        conditionRules: cfg.tokenRefreshConfig ? JSON.stringify(cfg.tokenRefreshConfig) : '[]',
        active: true,
      };

      try {
        let saved: ApiIntegrationMapping;
        if (cfg.mappingId) {
          saved = await updateMappingApi(cfg.mappingId, mappingPayload);
        } else {
          saved = await createMappingApi(mappingPayload);
        }

        // Update the config with the persisted mapping ID
        onChangeMethodConfigs({
          ...methodConfigs,
          [methodName]: {
            ...cfg,
            mappingId: saved.id,
          },
        });

        // Also update custom method row's mappingId
        setCustomMethods(prev =>
          prev.map(cm =>
            cm.name === methodName ? { ...cm, mappingId: saved.id } : cm,
          ),
        );
      } catch (err) {
        console.error(`Failed to save method mapping for ${methodName}:`, err);
      } finally {
        setSavingMethod(null);
      }
    },
    [resourceId, methodConfigs, onChangeMethodConfigs],
  );

  /* ---------- Simulation dispatcher (calls DynamicMappingController /test-run) ---------- */

  const handleSimulate = useCallback(
    async (
      resolvedUrl: string,
      payload: Record<string, string>,
      payloadTemplateOverride?: string,
      headersTemplateOverride?: string
    ): Promise<SimulationResult> => {
      let activeMethodName = '';
      if (expandedMethodKey) {
        if (expandedMethodKey.startsWith('default::')) {
          activeMethodName = expandedMethodKey.replace('default::', '');
        } else if (expandedMethodKey.startsWith('custom::')) {
          const customId = expandedMethodKey.replace('custom::', '');
          const found = customMethods.find(cm => cm.id === customId);
          activeMethodName = found ? found.name : '';
        }
      }

      const cfg = activeMethodName ? methodConfigs[activeMethodName] : undefined;

      // Build consolidated context including all configured properties (inherited + custom)
      const customPropsRecord: Record<string, unknown> = {};
      customProperties.forEach(c => {
        if (c.key.trim()) {
          customPropsRecord[c.key.trim()] = c.value;
        }
      });

      const fullContext: Record<string, unknown> = {
        ...inheritedValues,
        ...customPropsRecord,
        ...(cfg?.pathVariables || {}),
        resource: {
          resourceId: resourceId || selectedTemplate?.templateCode || 'DEV_RESOURCE',
          customProperties: {
            ...inheritedValues,
            ...customPropsRecord,
          }
        }
      };

      if (cachedSimulationToken) {
        fullContext.token = cachedSimulationToken;
        fullContext.auth = {
          token: cachedSimulationToken,
          bearerToken: `Bearer ${cachedSimulationToken}`,
          method: 'OAUTH2_BEARER',
        };
      }

      const finalPayloadTemplate = payloadTemplateOverride || cfg?.payloadTemplate || JSON.stringify(payload);
      const finalHeadersTemplate = headersTemplateOverride || cfg?.headersTemplate || '{"Content-Type": "application/json"}';

      const data = await testRunMappingApi({
        resourceId: resourceId || selectedTemplate?.templateCode || '',
        httpMethod: cfg?.httpMethod || 'POST',
        endpointUrl: resolvedUrl,
        headersTemplate: finalHeadersTemplate,
        payloadTemplate: finalPayloadTemplate,
        testContext: fullContext,
      });

      // If auth response succeeded and contains a token, remember it for subsequent custom service runs
      if (data.success && data.responsePayload) {
        try {
          const parsed = JSON.parse(data.responsePayload);
          const candidateToken = parsed.access_token || parsed.accessToken || parsed.token || parsed.jwt || parsed.data?.token || parsed.data?.accessToken;
          if (candidateToken && typeof candidateToken === 'string') {
            setCachedSimulationToken(candidateToken.trim());
          }
        } catch {
          // Response payload wasn't JSON
        }
      }

      return {
        success: data.success ?? false,
        statusCode: data.statusCode ?? 0,
        executionTimeMs: 0,
        responsePayload: data.responsePayload ?? JSON.stringify(data),
        targetUrl: data.targetUrl ?? resolvedUrl,
        error: data.error,
      };
    },
    [expandedMethodKey, customMethods, methodConfigs, customProperties, inheritedValues, resourceId, selectedTemplate, cachedSimulationToken],
  );

  /* ---------- Custom method CRUD ---------- */

  const handleAddCustomMethod = () => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const codeName = `CUSTOM_METHOD_${customMethods.length + 1}`;
    setCustomMethods(prev => [
      ...prev,
      {
        id,
        name: codeName,
        displayName: '',
        httpMethod: 'POST',
        port: String(port || ''),
        urlPath: '/api/v1/',
        type: 'EXECUTION',
      },
    ]);
    onChangeMethodConfigs({
      ...methodConfigs,
      [codeName]: {
        httpMethod: 'POST',
        port: String(port || ''),
        path: '/api/v1/',
        displayName: '',
        parameterBindings: {},
        propertyBindings: {},
        pathVariables: {},
      },
    });
    // Immediately open the newly created method in drawer
    setExpandedMethodKey(`custom::${id}`);
  };

  const handleDeleteCustomMethod = async (id: string) => {
    const method = customMethods.find(m => m.id === id);
    if (!method) return;

    // Delete from backend if persisted
    if (method.mappingId) {
      try {
        await deleteMappingApi(method.mappingId);
      } catch (err) {
        console.error(`Failed to delete mapping ${method.mappingId}:`, err);
      }
    }

    setCustomMethods(prev => prev.filter(m => m.id !== id));
    if (expandedMethodKey === `custom::${id}`) setExpandedMethodKey(null);
    const updated = { ...methodConfigs };
    delete updated[method.name];
    onChangeMethodConfigs(updated);
  };

  /* ---------- Endpoint preview ---------- */

  const isStandaloneTwin = !protocol || !host;
  const syntheticEndpoint = computeSyntheticEndpoint(host, port || undefined, protocol);

  /* ---------- Render ---------- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ═══ Top Banner ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Service & Method Composer
          </h3>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            Configure default & custom API methods. Expand any row to edit endpoint, bind
            payload properties, and run live simulations. Methods are persisted
            to <code style={{ color: '#38BDF8' }}>api_integration_mapping</code>.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Globe size={14} color={isStandaloneTwin ? "#10B981" : "#38BDF8"} />
          <span style={{ color: 'var(--text-secondary)' }}>Target Gateway:</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 600,
              color: isStandaloneTwin ? '#10B981' : 'var(--text-primary)',
            }}
          >
            {syntheticEndpoint}
          </span>
        </div>
      </div>

      {/* ═══ Loading Indicator ═══ */}
      {isLoadingMappings && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          Loading persisted service mappings…
        </div>
      )}

      {/* ═══ Column Headers ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 1.5fr 80px 70px 2fr 120px',
          gap: '8px',
          padding: '0 14px',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
        }}
      >
        <span />
        <span>Service / Name</span>
        <span>HTTP</span>
        <span>Port</span>
        <span>URL Path</span>
        <span style={{ textAlign: 'right' }}>Actions</span>
      </div>

      {/* ═══ Section 1: Default Blueprint Methods ═══ */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            padding: '0 2px',
          }}
        >
          <Layers size={14} color="#38BDF8" />
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
            }}
          >
            Default Blueprint Services ({defaultMethods.length})
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {defaultMethods.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                border: '1px dashed var(--border-default)',
                borderRadius: '8px',
              }}
            >
              No default services defined in the selected template blueprint.
            </div>
          ) : (
            defaultMethods.map(m => {
              const itemKey = `default::${m.name}`;
              const isExpanded = expandedMethodKey === itemKey;
              const cfg = getDrawerConfig(m.name, 'POST', '/', m.description);
              const isSaving = savingMethod === m.name;

              return (
                <div key={m.name} style={{ marginBottom: isExpanded ? '12px' : '6px' }}>
                  <MethodTableRow
                    name={m.name}
                    displayName={cfg.displayName || m.description}
                    httpMethod={cfg.httpMethod}
                    port={cfg.port}
                    urlPath={cfg.urlPath}
                    type={m.type || 'EXECUTION'}
                    safetyTier={m.safetyTier || 'OPERATIONAL'}
                    isDefault
                    isExpanded={isExpanded}
                    onToggleExpand={() =>
                      setExpandedMethodKey(isExpanded ? null : itemKey)
                    }
                  />
                  {isExpanded && (
                    <MethodExpansionDrawer
                      methodName={m.name}
                      methodType={m.type || 'EXECUTION'}
                      config={cfg}
                      onConfigChange={updated =>
                        handleDrawerConfigChange(m.name, updated)
                      }
                      availableProperties={availableProperties}
                      host={host}
                      protocol={protocol}
                      defaultPort={String(port || '')}
                      onSave={() => handleSaveMethod(m.name)}
                      onSimulate={handleSimulate}
                    />
                  )}
                  {isSaving && (
                    <div style={{ padding: '4px 14px', fontSize: '11px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={12} className="animate-spin" /> Persisting to api_integration_mapping…
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ═══ Section 2: Custom Extension Methods ═══ */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            padding: '0 2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={14} color="#A855F7" />
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              Custom Extension Services ({customMethods.length})
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomMethod}
            leftIcon={<Plus size={14} />}
            style={{
              minHeight: '40px',
              fontSize: '12px',
              borderColor: '#A855F7',
              color: '#A855F7',
            }}
          >
            Add Custom Service
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {customMethods.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                border: '1px dashed var(--border-default)',
                borderRadius: '8px',
              }}
            >
              No custom services defined. Click <strong>+ Add Custom Service</strong> to
              create vendor-specific API integrations.
            </div>
          ) : (
            customMethods.map(cm => {
              const itemKey = `custom::${cm.id}`;
              const isExp = expandedMethodKey === itemKey;
              const cfg = getDrawerConfig(cm.name, cm.httpMethod, cm.urlPath, cm.displayName);
              const isSaving = savingMethod === cm.name;

              return (
                <div key={cm.id} style={{ marginBottom: isExp ? '12px' : '6px' }}>
                  <MethodTableRow
                    name={cm.name}
                    displayName={cfg.displayName}
                    httpMethod={cfg.httpMethod}
                    port={cfg.port}
                    urlPath={cfg.urlPath}
                    type={cm.type}
                    safetyTier={cm.safetyTier}
                    isDefault={false}
                    isExpanded={isExp}
                    onToggleExpand={() =>
                      setExpandedMethodKey(isExp ? null : itemKey)
                    }
                    onDelete={() => handleDeleteCustomMethod(cm.id)}
                  />
                  {isExp && (
                    <MethodExpansionDrawer
                      methodName={cm.name}
                      methodType={cm.type}
                      config={cfg}
                      onConfigChange={updated =>
                        handleDrawerConfigChange(cm.name, updated)
                      }
                      availableProperties={availableProperties}
                      host={host}
                      protocol={protocol}
                      defaultPort={String(port || '')}
                      isCustom
                      onSave={() => handleSaveMethod(cm.name)}
                      onSimulate={handleSimulate}
                    />
                  )}
                  {isSaving && (
                    <div style={{ padding: '4px 14px', fontSize: '11px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={12} className="animate-spin" /> Persisting to api_integration_mapping…
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ═══ Footer Navigation ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          style={{ minHeight: '48px', padding: '0 20px' }}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back: Property Matrix
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          style={{ minHeight: '48px', padding: '0 24px' }}
          rightIcon={<ArrowRight size={16} />}
        >
          Next: Validation Sandbox
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Utility                                                             */
/* ------------------------------------------------------------------ */

/** Safely parse a JSON string into a key-value record, returning {} on failure. */
function safeParseJson(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        result[k] = String(v);
      });
      return result;
    }
  } catch { /* ignore */ }
  return {};
}
