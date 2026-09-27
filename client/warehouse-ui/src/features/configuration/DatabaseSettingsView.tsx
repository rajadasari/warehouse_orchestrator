import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Server,
  Zap,
  Shield,
  Activity,
  AlertTriangle,
  Info,
  Layers,
  Cpu
} from 'lucide-react';
import {
  databaseConfigService,
  CurrentDatabaseConfig,
  TestConnectionResponse
} from '../../services/databaseConfigService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';

export const DatabaseSettingsView: React.FC = () => {
  const [currentConfig, setCurrentConfig] = useState<CurrentDatabaseConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [host, setHost] = useState<string>('[::1]');
  const [port, setPort] = useState<number>(5432);
  const [databaseName, setDatabaseName] = useState<string>('warehouse_db');
  const [username, setUsername] = useState<string>('warehouse_app');
  const [password, setPassword] = useState<string>('warehouse_test123');
  const [currentSchema, setCurrentSchema] = useState<string>('wes');
  const [sslMode, setSslMode] = useState<string>('disable');
  const [maxPoolSize, setMaxPoolSize] = useState<number>(10);
  const [minIdle, setMinIdle] = useState<number>(2);

  // Connection testing state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const cfg = await databaseConfigService.getCurrentConfig();
      setCurrentConfig(cfg);
      const rawHost = cfg.host || '[::1]';
      const effectiveHost = (rawHost === 'localhost' || rawHost === '127.0.0.1') ? '[::1]' : rawHost;
      setHost(effectiveHost);
      setPort(cfg.port || 5432);
      setDatabaseName(cfg.databaseName || 'warehouse_db');
      setUsername(cfg.username || 'warehouse_app');
      setCurrentSchema(cfg.currentSchema || 'wes');
      setSslMode(cfg.sslMode || 'disable');
      setMaxPoolSize(cfg.maxPoolSize || 10);
      setMinIdle(cfg.minIdle || 2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch current database configuration.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMsg(null);
    try {
      const res = await databaseConfigService.testConnection({
        host,
        port,
        databaseName,
        username,
        password: password || 'warehouse_test123',
        currentSchema,
        sslMode
      });
      setTestResult(res);
      if (res.success && (host === 'localhost' || host === '127.0.0.1')) {
        setHost('[::1]');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network error';
      setTestResult({
        success: false,
        responseTimeMs: 0,
        message: 'Connection test failed',
        errorDetails: msg
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await databaseConfigService.updateConfig({
        host,
        port,
        databaseName,
        username,
        password: password || 'warehouse_test123',
        currentSchema,
        sslMode,
        maxPoolSize,
        minIdle
      });
      if (res.success) {
        setSaveSuccessMsg(res.message);
        if (host === 'localhost' || host === '127.0.0.1') {
          setHost('[::1]');
        }
        fetchConfig();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update database configuration.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (presetHost: string, presetPort: number, presetDb: string) => {
    setHost(presetHost);
    setPort(presetPort);
    setDatabaseName(presetDb);
    if (!password) {
      setPassword('warehouse_test123');
    }
    if (!username) {
      setUsername('warehouse_app');
    }
    setTestResult(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: '100vh',
      boxSizing: 'border-box',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-page)'
    }}>
      {/* 1. Header Toolbar (Compact & Action-Focused) */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface)',
        flexShrink: 0,
        zIndex: 10,
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-primary-600)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            flexShrink: 0
          }}>
            <Database size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Database Configuration
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                padding: '1px 6px',
                borderRadius: '9999px',
                border: '1px solid var(--color-primary-200)',
                textTransform: 'uppercase'
              }}>
                PostgreSQL
              </span>
              <Badge variant={currentConfig?.isConnected ? 'success' : 'danger'}>
                {currentConfig?.isConnected ? `ONLINE (${currentConfig.responseTimeMs}ms)` : 'OFFLINE'}
              </Badge>
            </div>
            <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Industrial persistence endpoint, schema routing, credentials, and connection pool tuning
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
            isLoading={isLoading}
            onClick={fetchConfig}
            title="Reload current settings from server"
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Zap size={13} />}
            isLoading={isTesting}
            onClick={handleTestConnection}
            title="Validate connection against PostgreSQL before saving"
          >
            Test Connection
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle2 size={13} />}
            isLoading={isSaving}
            onClick={handleSaveConfig}
            title="Save and write configuration to server"
          >
            Save & Apply
          </Button>
        </div>
      </header>

      {/* 2. Responsive Scrollable Viewport */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '14px 20px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        {/* Alerts Section */}
        {errorMsg && (
          <Alert variant="danger" title="Configuration Alert" onClose={() => setErrorMsg(null)}>
            <div>{errorMsg}</div>
            <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.9 }}>
              Tip: On Windows hosts, PostgreSQL often binds to IPv6 loopback. If <code>localhost</code> is refused, try selecting <strong>IPv6 Loopback ([::1])</strong>.
            </div>
          </Alert>
        )}

        {saveSuccessMsg && (
          <Alert variant="success" title="Database Configuration Saved" onClose={() => setSaveSuccessMsg(null)}>
            <div>{saveSuccessMsg}</div>
            <div style={{ marginTop: '4px', fontSize: '11.5px', fontWeight: 600 }}>
              To activate in runtime services, restart platform: <code>.\scripts\onprem\manage_services.ps1 -Action restart</code>
            </div>
          </Alert>
        )}

        {/* Quick Presets & Live Telemetry Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {/* Presets Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} color="var(--color-warning-base)" />
              Presets:
            </span>
            <Button
              size="sm"
              variant={host === '[::1]' ? 'primary' : 'outline'}
              onClick={() => applyPreset('[::1]', 5432, 'warehouse_db')}
              style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
            >
              [::1] IPv6 (Localhost)
            </Button>
            <Button
              size="sm"
              variant={host === 'localhost' ? 'primary' : 'outline'}
              onClick={() => applyPreset('localhost', 5432, 'warehouse_db')}
              style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
            >
              localhost
            </Button>
            <Button
              size="sm"
              variant={host === '127.0.0.1' ? 'primary' : 'outline'}
              onClick={() => applyPreset('127.0.0.1', 5432, 'warehouse_db')}
              style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
            >
              127.0.0.1 (IPv4)
            </Button>
            <Button
              size="sm"
              variant={host === '192.168.1.50' ? 'primary' : 'outline'}
              onClick={() => applyPreset('192.168.1.50', 5432, 'warehouse_db')}
              style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
            >
              192.168.1.50 (OT Server)
            </Button>
          </div>

          {/* Telemetry Summary Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Cpu size={12} />
              Engine: <strong style={{ color: 'var(--text-primary)' }}>{currentConfig?.serverVersion ? currentConfig.serverVersion.split(' ')[0] + ' ' + (currentConfig.serverVersion.split(' ')[1] || '') : 'PostgreSQL'}</strong>
            </span>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Layers size={12} />
              Schema: <strong style={{ color: 'var(--text-primary)' }}>{currentConfig?.currentSchema || 'wes'}</strong>
            </span>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Activity size={12} />
              Pool: <strong style={{ color: 'var(--text-primary)' }}>{currentConfig?.maxPoolSize ?? 10} max / {currentConfig?.minIdle ?? 2} idle</strong>
            </span>
          </div>
        </div>

        {/* Test Result Alert Banner */}
        {testResult && (
          <Alert
            variant={testResult.success ? 'success' : 'danger'}
            title={testResult.success ? 'Database Connection Verified' : 'Database Connection Test Failed'}
            onClose={() => setTestResult(null)}
          >
            <div>{testResult.message}</div>
            {testResult.success && (
              <div style={{ marginTop: '5px', fontSize: '11.5px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>Latency: <strong style={{ color: 'var(--color-success-base)' }}>{testResult.responseTimeMs} ms</strong></span>
                <span>Database: <strong>{testResult.currentDatabase}</strong></span>
                <span>User: <strong>{testResult.currentUser}</strong></span>
                <span>Tables: <strong>{testResult.platformTableCount}</strong></span>
                <span>Schemas: <strong>{testResult.existingSchemas?.join(', ') || 'wes'}</strong></span>
              </div>
            )}
            {!testResult.success && testResult.errorDetails && (
              <div style={{ marginTop: '4px', fontSize: '11px', fontFamily: 'monospace', opacity: 0.9 }}>
                Failure details: {testResult.errorDetails}
              </div>
            )}
          </Alert>
        )}

        {/* Main Form Cards: Responsive 2-Column Industrial Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}>
          {/* Card 1: Network & Endpoint Settings */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} style={{ color: 'var(--color-primary-500)' }} />
                <span>Network & Database Endpoint</span>
              </div>
            }
            subtitle="Target database host, port, database catalog, and schema"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Host & Port Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '8px' }}>
                <Input
                  label="Host / IP Address"
                  required
                  prefixIcon={<Server size={12} />}
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  placeholder="[::1] or localhost"
                  hint="IPv6 loopback [::1] or IPv4 address"
                />

                <Input
                  label="Port"
                  type="number"
                  required
                  value={port}
                  onChange={e => setPort(Number(e.target.value))}
                  placeholder="5432"
                  hint="Default: 5432"
                />
              </div>

              {/* Database Name & Schema Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input
                  label="Database Name"
                  required
                  prefixIcon={<Database size={12} />}
                  value={databaseName}
                  onChange={e => setDatabaseName(e.target.value)}
                  placeholder="warehouse_db"
                  hint="PostgreSQL database catalog"
                />

                <Select
                  label="Target Default Schema"
                  value={currentSchema}
                  onChange={e => setCurrentSchema(e.target.value)}
                  options={[
                    { value: 'wes', label: 'wes (Execution System)' },
                    { value: 'auth', label: 'auth (Identity & Access)' },
                    { value: 'wms', label: 'wms (Inventory & Stock)' },
                    { value: 'wcs', label: 'wcs (Conveyor Control)' },
                    { value: 'asrs', label: 'asrs (Stacker Cranes)' },
                    { value: 'fleet', label: 'fleet (Robots / AGV)' },
                    { value: 'public', label: 'public' }
                  ]}
                  hint="Primary search path"
                />
              </div>

              {/* SSL Mode */}
              <Select
                label="SSL / TLS Transport Encryption"
                value={sslMode}
                onChange={e => setSslMode(e.target.value)}
                options={[
                  { value: 'disable', label: 'disable (Air-gapped on-premise industrial LAN)' },
                  { value: 'prefer', label: 'prefer (Attempt TLS, fallback to plain)' },
                  { value: 'require', label: 'require (Enforce TLS encryption)' },
                  { value: 'verify-full', label: 'verify-full (Strict certificate check)' }
                ]}
                hint="Use disable for air-gapped on-premise deployments"
              />
            </div>
          </Card>

          {/* Card 2: Security & Pool Tuning */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} style={{ color: 'var(--color-primary-500)' }} />
                <span>Authentication & Connection Pool</span>
              </div>
            }
            subtitle="Access credentials and HikariCP connection pool parameters"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Username & Password Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input
                  label="Username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="warehouse_app"
                  hint="Database user account"
                />

                <Input
                  label="Password"
                  type="password"
                  showPasswordToggle
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  hint="Leave blank to keep existing"
                />
              </div>

              {/* Max Pool & Min Idle Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input
                  label="Max Pool Size"
                  type="number"
                  value={maxPoolSize}
                  onChange={e => setMaxPoolSize(Number(e.target.value))}
                  placeholder="10"
                  hint="Maximum active connections"
                />

                <Input
                  label="Min Idle Connections"
                  type="number"
                  value={minIdle}
                  onChange={e => setMinIdle(Number(e.target.value))}
                  placeholder="2"
                  hint="Pre-allocated warm connections"
                />
              </div>

              {/* IEC 62443 Security Notice Box */}
              <div style={{
                marginTop: '2px',
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle, rgba(0,0,0,0.03))',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <Info size={14} style={{ color: 'var(--color-primary-500)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>IEC 62443 Security:</strong> Credentials are encrypted at rest in <code>platform.env</code> and service definitions. Connection secrets are never logged in plain text.
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Bottom Action Bar (Convenient Save Trigger) */}
        <footer style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={13} style={{ color: 'var(--color-warning-base)', flexShrink: 0 }} />
            <span>Always test connection prior to applying. Configuration changes require service restart.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Zap size={13} />}
              isLoading={isTesting}
              onClick={handleTestConnection}
            >
              Test Connection
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 size={13} />}
              isLoading={isSaving}
              onClick={handleSaveConfig}
            >
              Save & Apply
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};
