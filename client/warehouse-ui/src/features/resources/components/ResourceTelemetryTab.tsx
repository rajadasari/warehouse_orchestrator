import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings
} from 'lucide-react';
import { 
  DataCollectionType, 
  PropertyTelemetryPolicyItem
} from '../types/resourceManagerTypes';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';

const SAMPLE_POLICIES: PropertyTelemetryPolicyItem[] = [
  {
    propertyName: 'axisVibrationRms',
    enabled: true,
    collectionType: 'SAMPLE_WINDOW',
    intervalMs: 1000
  },
  {
    propertyName: 'bearingTemperatureC',
    enabled: true,
    collectionType: 'DEADBAND_ABSOLUTE',
    deadbandThreshold: 0.5,
    heartbeatSeconds: 60
  },
  {
    propertyName: 'operationalStatus',
    enabled: true,
    collectionType: 'ON_CHANGE'
  },
  {
    propertyName: 'stateOfChargePct',
    enabled: true,
    collectionType: 'DEADBAND_PERCENT',
    deadbandThreshold: 2.0
  },
  {
    propertyName: 'ambientHumidityPct',
    enabled: true,
    collectionType: 'PERIODIC_POLL',
    intervalMs: 5000
  }
];

export const ResourceTelemetryTab: React.FC = () => {
  const [policies, setPolicies] = useState<PropertyTelemetryPolicyItem[]>(SAMPLE_POLICIES);
  const [selectedMetric, setSelectedMetric] = useState<string>('bearingTemperatureC');
  const [isEditingPolicy, setIsEditingPolicy] = useState<PropertyTelemetryPolicyItem | null>(null);

  // Live oscilloscope simulation data for the ring buffer
  const [dataPoints, setDataPoints] = useState<number[]>([42.1, 42.1, 42.4, 43.0, 44.2, 45.1, 45.1, 45.5, 46.2, 46.8, 47.1, 46.9, 46.4, 45.9, 45.8]);

  // Simulate incoming live telemetry stream
  useEffect(() => {
    const timer = setInterval(() => {
      setDataPoints(prev => {
        const last = prev[prev.length - 1];
        const drift = (Math.random() - 0.48) * 0.8;
        const nextVal = Math.round((last + drift) * 10) / 10;
        const updated = [...prev.slice(1), nextVal];
        return updated;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const currentPolicy = useMemo(() => {
    return policies.find(p => p.propertyName === selectedMetric) || policies[0];
  }, [policies, selectedMetric]);

  const currentVal = dataPoints[dataPoints.length - 1];
  const minVal = Math.min(...dataPoints);
  const maxVal = Math.max(...dataPoints);

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingPolicy) return;
    setPolicies(policies.map(p => p.propertyName === isEditingPolicy.propertyName ? isEditingPolicy : p));
    setIsEditingPolicy(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Telemetry Historian & Live Oscilloscope
            </h2>
            <Badge variant="info">RingBuffer (Zero GC)</Badge>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Supervise high-frequency sensor streams, verify deadband filtering, and tune automated collection policies.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Metric Stream:</span>
          <select
            className="form-input"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{ height: '36px', fontSize: '12px' }}
          >
            {policies.map(p => (
              <option key={p.propertyName} value={p.propertyName}>{p.propertyName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Visualizer Card */}
      <div style={{
        backgroundColor: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }} />
            <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'monospace', color: '#f8fafc' }}>
              {selectedMetric}
            </span>
            <Badge variant="neutral">{currentPolicy.collectionType}</Badge>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Live: </span>
              <strong style={{ color: '#38bdf8', fontSize: '14px' }}>{currentVal}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Min (Window): </span>
              <strong style={{ color: '#a7f3d0' }}>{minVal}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Max (Window): </span>
              <strong style={{ color: '#fca5a5' }}>{maxVal}</strong>
            </div>
          </div>
        </div>

        {/* Oscilloscope Bar Chart Visualizer */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '16px',
          height: '130px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          boxSizing: 'border-box'
        }}>
          {dataPoints.map((val, idx) => {
            const range = Math.max(0.1, maxVal - minVal);
            const heightPercent = Math.max(15, Math.min(100, ((val - minVal) / range) * 85 + 15));
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    backgroundColor: idx === dataPoints.length - 1 ? '#38bdf8' : '#0284c7',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.3s ease',
                    boxShadow: idx === dataPoints.length - 1 ? '0 0 10px #38bdf8' : 'none'
                  }}
                  title={`Sample ${idx + 1}: ${val}`}
                />
                <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry Logging Policies Table */}
      <div style={{
        backgroundColor: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '8px',
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Configured Property Logging Policies
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Single Partitioned Table (TimescaleDB Hypertable)
          </span>
        </div>

        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '10px 14px' }}>Property Name</th>
                <th style={{ padding: '10px 14px' }}>Collection Mode</th>
                <th style={{ padding: '10px 14px' }}>Parameters</th>
                <th style={{ padding: '10px 14px' }}>Liveness Heartbeat</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Configuration</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(policy => (
                <tr key={policy.propertyName} style={{ borderBottom: '1px solid #334155', color: '#f8fafc' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontFamily: 'monospace' }}>
                    {policy.propertyName}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: '#334155',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      color: '#38bdf8'
                    }}>
                      {policy.collectionType}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                    {policy.collectionType === 'DEADBAND_ABSOLUTE' && `Δ >= ${policy.deadbandThreshold}`}
                    {policy.collectionType === 'DEADBAND_PERCENT' && `Shift >= ${policy.deadbandThreshold}%`}
                    {policy.collectionType === 'PERIODIC_POLL' && `Cadence: ${policy.intervalMs}ms`}
                    {policy.collectionType === 'SAMPLE_WINDOW' && `Window: ${policy.intervalMs}ms (RMS)`}
                    {policy.collectionType === 'ON_CHANGE' && 'Instantaneous Transition'}
                    {policy.collectionType === 'HYBRID_HEARTBEAT' && `Δ >= ${policy.deadbandThreshold}`}
                  </td>
                  <td style={{ padding: '10px 14px', color: policy.heartbeatSeconds ? '#a7f3d0' : '#64748b' }}>
                    {policy.heartbeatSeconds ? `${policy.heartbeatSeconds}s maximum silence` : 'Disabled'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge variant={policy.enabled ? 'success' : 'neutral'}>
                      {policy.enabled ? 'STREAMING' : 'MUTED'}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingPolicy({ ...policy })}
                      leftIcon={<Settings size={13} />}
                      style={{ minHeight: '48px', minWidth: '48px' }}
                    >
                      Edit Policy
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Policy Modal */}
      {isEditingPolicy && (
        <Modal
          isOpen={Boolean(isEditingPolicy)}
          onClose={() => setIsEditingPolicy(null)}
          title={`Edit Telemetry Policy: ${isEditingPolicy.propertyName}`}
        >
          <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Collection Strategy
              </label>
              <select
                className="form-input"
                value={isEditingPolicy.collectionType}
                onChange={(e) => setIsEditingPolicy({
                  ...isEditingPolicy,
                  collectionType: e.target.value as DataCollectionType
                })}
                style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
              >
                <option value="ON_CHANGE">ON_CHANGE (Record on state shift only)</option>
                <option value="PERIODIC_POLL">PERIODIC_POLL (Regular wall-clock sampling)</option>
                <option value="DEADBAND_ABSOLUTE">DEADBAND_ABSOLUTE (Filter analog sensor noise by delta)</option>
                <option value="DEADBAND_PERCENT">DEADBAND_PERCENT (Filter relative ratio fluctuation)</option>
                <option value="SAMPLE_WINDOW">SAMPLE_WINDOW (Sliding RAM buffer aggregation)</option>
                <option value="HYBRID_HEARTBEAT">HYBRID_HEARTBEAT (Deadband + liveness heartbeat)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Deadband Delta / Threshold
              </label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={isEditingPolicy.deadbandThreshold || 0}
                onChange={(e) => setIsEditingPolicy({
                  ...isEditingPolicy,
                  deadbandThreshold: parseFloat(e.target.value) || 0
                })}
                style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Interval / Window Duration (ms)
              </label>
              <input
                type="number"
                className="form-input"
                value={isEditingPolicy.intervalMs || 0}
                onChange={(e) => setIsEditingPolicy({
                  ...isEditingPolicy,
                  intervalMs: parseInt(e.target.value, 10) || 0
                })}
                style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Guaranteed Liveness Heartbeat (seconds)
              </label>
              <input
                type="number"
                className="form-input"
                value={isEditingPolicy.heartbeatSeconds || 0}
                onChange={(e) => setIsEditingPolicy({
                  ...isEditingPolicy,
                  heartbeatSeconds: parseInt(e.target.value, 10) || 0
                })}
                style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setIsEditingPolicy(null)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit">Update Policy</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
