import React, { useState } from 'react';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Search
} from 'lucide-react';
import { ResourceShapeItem } from '../types/resourceManagerTypes';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';

// Initial default shapes reflecting standard warehouse archetypes
const DEFAULT_SHAPES: ResourceShapeItem[] = [
  {
    shapeCode: 'BATTERY_POWERED',
    shapeName: 'Battery Powered Pack',
    description: 'LiFePO4 battery pack telemetry, state of charge, and docking request controls',
    defaultProperties: { stateOfChargePct: 100.0, batteryVoltageV: 24.0, isCharging: false },
    properties: [
      { key: 'stateOfChargePct', label: 'State of Charge', type: 'DOUBLE', unit: '%', required: true },
      { key: 'batteryVoltageV', label: 'Battery Voltage', type: 'DOUBLE', unit: 'V', required: true },
      { key: 'isCharging', label: 'Charging State', type: 'BOOLEAN', required: true }
    ],
    methods: [
      { name: 'requestDocking', type: 'CONTROL', safetyTier: 'OPERATIONAL', description: 'Triggers automated navigation to charging dock' }
    ]
  },
  {
    shapeCode: 'NETWORK_TELEMETRY',
    shapeName: 'Network & Signal Telemetry',
    description: 'Wi-Fi/Cellular connectivity metrics, RSSI attenuation, and IP diagnostics',
    defaultProperties: { rssiSignalDbm: -55, ipAddress: '192.168.1.100' },
    properties: [
      { key: 'rssiSignalDbm', label: 'Signal Strength', type: 'INTEGER', unit: 'dBm', required: false },
      { key: 'ipAddress', label: 'IP Address', type: 'STRING', required: true }
    ],
    methods: [
      { name: 'pingDiagnostics', type: 'DIAGNOSTIC', safetyTier: 'READ_ONLY', description: 'Runs ICMP latency check' }
    ]
  },
  {
    shapeCode: 'SCAN_ENGINE',
    shapeName: '2D Barcode Scan Engine',
    description: 'Fixed high-speed raster/camera barcode scanner for cartons and pallets',
    defaultProperties: { lastScannedBarcode: '', scanSuccess: true },
    properties: [
      { key: 'lastScannedBarcode', label: 'Last Barcode', type: 'STRING', required: true },
      { key: 'scanSuccess', label: 'Scan Successful', type: 'BOOLEAN', required: true }
    ],
    methods: [
      { name: 'triggerLaserBeep', type: 'CONTROL', safetyTier: 'OPERATIONAL', description: 'Fires diagnostic audio tone' }
    ]
  }
];

export const ResourceShapesTab: React.FC = () => {
  const [shapes, setShapes] = useState<ResourceShapeItem[]>(DEFAULT_SHAPES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShape, setSelectedShape] = useState<ResourceShapeItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states for creating a new shape
  const [shapeCode, setShapeCode] = useState('');
  const [shapeName, setShapeName] = useState('');
  const [description, setDescription] = useState('');

  const filteredShapes = shapes.filter(s => 
    s.shapeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.shapeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateShape = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shapeCode.trim() || !shapeName.trim()) return;

    const newShape: ResourceShapeItem = {
      shapeCode: shapeCode.trim().toUpperCase(),
      shapeName: shapeName.trim(),
      description: description.trim(),
      defaultProperties: {},
      properties: [],
      methods: [],
      createdAt: new Date().toISOString()
    };

    setShapes([...shapes, newShape]);
    setShapeCode('');
    setShapeName('');
    setDescription('');
    setIsCreateModalOpen(false);
  };

  const handleDeleteShape = (code: string) => {
    setShapes(shapes.filter(s => s.shapeCode !== code));
    if (selectedShape?.shapeCode === code) {
      setSelectedShape(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Resource Shapes (Mixin Library)
            </h2>
            <Badge variant="info">{shapes.length} Available</Badge>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Reusable building blocks of properties & methods composed into equipment templates without rigid inheritance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Filter shapes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus size={14} />}
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            Create Shape
          </Button>
        </div>
      </div>

      {/* Grid of Shapes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingBottom: '16px'
      }}>
        {filteredShapes.map(shape => (
          <div
            key={shape.shapeCode}
            style={{
              backgroundColor: 'var(--card-bg, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8'
                  }}>
                    <Boxes size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                      {shape.shapeName}
                    </h3>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {shape.shapeCode}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteShape(shape.shapeCode)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px',
                    minWidth: '48px',
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Delete Shape"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                {shape.description || 'No description provided.'}
              </p>

              {/* Properties Section */}
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700 }}>
                  Properties ({shape.properties.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {shape.properties.map(p => (
                    <span
                      key={p.key}
                      style={{
                        fontSize: '11px',
                        backgroundColor: '#334155',
                        color: '#f8fafc',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {p.key}: <span style={{ color: '#38bdf8' }}>{p.type}</span>
                    </span>
                  ))}
                  {shape.properties.length === 0 && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>None</span>
                  )}
                </div>
              </div>

              {/* Methods Section */}
              <div>
                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700 }}>
                  Methods ({shape.methods.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {shape.methods.map(m => (
                    <span
                      key={m.name}
                      style={{
                        fontSize: '11px',
                        backgroundColor: '#1e3a8a',
                        color: '#93c5fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {m.name}()
                    </span>
                  ))}
                  {shape.methods.length === 0 && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>None</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedShape(shape)}
                style={{ minHeight: '48px', minWidth: '48px' }}
              >
                Inspect Schema
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Shape Modal */}
      {selectedShape && (
        <Modal
          isOpen={Boolean(selectedShape)}
          onClose={() => setSelectedShape(null)}
          title={`Shape Schema: ${selectedShape.shapeName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-primary)' }}>Packaged Properties</h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '6px' }}>Key</th>
                    <th style={{ padding: '6px' }}>Type</th>
                    <th style={{ padding: '6px' }}>Unit</th>
                    <th style={{ padding: '6px' }}>Required</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShape.properties.map(p => (
                    <tr key={p.key} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: '#f8fafc' }}>{p.key}</td>
                      <td style={{ padding: '6px', color: '#38bdf8' }}>{p.type}</td>
                      <td style={{ padding: '6px', color: '#94a3b8' }}>{p.unit || '-'}</td>
                      <td style={{ padding: '6px', color: p.required ? '#ef4444' : '#64748b' }}>{p.required ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-primary)' }}>Packaged Methods</h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '6px' }}>Method Name</th>
                    <th style={{ padding: '6px' }}>Type</th>
                    <th style={{ padding: '6px' }}>Safety Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShape.methods.map(m => (
                    <tr key={m.name} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: '#93c5fd' }}>{m.name}()</td>
                      <td style={{ padding: '6px' }}>{m.type}</td>
                      <td style={{ padding: '6px', color: m.safetyTier === 'SAFETY_CRITICAL' ? '#ef4444' : '#10b981' }}>{m.safetyTier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Shape Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Resource Shape"
      >
        <form onSubmit={handleCreateShape} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Shape Code</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. TEMPERATURE_SENSOR_PACK"
              value={shapeCode}
              onChange={(e) => setShapeCode(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Shape Display Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Dual Temperature Sensor"
              value={shapeName}
              onChange={(e) => setShapeName(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Detail what properties and capabilities this shape contributes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Save Shape</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
