import React from 'react';
import { Key, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { JsonViewer } from '../../../components/common/JsonViewer';

export interface SoftwarePropRow {
  key: string;
  value: string;
  isSecret: boolean;
  useForAuth: boolean;
  showSecret?: boolean;
}

export interface SoftwareAuthFormSectionProps {
  formAuthMethod: string;
  setFormAuthMethod: (val: string) => void;
  formTokenPath: string;
  setFormTokenPath: (val: string) => void;
  formTokenResponseField: string;
  setFormTokenResponseField: (val: string) => void;
  formApiKeyHeader: string;
  setFormApiKeyHeader: (val: string) => void;
  formApiKeyValue: string;
  setFormApiKeyValue: (val: string) => void;
  formUsername: string;
  setFormUsername: (val: string) => void;
  formPassword: string;
  setFormPassword: (val: string) => void;
  softwareProps: SoftwarePropRow[];
  setSoftwareProps: React.Dispatch<React.SetStateAction<SoftwarePropRow[]>>;
  liveAuthPayload: Record<string, unknown>;
}

export const SoftwareAuthFormSection: React.FC<SoftwareAuthFormSectionProps> = ({
  formAuthMethod,
  setFormAuthMethod,
  formTokenPath,
  setFormTokenPath,
  formTokenResponseField,
  setFormTokenResponseField,
  formApiKeyHeader,
  setFormApiKeyHeader,
  formApiKeyValue,
  setFormApiKeyValue,
  formUsername,
  setFormUsername,
  formPassword,
  setFormPassword,
  softwareProps,
  setSoftwareProps,
  liveAuthPayload
}) => {
  const handleAddSoftwareProp = () => {
    setSoftwareProps(prev => [...prev, { key: '', value: '', isSecret: false, useForAuth: false }]);
  };

  const handleRemoveSoftwareProp = (index: number) => {
    setSoftwareProps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSoftwarePropChange = <K extends keyof SoftwarePropRow>(
    index: number,
    field: K,
    val: SoftwarePropRow[K]
  ) => {
    setSoftwareProps(prev => prev.map((row, i) => i === index ? { ...row, [field]: val } : row));
  };

  return (
    <div style={{
      padding: '14px',
      borderRadius: '10px',
      border: '1px solid var(--border-default)',
      backgroundColor: 'var(--bg-surface-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
          <Key size={15} />
          <span>Authentication & Properties</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Dynamic software auth schema
        </span>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
          Auth Method
        </label>
        <select
          value={formAuthMethod}
          onChange={(e) => setFormAuthMethod(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-page)',
            color: 'var(--text-primary)',
            fontSize: '12.5px'
          }}
        >
          <option value="OAUTH2_BEARER">OAuth 2.0 / Bearer Token (JSON Body)</option>
          <option value="API_KEY">API Key Header</option>
          <option value="BASIC_AUTH">HTTP Basic Authentication</option>
          <option value="NONE">No Authentication</option>
        </select>
      </div>

      {formAuthMethod === 'OAUTH2_BEARER' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Token Path *
            </label>
            <input
              type="text"
              required
              value={formTokenPath}
              onChange={(e) => setFormTokenPath(e.target.value)}
              placeholder="/WMS.Api/api/authentication"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Response Token Field *
            </label>
            <input
              type="text"
              required
              value={formTokenResponseField}
              onChange={(e) => setFormTokenResponseField(e.target.value)}
              placeholder="accessToken"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {formAuthMethod === 'API_KEY' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Header Name *
            </label>
            <input
              type="text"
              required
              value={formApiKeyHeader}
              onChange={(e) => setFormApiKeyHeader(e.target.value)}
              placeholder="X-API-KEY"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Key Value *
            </label>
            <input
              type="password"
              required
              value={formApiKeyValue}
              onChange={(e) => setFormApiKeyValue(e.target.value)}
              placeholder="secret-api-key"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {formAuthMethod === 'BASIC_AUTH' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Username *
            </label>
            <input
              type="text"
              required
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              placeholder="admin"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Password *
            </label>
            <input
              type="password"
              required
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {/* Software Properties Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600 }}>Properties & Auth Parameters</label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddSoftwareProp}
            style={{ fontSize: '11px', padding: '3px 8px', minHeight: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={13} />
            <span>Add Row</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {softwareProps.map((prop, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Key (e.g. clientId)"
                value={prop.key}
                onChange={(e) => handleSoftwarePropChange(idx, 'key', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              />
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={prop.isSecret && !prop.showSecret ? 'password' : 'text'}
                  placeholder="Value"
                  value={prop.value}
                  onChange={(e) => handleSoftwarePropChange(idx, 'value', e.target.value)}
                  style={{
                    width: '100%',
                    padding: prop.isSecret ? '6px 28px 6px 8px' : '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
                {prop.isSecret && (
                  <button
                    type="button"
                    onClick={() => handleSoftwarePropChange(idx, 'showSecret', !prop.showSecret)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '7px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {prop.showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={prop.isSecret}
                  onChange={(e) => handleSoftwarePropChange(idx, 'isSecret', e.target.checked)}
                />
                <span>Secret</span>
              </label>
              {formAuthMethod === 'OAUTH2_BEARER' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={prop.useForAuth}
                    onChange={(e) => handleSoftwarePropChange(idx, 'useForAuth', e.target.checked)}
                  />
                  <span>Auth Body</span>
                </label>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleRemoveSoftwareProp(idx)}
                style={{ padding: '4px', color: 'var(--color-danger, #EF4444)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {formAuthMethod === 'OAUTH2_BEARER' && (
        <div>
          <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Live JSON Body Preview for Authentication:
          </label>
          <JsonViewer data={liveAuthPayload} />
        </div>
      )}
    </div>
  );
};
