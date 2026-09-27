import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ToggleLeft, ToggleRight, Save, Code, ShieldCheck } from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import {
  DynamicPathVariableCard,
  extractPathVariables,
} from './DynamicPathVariableCard';
import {
  MethodSimulationBox,
  SimulationResult,
} from './MethodSimulationBox';
import { computeSyntheticEndpoint } from '../endpointUtils';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface MethodDrawerConfig {
  httpMethod: string;
  port: string;
  urlPath: string;
  /** Human-readable name (e.g. "Pallet Pre-Announce"). */
  displayName: string;
  /** Operation code / mapping code (editable for custom methods). */
  operationCode?: string;
  /** Raw JSON headers template (e.g. {"Content-Type": "application/json"}). */
  headersTemplate: string;
  /** Raw JSON payload template with {{token}} placeholders. */
  payloadTemplate: string;
  /** Property key → assigned value (legacy bindings from property table). */
  propertyBindings: Record<string, string>;
  /** Path variable name → simulation value. */
  pathVariables: Record<string, string>;
  /** Backend mapping UUID (set once persisted to api_integration_mapping). */
  mappingId?: string;
}

export interface AvailableProperty {
  key: string;
  label: string;
  type: string;
  source: 'INHERITED' | 'CUSTOM';
  sampleValue: string;
}

export interface MethodExpansionDrawerProps {
  methodName: string;
  methodType: string;
  config: MethodDrawerConfig;
  onConfigChange: (updated: MethodDrawerConfig) => void;
  availableProperties: AvailableProperty[];
  /** Resource connection coordinates for endpoint resolution. */
  host: string;
  protocol: string;
  defaultPort: string | number;
  /** Whether this is a custom method (code name editable). */
  isCustom?: boolean;
  /** Called by parent to save method-level changes. */
  onSave: () => void;
  /** Saving indicator. */
  isSaving?: boolean;
  /** Called when simulation is requested — delegates to DynamicMappingController. */
  onSimulate: (resolvedUrl: string, payload: Record<string, string>, payloadTemplate?: string, headersTemplate?: string) => Promise<SimulationResult>;
}

const HTTP_VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const HEADER_PRESETS = [
  {
    label: 'OAuth2 Bearer Token (Authorization: Bearer <token>)',
    value: 'OAUTH2_BEARER',
    headers: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "Bearer <token>"\n}'
  },
  {
    label: 'Raw Bearer Token (Authorization: <token>)',
    value: 'RAW_BEARER',
    headers: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "<token>"\n}'
  },
  {
    label: 'Authentication Header (Authentication: <token>)',
    value: 'AUTHENTICATION_HEADER',
    headers: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authentication": "<token>"\n}'
  },
  {
    label: 'API Key (X-API-KEY: {{apiKey}})',
    value: 'API_KEY',
    headers: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "X-API-KEY": "{{apiKey}}"\n}'
  },
  {
    label: 'HTTP Basic Auth (Authorization: Basic {{basicAuth}})',
    value: 'BASIC_AUTH',
    headers: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json",\n  "Authorization": "Basic {{basicAuth}}"\n}'
  },
  {
    label: 'Custom Headers...',
    value: 'CUSTOM',
    headers: ''
  }
] as const;

const TEXTAREA_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-default)',
  backgroundColor: '#0F172A',
  color: '#38BDF8',
  fontSize: '12px',
  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  lineHeight: '1.5',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box' as const,
};

