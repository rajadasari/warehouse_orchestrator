import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Zap 
} from 'lucide-react';
import { 
  resourceService, 
  ResourceItem, 
  CreateResourcePayload 
} from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Alert } from '../../../components/common/Alert';

export interface ResourceMethodConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  onSuccess: (msg: string) => void;
  onRefresh: () => Promise<void>;
}

export const ResourceMethodConfigModal: React.FC<ResourceMethodConfigModalProps> = ({
  isOpen,
  onClose,
  resource,
  onSuccess,
  onRefresh
}) => {
  if (!resource) return null;

  const [authType, setAuthType] = useState<string>('OAUTH2_BEARER');
  const [tokenPath, setTokenPath] = useState<string>('/WMS.Api/api/authentication');

  // Client ID
  const [clientIdMode, setClientIdMode] = useState<'PROPERTY' | 'DIRECT'>('PROPERTY');
  const [clientIdProp, setClientIdProp] = useState<string>('clientId');
  const [clientIdDirect, setClientIdDirect] = useState<string>('');

  // Client Secret
  const [clientSecretMode, setClientSecretMode] = useState<'PROPERTY' | 'DIRECT'>('PROPERTY');
  const [clientSecretProp, setClientSecretProp] = useState<string>('clientSecret');
  const [clientSecretDirect, setClientSecretDirect] = useState<string>('');

  // API Key
  const [apiKeyHeader, setApiKeyHeader] = useState<string>('X-API-KEY');
  const [apiKeyMode, setApiKeyMode] = useState<'PROPERTY' | 'DIRECT'>('DIRECT');
  const [apiKeyProp, setApiKeyProp] = useState<string>('apiKey');
  const [apiKeyDirect, setApiKeyDirect] = useState<string>('');

  // Basic Auth
  const [basicUserMode, setBasicUserMode] = useState<'PROPERTY' | 'DIRECT'>('DIRECT');
  const [basicUserProp, setBasicUserProp] = useState<string>('username');
  const [basicUserDirect, setBasicUserDirect] = useState<string>('');
  const [basicPassMode, setBasicPassMode] = useState<'PROPERTY' | 'DIRECT'>('DIRECT');
  const [basicPassProp, setBasicPassProp] = useState<string>('password');
  const [basicPassDirect, setBasicPassDirect] = useState<string>('');

  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tokenSnippet?: string } | null>(null);

  // Initialize form whenever resource changes or modal opens
  useEffect(() => {
    if (!resource) return;

    setTestResult(null);
    setShowSecret(false);

    const props = resource.customProperties || {};
    const existingAuth: Record<string, string | undefined> = (props.auth && typeof props.auth === 'object')
      ? (props.auth as Record<string, string | undefined>)
      : {};

    const detectedMethod = existingAuth.method 
      || props.authMethod 
      || ((props.clientId || props.clientSecret) ? 'OAUTH2_BEARER' : 'OAUTH2_BEARER');
    setAuthType(String(detectedMethod));

    setTokenPath(String(props.tokenPath || existingAuth.tokenPath || '/WMS.Api/api/authentication'));

    // Client ID
    if (existingAuth.clientIdProperty && props[existingAuth.clientIdProperty] !== undefined) {
      setClientIdMode('PROPERTY');
      setClientIdProp(existingAuth.clientIdProperty);
      setClientIdDirect(String(props[existingAuth.clientIdProperty] || ''));
    } else if (props.clientId !== undefined) {
      setClientIdMode('PROPERTY');
      setClientIdProp('clientId');
      setClientIdDirect(String(props.clientId));
    } else {
      setClientIdMode('DIRECT');
      setClientIdDirect('');
      setClientIdProp('clientId');
    }

    // Client Secret
    if (existingAuth.clientSecretProperty && props[existingAuth.clientSecretProperty] !== undefined) {
      setClientSecretMode('PROPERTY');
      setClientSecretProp(existingAuth.clientSecretProperty);
      setClientSecretDirect(String(props[existingAuth.clientSecretProperty] || ''));
    } else if (props.clientSecret !== undefined) {
      setClientSecretMode('PROPERTY');
      setClientSecretProp('clientSecret');
      setClientSecretDirect(String(props.clientSecret));
    } else {
      setClientSecretMode('DIRECT');
      setClientSecretDirect('');
      setClientSecretProp('clientSecret');
    }

    // API Key
    setApiKeyHeader(String(props.apiKeyHeader || existingAuth.header || 'X-API-KEY'));
    if (props.apiKeyValue !== undefined) {
      setApiKeyMode('PROPERTY');
      setApiKeyProp('apiKeyValue');
      setApiKeyDirect(String(props.apiKeyValue));
    } else {
      setApiKeyMode('DIRECT');
      setApiKeyDirect(String(existingAuth.key || ''));
    }

    // Basic Auth
    if (props.username !== undefined) {
      setBasicUserMode('PROPERTY');
      setBasicUserProp('username');
      setBasicUserDirect(String(props.username));
    } else {
      setBasicUserMode('DIRECT');
      setBasicUserDirect(String(existingAuth.username || ''));
    }

    if (props.password !== undefined) {
      setBasicPassMode('PROPERTY');
      setBasicPassProp('password');
      setBasicPassDirect(String(props.password));
    } else {
      setBasicPassMode('DIRECT');
      setBasicPassDirect(String(existingAuth.password || ''));
    }
  }, [resource, isOpen]);

  // Direct Authentication Test
  const handleTestAuth = async () => {
    if (!resource) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const updatedProps: Record<string, any> = { ...(resource.customProperties || {}) };
      const resolvedClientId = clientIdMode === 'PROPERTY' 
        ? (updatedProps[clientIdProp] !== undefined ? String(updatedProps[clientIdProp]) : clientIdDirect)
        : clientIdDirect;

      const resolvedClientSecret = clientSecretMode === 'PROPERTY'
        ? (updatedProps[clientSecretProp] !== undefined ? String(updatedProps[clientSecretProp]) : clientSecretDirect)
        : clientSecretDirect;

      const baseUrl = resource.ip || updatedProps.ip || updatedProps.baseUrl || '';

      const res = await resourceService.testAuthConnection({
        resourceId: resource.resourceId,
        baseUrl: baseUrl,
        tokenPath: tokenPath,
        clientId: resolvedClientId,
        clientSecret: resolvedClientSecret
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Authentication verified successfully! Active token acquired and cached in memory.',
          tokenSnippet: res.token ? res.token.substring(0, 48) + '...' : undefined
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || res.message || 'Authentication failed. Check credentials and endpoint URL.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Authentication failed. Check endpoint URL and credentials.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Authentication Configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    setIsSaving(true);
    try {
      const updatedProps: Record<string, any> = { ...(resource.customProperties || {}) };

      if (authType === 'OAUTH2_BEARER') {
        const resolvedClientId = clientIdMode === 'PROPERTY' 
          ? (updatedProps[clientIdProp] !== undefined ? updatedProps[clientIdProp] : clientIdDirect)
          : clientIdDirect;

        const resolvedClientSecret = clientSecretMode === 'PROPERTY'
          ? (updatedProps[clientSecretProp] !== undefined ? updatedProps[clientSecretProp] : clientSecretDirect)
          : clientSecretDirect;

        if (resolvedClientId) updatedProps.clientId = resolvedClientId;
        if (resolvedClientSecret) updatedProps.clientSecret = resolvedClientSecret;
        if (tokenPath) updatedProps.tokenPath = tokenPath;
        updatedProps.authMethod = 'OAUTH2_BEARER';

        updatedProps.auth = {
          method: 'OAUTH2_BEARER',
          tokenPath: tokenPath,
          clientIdMode: clientIdMode,
          clientIdProperty: clientIdMode === 'PROPERTY' ? clientIdProp : undefined,
          clientIdValue: resolvedClientId,
          clientSecretMode: clientSecretMode,
          clientSecretProperty: clientSecretMode === 'PROPERTY' ? clientSecretProp : undefined,
          clientSecretValue: resolvedClientSecret
        };
      } else if (authType === 'API_KEY') {
        const resolvedKey = apiKeyMode === 'PROPERTY'
          ? (updatedProps[apiKeyProp] !== undefined ? updatedProps[apiKeyProp] : apiKeyDirect)
          : apiKeyDirect;

        updatedProps.apiKeyHeader = apiKeyHeader;
        if (resolvedKey) updatedProps.apiKeyValue = resolvedKey;
        updatedProps.authMethod = 'API_KEY';
        updatedProps.auth = {
          method: 'API_KEY',
          header: apiKeyHeader,
          keyMode: apiKeyMode,
          keyProperty: apiKeyMode === 'PROPERTY' ? apiKeyProp : undefined,
          keyValue: resolvedKey
        };
      } else if (authType === 'BASIC_AUTH') {
        const resolvedUser = basicUserMode === 'PROPERTY'
          ? (updatedProps[basicUserProp] !== undefined ? updatedProps[basicUserProp] : basicUserDirect)
          : basicUserDirect;

        const resolvedPass = basicPassMode === 'PROPERTY'
          ? (updatedProps[basicPassProp] !== undefined ? updatedProps[basicPassProp] : basicPassDirect)
          : basicPassDirect;

        if (resolvedUser) updatedProps.username = resolvedUser;
        if (resolvedPass) updatedProps.password = resolvedPass;
        updatedProps.authMethod = 'BASIC_AUTH';
        updatedProps.auth = {
          method: 'BASIC_AUTH',
          userMode: basicUserMode,
          userProperty: basicUserMode === 'PROPERTY' ? basicUserProp : undefined,
          username: resolvedUser,
          passMode: basicPassMode,
          passProperty: basicPassMode === 'PROPERTY' ? basicPassProp : undefined,
          password: resolvedPass
        };
      } else {
        updatedProps.authMethod = 'NONE';
        updatedProps.auth = { method: 'NONE' };
      }

      const payload: CreateResourcePayload = {
        resourceId: resource.resourceId,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        ip: resource.ip,
        customProperties: updatedProps
      };

      await resourceService.updateResource(resource.resourceId, payload);

      try {
        const authCheck = await resourceService.authorizeResource(resource.resourceId);
        if (authCheck.success) {
          onSuccess(`Authentication configured and active token cached in memory for '${resource.resourceId}'`);
        } else {
          onSuccess(`Saved for '${resource.resourceId}'. Note: ${authCheck.error || authCheck.message}`);
        }
      } catch {
        onSuccess(`Authentication method and properties saved for resource '${resource.resourceId}'`);
      }

      onClose();
      await onRefresh();
    } catch (err: any) {
      alert(`Error saving method configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} color="#D97706" />
          <span>Methods & Authentication Configuration</span>
        </div>
      }
      subtitle={`Resource: ${resource.resourceId} (${resource.name})`}
      maxWidth="660px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving || isTesting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save Configuration
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Method / Protocol Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            Integration Method & Authentication Protocol
          </label>
          <select
            value={authType}
            onChange={(e) => {
              setAuthType(e.target.value);
              setTestResult(null);
            }}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-page)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              boxSizing: 'border-box'
            }}
          >
            <option value="OAUTH2_BEARER">OAuth 2.0 / Bearer Token (Logiqs WMS, Cloud API)</option>
            <option value="API_KEY">API Key / Custom Header (e.g. X-API-KEY)</option>
            <option value="BASIC_AUTH">HTTP Basic Authentication (Username & Password)</option>
            <option value="NONE">No Authentication (Open / Internal Network)</option>
          </select>
        </div>

        {/* METHOD TYPE: OAUTH2_BEARER */}
        {authType === 'OAUTH2_BEARER' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              <Lock size={14} />
              <span>OAuth 2.0 Bearer Token Settings</span>
            </div>

            {/* Token Endpoint URL */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Token Endpoint Path / URL *
              </label>
              <input
                type="text"
                required
                value={tokenPath}
                onChange={(e) => setTokenPath(e.target.value)}
                placeholder="/WMS.Api/api/authentication"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Relative to Resource Host (e.g. <code>{resource.ip?.startsWith('http') ? resource.ip : `http://${resource.ip || 'your-server'}`}{tokenPath}</code>)
              </span>
            </div>

            {/* Client ID Property Selector & Feasibility */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  Client ID Configuration
                </label>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  <button
                    type="button"
                    onClick={() => setClientIdMode('PROPERTY')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: clientIdMode === 'PROPERTY' ? 'var(--color-primary-600, #2563EB)' : 'var(--text-secondary)',
                      fontWeight: clientIdMode === 'PROPERTY' ? 700 : 400,
                      cursor: 'pointer',
                      textDecoration: clientIdMode === 'PROPERTY' ? 'underline' : 'none'
                    }}
                  >
                    Select Property
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => setClientIdMode('DIRECT')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: clientIdMode === 'DIRECT' ? 'var(--color-primary-600, #2563EB)' : 'var(--text-secondary)',
                      fontWeight: clientIdMode === 'DIRECT' ? 700 : 400,
                      cursor: 'pointer',
                      textDecoration: clientIdMode === 'DIRECT' ? 'underline' : 'none'
                    }}
                  >
                    Direct Value
                  </button>
                </div>
              </div>

              {clientIdMode === 'PROPERTY' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={clientIdProp}
                    onChange={(e) => {
                      setClientIdProp(e.target.value);
                      const existing = resource.customProperties?.[e.target.value];
                      if (existing !== undefined) setClientIdDirect(String(existing));
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px'
                    }}
                  >
                    <option value="clientId">Property: 'clientId'</option>
                    {Object.keys(resource.customProperties || {})
                      .filter(k => k !== 'clientId' && k !== 'clientSecret' && k !== 'auth')
                      .map(k => (
                        <option key={k} value={k}>Property: '{k}'</option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Current Value"
                    value={clientIdDirect || (resource.customProperties?.[clientIdProp] !== undefined ? String(resource.customProperties[clientIdProp]) : '')}
                    onChange={(e) => setClientIdDirect(e.target.value)}
                    style={{
                      flex: 1.2,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px'
                    }}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Enter Client ID directly"
                  value={clientIdDirect}
                  onChange={(e) => setClientIdDirect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>

            {/* Client Secret Property Selector & Feasibility */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  Client Secret Configuration
                </label>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  <button
                    type="button"
                    onClick={() => setClientSecretMode('PROPERTY')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: clientSecretMode === 'PROPERTY' ? 'var(--color-primary-600, #2563EB)' : 'var(--text-secondary)',
                      fontWeight: clientSecretMode === 'PROPERTY' ? 700 : 400,
                      cursor: 'pointer',
                      textDecoration: clientSecretMode === 'PROPERTY' ? 'underline' : 'none'
                    }}
                  >
                    Select Property
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => setClientSecretMode('DIRECT')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: clientSecretMode === 'DIRECT' ? 'var(--color-primary-600, #2563EB)' : 'var(--text-secondary)',
                      fontWeight: clientSecretMode === 'DIRECT' ? 700 : 400,
                      cursor: 'pointer',
                      textDecoration: clientSecretMode === 'DIRECT' ? 'underline' : 'none'
                    }}
                  >
                    Direct Secret
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {clientSecretMode === 'PROPERTY' ? (
                  <>
                    <select
                      value={clientSecretProp}
                      onChange={(e) => {
                        setClientSecretProp(e.target.value);
                        const existing = resource.customProperties?.[e.target.value];
                        if (existing !== undefined) setClientSecretDirect(String(existing));
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12.5px'
                      }}
                    >
                      <option value="clientSecret">Property: 'clientSecret'</option>
                      {Object.keys(resource.customProperties || {})
                        .filter(k => k !== 'clientId' && k !== 'clientSecret' && k !== 'auth')
                        .map(k => (
                          <option key={k} value={k}>Property: '{k}'</option>
                        ))}
                    </select>
                    <div style={{ flex: 1.2, position: 'relative' }}>
                      <input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Current Secret"
                        value={clientSecretDirect || (resource.customProperties?.[clientSecretProp] !== undefined ? String(resource.customProperties[clientSecretProp]) : '')}
                        onChange={(e) => setClientSecretDirect(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 32px 7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="Enter Client Secret directly"
                      value={clientSecretDirect}
                      onChange={(e) => setClientSecretDirect(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 32px 7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* METHOD TYPE: API_KEY */}
        {authType === 'API_KEY' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              <Key size={14} />
              <span>API Key Header Settings</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Header Name *
              </label>
              <input
                type="text"
                required
                value={apiKeyHeader}
                onChange={(e) => setApiKeyHeader(e.target.value)}
                placeholder="X-API-KEY"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                API Key Value *
              </label>
              <input
                type="password"
                required
                value={apiKeyDirect}
                onChange={(e) => setApiKeyDirect(e.target.value)}
                placeholder="Enter API Key Value"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        {/* METHOD TYPE: BASIC_AUTH */}
        {authType === 'BASIC_AUTH' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              <Lock size={14} />
              <span>Basic Authentication Credentials</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Username *
              </label>
              <input
                type="text"
                required
                value={basicUserDirect}
                onChange={(e) => setBasicUserDirect(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Password *
              </label>
              <input
                type="password"
                required
                value={basicPassDirect}
                onChange={(e) => setBasicPassDirect(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        {/* Test Connection Banner */}
        <div style={{
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, display: 'block' }}>
                Connection Verification
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Test authenticating against host without modifying saved database record
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestAuth}
              isLoading={isTesting}
              icon={<Zap size={13} color="#D97706" />}
            >
              Test Connection
            </Button>
          </div>

          {testResult && (
            <Alert
              variant={testResult.success ? 'success' : 'danger'}
              title={testResult.success ? 'Authentication Succeeded' : 'Authentication Failed'}
            >
              <div>{testResult.message}</div>
              {testResult.tokenSnippet && (
                <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
                  <strong>Acquired Token:</strong> {testResult.tokenSnippet}
                </div>
              )}
            </Alert>
          )}
        </div>
      </form>
    </Modal>
  );
};
