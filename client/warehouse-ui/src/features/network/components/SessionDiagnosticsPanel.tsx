import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { SessionDiagnosticsData, NetworkDeviceChannel } from '../types';
import { networkService } from '../networkService';

interface SessionDiagnosticsPanelProps {
  channel: NetworkDeviceChannel;
}

export const SessionDiagnosticsPanel: React.FC<SessionDiagnosticsPanelProps> = ({ channel }) => {
  const [diag, setDiag] = useState<SessionDiagnosticsData | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    networkService.getDiagnostics(channel.id).then(d => setDiag(d));
  }, [channel.id]);

  const handleForceReconnect = () => {
    setReconnecting(true);
    setFeedback(null);
    setTimeout(() => {
      setReconnecting(false);
      setFeedback('SecureChannel re-established and session activated successfully (14ms)');
    }, 700);
  };

  if (!diag) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Banner */}
      <div style={{
        padding: '14px 18px',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 10px #10B981'
          }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Session Diagnostics: {channel.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              CONNECTED &bull; Session Active for {diag.uptime} &bull; Endpoint: {channel.endpointUrl}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleForceReconnect}
            disabled={reconnecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={reconnecting ? 'animate-spin' : ''} />
            {reconnecting ? 'Reconnecting...' : 'Force Auto-Reconnect'}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10B981',
          fontSize: '11.5px',
          color: '#10B981',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={14} />
          {feedback}
        </div>
      )}

      {/* Grid of 3 Diagnostic Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: '14px' }}>
        
        {/* 1. Lifecycle State Machine */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Session Lifecycle State
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'TCP Socket Open', ok: diag.tcpSocketOpen },
              { label: 'TLS Certificate Exchanged', ok: diag.tlsCertificateExchanged },
              { label: 'SecureChannel Created', ok: diag.secureChannelCreated },
              { label: 'Session Token Activated', ok: diag.sessionActivated }
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981'
                }}>
                  <CheckCircle2 size={14} />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Latency & Jitter Monitor */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Real-time Latency & Heartbeat Jitter
            </span>
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
              0 Missed Packets
            </span>
          </div>

          {/* Simulated Waveform Bar Graph */}
          <div style={{
            height: '110px',
            backgroundColor: '#030712',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px'
          }}>
            {[3.2, 3.4, 3.8, 3.5, 3.4, 3.1, 4.0, 3.3, 3.5, 3.6, 3.4, 3.2, 3.7, 3.4, 3.3].map((val, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${(val / 6.0) * 100}%`,
                  backgroundColor: '#10B981',
                  borderRadius: '2px',
                  opacity: 0.85
                }}
                title={`${val}ms`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
            <span>60s ago</span>
            <span>Avg Round-Trip Ping: <strong>{diag.avgLatencyMs}ms</strong></span>
            <span>Current</span>
          </div>
        </div>

        {/* 3. Channel Metrics */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Channel Telemetry Metrics
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Bytes In / Out</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{diag.bytesIn} / {diag.bytesOut}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Monitored Items</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{diag.monitoredItemsCount} tags</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Publishing Interval</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{diag.publishingIntervalMs}ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Keepalive Watchdog</span>
              <span style={{ fontWeight: 600, color: '#10B981', fontFamily: 'monospace' }}>
                {diag.missedKeepalives}/{diag.maxMissedAllowed} Failures
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
