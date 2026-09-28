import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  Zap 
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { PROTOCOL_CATALOG, ProtocolType, NetworkDeviceChannel } from './types';
import { networkService } from './networkService';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelAdded: (channel: NetworkDeviceChannel) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onChannelAdded
}) => {
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType>('OPC_UA');
  const [channelName, setChannelName] = useState('');
  const [deviceType, setDeviceType] = useState('Industrial Controller');
  const [endpointUrl, setEndpointUrl] = useState('opc.tcp://127.0.0.1:4840/freeopcua/server/');
  const [securityPolicy, setSecurityPolicy] = useState('None');
  const [authType, setAuthType] = useState<'ANONYMOUS' | 'USERNAME_PASSWORD' | 'CERTIFICATE'>('ANONYMOUS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(5000);
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(60000);
  const [reconnectIntervalMs, setReconnectIntervalMs] = useState(3000);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleProtocolSelect = (proto: ProtocolType) => {
    setSelectedProtocol(proto);
    setTestResult(null);
    if (proto === 'OPC_UA') {
      setEndpointUrl('opc.tcp://192.168.1.100:4840');
    } else if (proto === 'MODBUS_TCP') {
      setEndpointUrl('modbus.tcp://192.168.1.100:502');
    } else if (proto === 'SIEMENS_S7') {
      setEndpointUrl('s7://192.168.1.100:102/rack=0/slot=1');
    } else if (proto === 'MQTT_SPARKPLUG') {
      setEndpointUrl('mqtt://192.168.1.100:1883/spBv1.0/WH1/DDATA');
    } else {
      setEndpointUrl('http://192.168.1.100:8080/api/v1');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await networkService.testConnection(endpointUrl, selectedProtocol);
      setTestResult(res);
    } catch {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: 'Connection failed: Unable to establish socket with remote endpoint'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!channelName.trim() || !endpointUrl.trim()) return;
    setSaving(true);
    try {
      const newChan = await networkService.addChannel({
        name: channelName.trim(),
        deviceType: deviceType.trim(),
        protocol: selectedProtocol,
        endpointUrl: endpointUrl.trim(),
        securityPolicy,
        authType: authType === 'USERNAME_PASSWORD' ? 'Username / Password' : authType === 'CERTIFICATE' ? 'X.509 Certificate' : 'Anonymous',
        reconnectIntervalMs,
        sessionTimeoutMs,
        config: {
          username: authType === 'USERNAME_PASSWORD' ? username : undefined
        }
      });
      onChannelAdded(newChan);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Industrial Device Channel (Multi-Protocol)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Step 1: Protocol / Driver Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            1. Select Industrial Communication Protocol
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
            {PROTOCOL_CATALOG.map(p => {
              const isSelected = selectedProtocol === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleProtocolSelect(p.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? '#3B82F6' : 'var(--border-default)'}`,
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#3B82F6' : 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                    {p.isAvailable ? (
                      <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#10B981', color: '#ffffff', fontWeight: 600 }}>
                        READY
                      </span>
                    ) : (
                      <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#64748B', color: '#ffffff' }}>
                        SOON
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                    {p.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Channel Identity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Channel Name
            </label>
            <input
              type="text"
              value={channelName}
              onChange={e => setChannelName(e.target.value)}
              placeholder="e.g. SIEMENS_LINE_1"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Device / Equipment Type
            </label>
            <input
              type="text"
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
              placeholder="e.g. Infeed Conveyor Controller"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px'
              }}
            />
          </div>
        </div>

        {/* Step 3: Endpoint Coordinates */}
        <div>
          <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Device Endpoint URL
          </label>
          <input
            type="text"
            value={endpointUrl}
            onChange={e => setEndpointUrl(e.target.value)}
            placeholder="e.g. opc.tcp://192.168.1.100:4840"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        {/* Step 4: Protocol-Specific Settings (OPC-UA Security & Auth) */}
        {selectedProtocol === 'OPC_UA' && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>
              <ShieldCheck size={15} color="#10B981" /> OPC-UA Security & Authentication
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Security Policy (IEC 62443 Transport Encryption)
              </label>
              <select
                value={securityPolicy}
                onChange={e => setSecurityPolicy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="Basic256Sha256 - Sign & Encrypt">Basic256Sha256 - Sign & Encrypt (Recommended)</option>
                <option value="Aes128_Sha256_RsaOaep">Aes128_Sha256_RsaOaep - Sign & Encrypt</option>
                <option value="None">None (Unencrypted / Local Simulation Only)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                User Identity Token
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {(['ANONYMOUS', 'USERNAME_PASSWORD', 'CERTIFICATE'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAuthType(mode)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      border: `1px solid ${authType === mode ? '#3B82F6' : 'var(--border-default)'}`,
                      backgroundColor: authType === mode ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                      color: authType === mode ? '#3B82F6' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {mode === 'ANONYMOUS' ? 'Anonymous' : mode === 'USERNAME_PASSWORD' ? 'Username / Password' : 'X.509 Certificate'}
                  </button>
                ))}
              </div>

              {authType === 'USERNAME_PASSWORD' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px'
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Keep-Alive Watchdog */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>
            <Clock size={15} color="#3B82F6" /> Keep-Alive Watchdog & Reconnection Timers
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                Request Timeout
              </label>
              <input
                type="number"
                value={requestTimeoutMs}
                onChange={e => setRequestTimeoutMs(Number(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                Session Timeout
              </label>
              <input
                type="number"
                value={sessionTimeoutMs}
                onChange={e => setSessionTimeoutMs(Number(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                Reconnect Backoff
              </label>
              <input
                type="number"
                value={reconnectIntervalMs}
                onChange={e => setReconnectIntervalMs(Number(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '11px' }}
              />
            </div>
          </div>
        </div>

        {/* Verification Check banner */}
        {testResult && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${testResult.success ? '#10B981' : '#EF4444'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: testResult.success ? '#10B981' : '#EF4444'
          }}>
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>
              {testResult.message} {testResult.success && `(${testResult.latencyMs}ms)`}
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing}
            leftIcon={testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          >
            {testing ? 'Testing Handshake...' : 'Test Handshake & Ping'}
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveChannel}
              disabled={saving || !channelName.trim()}
              style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
            >
              {saving ? 'Starting Channel...' : 'Save & Start Channel'}
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