export const MethodExpansionDrawer: React.FC<MethodExpansionDrawerProps> = ({
  methodName,
  methodType,
  config,
  onConfigChange,
  availableProperties,
  host,
  protocol,
  defaultPort,
  isCustom = false,
  onSave,
  isSaving = false,
  onSimulate,
}) => {
  const [editMode, setEditMode] = useState(false);
  const payloadRef = useRef<HTMLTextAreaElement>(null);

  /* ---------- derived state ---------- */

  const effectivePort = config.port || String(defaultPort || '');
  const baseEndpoint = computeSyntheticEndpoint(host, Number(effectivePort) || undefined, protocol);

  /** Fully resolved URL with path variables substituted. */
  const resolvedUrl = useMemo(() => {
    let url = `${baseEndpoint}${config.urlPath.startsWith('/') ? '' : '/'}${config.urlPath}`;
    const vars = extractPathVariables(config.urlPath);
    vars.forEach(v => {
      const val = config.pathVariables[v] || `{${v}}`;
      url = url.replace(`{${v}}`, val);
    });
    return url;
  }, [baseEndpoint, config.urlPath, config.pathVariables]);

  /* ---------- handlers ---------- */

  const handleFieldChange = useCallback(
    <K extends keyof MethodDrawerConfig>(field: K, value: MethodDrawerConfig[K]) => {
      onConfigChange({ ...config, [field]: value });
    },
    [config, onConfigChange],
  );

  const handlePathVarChange = useCallback(
    (varName: string, value: string) => {
      handleFieldChange('pathVariables', {
        ...config.pathVariables,
        [varName]: value,
      });
    },
    [config.pathVariables, handleFieldChange],
  );

  /** Insert a {{token}} at cursor position in payload textarea. */
  const handleInsertToken = useCallback(
    (token: string) => {
      const placeholder = `{{${token}}}`;
      const textarea = payloadRef.current;
      if (!textarea) {
        handleFieldChange('payloadTemplate', config.payloadTemplate + placeholder);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = config.payloadTemplate;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      handleFieldChange('payloadTemplate', newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 50);
    },
    [config.payloadTemplate, handleFieldChange],
  );

  const handleSimulate = useCallback(async (): Promise<SimulationResult> => {
    return onSimulate(resolvedUrl, config.propertyBindings, config.payloadTemplate, config.headersTemplate);
  }, [onSimulate, resolvedUrl, config.propertyBindings, config.payloadTemplate, config.headersTemplate]);

  /* ---------- render ---------- */

  return (
    <div
      style={{
        borderLeft: '1px solid var(--color-primary-500, #38BDF8)',
        borderRight: '1px solid var(--color-primary-500, #38BDF8)',
        borderBottom: '1px solid var(--color-primary-500, #38BDF8)',
        borderRadius: '0 0 8px 8px',
        padding: '16px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      {/* ── Toolbar: Edit Mode Toggle + Save ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border-default)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="neutral">{methodType || 'EXECUTION'}</Badge>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {methodName}
          </span>
          {config.mappingId && (
            <Badge variant="success" style={{ fontSize: '9px' }}>PERSISTED</Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Edit Mode Toggle */}
          <button
            type="button"
            onClick={() => setEditMode(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: editMode ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-surface-subtle)',
              cursor: 'pointer',
              color: editMode ? '#38BDF8' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s',
              minHeight: '36px',
            }}
          >
            {editMode
              ? <ToggleRight size={16} color="#38BDF8" />
              : <ToggleLeft size={16} />
            }
            Edit Mode {editMode ? 'ON' : 'OFF'}
          </button>

          {editMode && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              leftIcon={<Save size={14} />}
              style={{
                minHeight: '36px',
                backgroundColor: '#10B981',
                borderColor: '#10B981',
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Identity: Name + Operation Code ── */}
      <div>
        <div style={sectionLabelStyle}>Method Identity</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Display Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 200px' }}>
            <label style={fieldLabelStyle}>Name *</label>
            <input
              type="text"
              value={config.displayName}
              onChange={e => handleFieldChange('displayName', e.target.value)}
              disabled={!editMode}
              placeholder="e.g. Pallet Pre-Announce"
              style={inputStyle(editMode)}
            />
          </div>

          {/* Operation Code (editable for custom, read-only for default) */}
          {isCustom && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 200px' }}>
              <label style={fieldLabelStyle}>Operation Code *</label>
              <input
                type="text"
                value={config.operationCode ?? methodName}
                onChange={e => handleFieldChange('operationCode', e.target.value)}
                disabled={!editMode}
                placeholder="e.g. SYNC_ORDER"
                style={{ ...inputStyle(editMode), fontFamily: 'monospace', fontWeight: 700 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Endpoint Configuration ── */}
      <div>
        <div style={sectionLabelStyle}>Endpoint Configuration</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* HTTP Verb Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '100px' }}>
            <label style={fieldLabelStyle}>HTTP Method</label>
            <select
              value={config.httpMethod}
              onChange={e => handleFieldChange('httpMethod', e.target.value)}
              disabled={!editMode}
              style={{
                ...inputStyle(editMode),
                fontWeight: 700,
                cursor: editMode ? 'pointer' : 'default',
              }}
            >
              {HTTP_VERBS.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Port Override */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '90px' }}>
            <label style={fieldLabelStyle}>Port</label>
            <input
              type="text"
              value={config.port}
              onChange={e => handleFieldChange('port', e.target.value)}
              disabled={!editMode}
              placeholder={String(defaultPort || '8080')}
              style={inputStyle(editMode)}
            />
          </div>

          {/* URL Path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '200px' }}>
            <label style={fieldLabelStyle}>URL Path *</label>
            <input
              type="text"
              value={config.urlPath}
              onChange={e => handleFieldChange('urlPath', e.target.value)}
              disabled={!editMode}
              placeholder="/api/v1/resource/{id}/action"
              style={{ ...inputStyle(editMode), fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Supports dynamic path variables like <code style={{ color: '#38BDF8' }}>{'{orderId}'}</code>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-Column Side-by-Side Grid: Left (Headers & Payload) | Right (PathVars & Simulation) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Headers & Payload Template */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Headers Template with Preset Selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={sectionLabelStyle}>Headers Template (JSON)</div>
              {/* Preset Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Header Preset:</span>
                <select
                  disabled={!editMode}
                  onChange={e => {
                    const found = HEADER_PRESETS.find(p => p.value === e.target.value);
                    if (found && found.headers) {
                      handleFieldChange('headersTemplate', found.headers);
                    }
                  }}
                  defaultValue="OAUTH2_BEARER"
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: editMode ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    outline: 'none',
                    cursor: editMode ? 'pointer' : 'default',
                  }}
                >
                  {HEADER_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              rows={3}
              value={config.headersTemplate}
              onChange={e => handleFieldChange('headersTemplate', e.target.value)}
              disabled={!editMode}
              style={{
                ...TEXTAREA_STYLE,
                color: '#94A3B8',
                opacity: editMode ? 1 : 0.7,
              }}
            />
            <div style={{ fontSize: '10.5px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} />
              <span>Backend replaces &lt;token&gt; with live Bearer token acquired by TokenManager.</span>
            </div>
          </div>

          {/* JSON Payload Template */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={sectionLabelStyle}>
                <Code size={12} style={{ marginRight: '4px' }} />
                JSON Payload Template
              </div>
            </div>

            {/* Available Properties Chips */}
            {availableProperties.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '5px',
                  marginBottom: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginRight: '4px', alignSelf: 'center' }}>
                  Insert Property:
                </span>
                {availableProperties.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleInsertToken(p.key)}
                    disabled={!editMode}
                    title={`Insert {{${p.key}}} — ${p.type} (${p.source})`}
                    style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      fontFamily: 'monospace',
                      color: '#38BDF8',
                      cursor: editMode ? 'pointer' : 'default',
                      backgroundColor: 'rgba(56, 189, 248, 0.08)',
                      transition: 'background-color 0.15s',
                      opacity: editMode ? 1 : 0.5,
                    }}
                  >
                    {`{{${p.key}}}`}
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={payloadRef}
              rows={9}
              value={config.payloadTemplate}
              onChange={e => handleFieldChange('payloadTemplate', e.target.value)}
              disabled={!editMode}
              placeholder={'{\n  "palletId": "{{pallet.lpn}}",\n  "quantity": {{pallet.quantity}},\n  "timestamp": "{{fn.now}}"\n}'}
              style={{
                ...TEXTAREA_STYLE,
                opacity: editMode ? 1 : 0.7,
              }}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Use <code style={{ color: '#38BDF8' }}>{'{{property_key}}'}</code> for configured property substitution when API is fired.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Path Variables & Test Simulation Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Dynamic Path Variables (auto-detected) */}
          <DynamicPathVariableCard
            urlPath={config.urlPath}
            variableValues={config.pathVariables}
            onChangeVariable={handlePathVarChange}
          />

          {/* Test & Simulate Box */}
          <MethodSimulationBox
            resolvedUrl={resolvedUrl}
            onSimulate={handleSimulate}
          />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Shared Styles                                                       */
/* ------------------------------------------------------------------ */

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  color: 'var(--text-secondary)',
};

function inputStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '7px 10px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
    backgroundColor: enabled ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    minHeight: '36px',
    boxSizing: 'border-box',
  };
}
