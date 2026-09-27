import React, { useState, useEffect, useMemo } from 'react';
import { Key, Lock, Zap, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { ResourceItem, resourceService } from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Alert } from '../../../components/common/Alert';
import { JsonViewer } from '../../../components/common/JsonViewer';

export interface ResourceMethodConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  onSuccess?: (msg: string) => void;
  onRefresh?: () => Promise<void>;
}

export const ResourceMethodConfigModal: React.FC<ResourceMethodConfigModalProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  if (!resource) return null;

  const [authType, setAuthType] = useState<string>('OAUTH2_BEARER');
  const [tokenPath, setTokenPath] = useState<string>('/api/authentication');
  const [tokenResponseField, setTokenResponseField] = useState<string>('accessToken');

  // API Key header & selected property
  const [apiKeyHeader, setApiKeyHeader] = useState<string>('X-API-KEY');
  const [apiKeyProperty, setApiKeyProperty] = useState<string>('');

  // Basic Auth: selected username & password properties
  const [basicUserProperty, setBasicUserProperty] = useState<string>('');
  const [basicPassProperty, setBasicPassProperty] = useState<string>('');

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tokenSnippet?: string } | null>(null);

  // Extract ONLY the properties explicitly marked for authentication
  const authProperties = useMemo(() => {
    if (!resource) return [];
    const props = resource.customProperties || {};
    const propList: Array<{ key: string; value: string; isSecret: boolean; useForAuth: boolean }> = [];
    const seen = new Set<string>();

    const existingAuth: Record<string, unknown> = (props.auth && typeof props.auth === 'object')
      ? (props.auth as Record<string, unknown>)
      : {};

    const reqPayload: Record<string, unknown> = (existingAuth.requestPayload && typeof existingAuth.requestPayload === 'object')
      ? (existingAuth.requestPayload as Record<string, unknown>)
      : {};

    // 1. If customProperties.properties exists (user configured properties table),
    // strictly respect useForAuth: true
    if (Array.isArray(props.properties)) {
      props.properties.forEach((p: Record<string, unknown>) => {
        if (p && p.key && typeof p.key === 'string' && !seen.has(p.key)) {
          const isExplicitlyMarkedForAuth = Boolean(p.useForAuth);
          if (isExplicitlyMarkedForAuth) {
            seen.add(p.key);
            propList.push({
              key: p.key,
              value: p.value !== undefined ? String(p.value) : '',
              isSecret: Boolean(p.isSecret),
              useForAuth: true
            });
          }
        }
      });
    } else {
      // 2. Legacy fallback only when customProperties.properties array is absent:
      // check requestPayload keys configured under customProperties.auth.requestPayload
      Object.keys(reqPayload).forEach(k => {
        if (!seen.has(k)) {
          seen.add(k);
          propList.push({
            key: k,
            value: String(reqPayload[k] ?? ''),
            isSecret: k.toLowerCase().includes('secret') || k.toLowerCase().includes('pass'),
            useForAuth: true
          });
        }
      });
    }

    return propList;
  }, [resource]);

  // Read saved integration configuration when resource opens
  useEffect(() => {
    if (!resource) return;

    setTestResult(null);
    const props = resource.customProperties || {};
    const existingAuth: Record<string, unknown> = (props.auth && typeof props.auth === 'object')
      ? (props.auth as Record<string, unknown>)
      : {};

    const detectedMethod = String(
      existingAuth.method ||
      props.authMethod ||
      ((props.clientId || props.clientSecret) ? 'OAUTH2_BEARER' : 'NONE')
    );
    setAuthType(detectedMethod);

    setTokenPath(String(props.tokenPath || existingAuth.tokenPath || '/WMS.Api/api/authentication'));
    setTokenResponseField(String(props.tokenResponseField || existingAuth.tokenResponseField || 'accessToken'));

    // API Key
    setApiKeyHeader(String(props.apiKeyHeader || existingAuth.header || 'X-API-KEY'));
    const initialApiKeyProp = String(existingAuth.keyProperty || props.apiKeyProperty || '');
    setApiKeyProperty(initialApiKeyProp || (authProperties[0]?.key || ''));

    // Basic Auth
    const userProp = String(existingAuth.userProperty || props.basicUserProperty || '');
    const passProp = String(existingAuth.passProperty || props.basicPassProperty || '');
    setBasicUserProperty(userProp || (authProperties.find(p => p.key.toLowerCase().includes('user'))?.key || 'username'));
    setBasicPassProperty(passProp || (authProperties.find(p => p.key.toLowerCase().includes('pass'))?.key || 'password'));
  }, [resource, isOpen, authProperties]);

  // Read-only JSON payload preview constructed from auth-marked properties
  const authPayloadPreview = useMemo(() => {
    const payload: Record<string, unknown> = {};
    authProperties.forEach(p => {
      payload[p.key] = p.isSecret ? '••••••••' : (p.value || '');
    });
    return payload;
  }, [authProperties]);

  // Execute test validation
  const handleTestAuth = async () => {
    if (!resource) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const updatedProps: Record<string, unknown> = { ...(resource.customProperties || {}) };
      const baseUrl = resource.ip || String(updatedProps.ip || updatedProps.baseUrl || '');

      const authPayload: Record<string, unknown> = {};
      authProperties.forEach(p => {
        authPayload[p.key] = p.value;
      });

      let userVal = '';
      let passVal = '';
      if (basicUserProperty) {
        const found = authProperties.find(p => p.key === basicUserProperty);
        userVal = found ? found.value : String(updatedProps[basicUserProperty] || '');
      }
      if (basicPassProperty) {
        const found = authProperties.find(p => p.key === basicPassProperty);
        passVal = found ? found.value : String(updatedProps[basicPassProperty] || '');
      }

      let apiVal = '';
      if (apiKeyProperty) {
        const found = authProperties.find(p => p.key === apiKeyProperty);
        apiVal = found ? found.value : String(updatedProps[apiKeyProperty] || '');
      }

      const res = await resourceService.testAuthConnection({
        resourceId: resource.resourceId,
        baseUrl: baseUrl,
        tokenPath: tokenPath,
        tokenField: tokenResponseField,
        authMethod: authType,
        authPayload: authType === 'OAUTH2_BEARER' ? authPayload : undefined,
        apiKeyHeader: apiKeyHeader,
        apiKeyValue: apiVal,
        username: userVal,
        password: passVal
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Authentication verified successfully! Token acquired and cached in memory.',
          tokenSnippet: res.token ? res.token.substring(0, 48) + '...' : undefined
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || res.message || 'Authentication failed. Check credentials and endpoint URL.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        message: msg || 'Authentication test failed. Check host reachability and credentials.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'OAUTH2_BEARER':
        return 'OAuth 2.0 / Bearer Token (Dynamic Body Authentication)';
      case 'API_KEY':
        return 'API Key Header Authentication';
      case 'BASIC_AUTH':
        return 'HTTP Basic Authentication (Username & Password)';
      case 'NONE':
        return 'No Authentication (Open / Direct Network)';
      default:
        return method;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} color="#D97706" />
          <span>Methods & Authentication Validation</span>
        </div>
      }
      subtitle={`Validation & Testing for: ${resource.resourceId} (${resource.name})`}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <Info size={13} />
            <span>Read-only validation screen. To update parameters, use <strong>Edit Resource</strong>.</span>
          </div>
          <Button variant="secondary" onClick={onClose} disabled={isTesting}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Informational Read-Only Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          border: '1px solid rgba(217, 119, 6, 0.25)'
        }}>
          <Info size={16} color="#D97706" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            This window is configured for <strong>Quick User-Side Validation & Live Testing</strong> only. All parameters below are read-only and reflect active resource settings.
          </div>
        </div>

        {/* Integration Method Information (Non-editable) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
            Integration Method & Authentication Protocol
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-page)',
            border: '1px solid var(--border-default)'
          }}>
            <span style={{
              display: 'inline-flex',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: authType === 'NONE' ? '#E2E8F0' : 'rgba(37, 99, 235, 0.1)',
              color: authType === 'NONE' ? '#475569' : '#2563EB'
            }}>
              {authType}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {getMethodLabel(authType)}
            </span>
          </div>
        </div>

        {/* METHOD: OAUTH2_BEARER Read-Only Info */}
        {authType === 'OAUTH2_BEARER' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              <ShieldCheck size={15} />
              <span>OAuth 2.0 / Bearer Token Parameters (Configured for Authentication)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Token Endpoint Path
                </span>
                <div style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)'
                }}>
                  {tokenPath || '/api/authentication'}
                </div>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Response Token Field
                </span>
                <div style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)'
                }}>
                  {tokenResponseField || 'accessToken'}
                </div>
              </div>
            </div>

            {/* Authentication-Marked Properties Only */}
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Authentication Parameters (Marked for Authentication):
              </span>
              {authProperties.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '10px', border: '1px dashed var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-page)' }}>
                  No properties currently marked for authentication. Add or mark properties in <em>Edit Resource</em>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {authProperties.map(prop => (
                    <div
                      key={prop.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={13} color="#10B981" />
                        <code style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{prop.key}</code>
                        {prop.isSecret && (
                          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 600 }}>
                            Secret
                          </span>
                        )}
                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 600 }}>
                          For Auth
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {prop.isSecret ? '••••••••' : prop.value || '[empty]'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Request Body Preview */}
            <div>
              <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Request Body Generated for Authentication:
              </span>
              <JsonViewer data={authPayloadPreview} />
            </div>
          </div>
        )}

        {/* METHOD: API_KEY Read-Only Info */}
        {authType === 'API_KEY' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              <Key size={14} />
              <span>API Key Authentication Configuration</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Header Name
                </span>
                <div style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)'
                }}>
                  {apiKeyHeader || 'X-API-KEY'}
                </div>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Associated Key Property
                </span>
                <div style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}>
                  {apiKeyProperty || 'apiKeyValue'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* METHOD: BASIC_AUTH Read-Only Info */}
        {authType === 'BASIC_AUTH' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
              <Lock size={14} />
              <span>HTTP Basic Authentication Configuration</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Username Parameter
                </span>
                <div style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}>
                  {basicUserProperty || 'username'}
                </div>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Password Parameter
                </span>
                <div style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-page)',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}>
                  {basicPassProperty || 'password'} (••••••••)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick User-Side Validation & Test Connection Action */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                Live Connection & Token Validation
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Test authenticating with host endpoint to ensure credentials and token acquisition work as expected.
              </span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleTestAuth}
              isLoading={isTesting}
              leftIcon={<Zap size={14} />}
            >
              Test Authentication
            </Button>
          </div>

          {testResult && (
            <Alert
              variant={testResult.success ? 'success' : 'danger'}
              title={testResult.success ? 'Authentication Verified' : 'Authentication Test Failed'}
            >
              <div>{testResult.message}</div>
              {testResult.tokenSnippet && (
                <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
                  <strong>Token Received:</strong> {testResult.tokenSnippet}
                </div>
              )}
            </Alert>
          )}
        </div>
      </div>
    </Modal>
  );
};
