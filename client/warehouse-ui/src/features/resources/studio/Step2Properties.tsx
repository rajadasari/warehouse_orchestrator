import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight,
  Sliders,
  Globe,
  Key
} from 'lucide-react';
import { PropertySchemaItem, ResourceTemplateItem } from '../../../services/resourceTemplateService';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { computeSyntheticEndpoint, extractConnectionCoordinates } from './endpointUtils';

export interface CustomPropertyRow {
  id: string;
  key: string;
  type: 
    | 'STRING' 
    | 'INTEGER' 
    | 'LONG' 
    | 'DOUBLE' 
    | 'NUMBER'
    | 'BOOLEAN' 
    | 'DATETIME' 
    | 'SECRET' 
    | 'ENUM' 
    | 'ARRAY' 
    | 'MAP' 
    | 'LOCATION';
  value: string;
  unit?: string;
  isSecretVisible?: boolean;
  useForAuth?: boolean;
}

export interface Step2PropertiesProps {
  selectedTemplate: ResourceTemplateItem | null;
  category?: string;
  inheritedValues: Record<string, unknown>;
  onChangeInheritedValue: (key: string, val: unknown) => void;
  customProperties: CustomPropertyRow[];
  onAddCustomProperty: () => void;
  onUpdateCustomProperty: (id: string, updates: Partial<CustomPropertyRow>) => void;
  onRemoveCustomProperty: (id: string) => void;
  inheritedAuthKeys?: string[];
  onToggleInheritedAuth?: (key: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2Properties: React.FC<Step2PropertiesProps> = ({
  selectedTemplate,
  category,
  inheritedValues,
  onChangeInheritedValue,
  customProperties,
  onAddCustomProperty,
  onUpdateCustomProperty,
  onRemoveCustomProperty,
  inheritedAuthKeys = [],
  onToggleInheritedAuth,
  onBack,
  onNext
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inheritedSecretVisibility, setInheritedSecretVisibility] = useState<Record<string, boolean>>({});

  const toggleInheritedSecret = (key: string) => {
    setInheritedSecretVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isSoftware = useMemo(() => {
    const cat = (category || selectedTemplate?.category || '').toUpperCase();
    const proto = (selectedTemplate?.communicationProtocol || '').toUpperCase();
    const rType = (selectedTemplate?.resourceType || '').toUpperCase();
    return cat === 'SOFTWARE' || proto === 'REST' || proto === 'HTTP' || rType === 'SOFTWARE';
  }, [category, selectedTemplate]);

  const propertySchema: PropertySchemaItem[] = useMemo(() => {
    const schema = [...(selectedTemplate?.propertySchema || [])];
    const existingKeys = new Set(schema.map(p => p.key));

    // Synthesize items from defaultProperties if not present in schema
    if (selectedTemplate?.defaultProperties) {
      Object.entries(selectedTemplate.defaultProperties).forEach(([k, v]) => {
        if (!existingKeys.has(k)) {
          existingKeys.add(k);
          schema.push({
            key: k,
            label: k,
            type: typeof v === 'number' ? 'INTEGER' : typeof v === 'boolean' ? 'BOOLEAN' : 'STRING',
            defaultValue: v,
            description: 'Template default property'
          });
        }
      });
    }

    return schema;
  }, [selectedTemplate]);

  // Filter properties by search query
  const filteredSchema = useMemo(() => {
    if (!searchQuery.trim()) return propertySchema;
    const q = searchQuery.toLowerCase().trim();
    return propertySchema.filter(p =>
      p.key.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [propertySchema, searchQuery]);

  const filteredCustom = useMemo(() => {
    if (!searchQuery.trim()) return customProperties;
    const q = searchQuery.toLowerCase().trim();
    return customProperties.filter(c =>
      c.key.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  }, [customProperties, searchQuery]);

  const totalInherited = propertySchema.length;
  const totalCustom = customProperties.length;

  // Unified properties for dynamic endpoint extraction
  const unifiedProperties = useMemo(() => {
    const customRec: Record<string, unknown> = {};
    customProperties.forEach(p => {
      if (p.key.trim()) customRec[p.key.trim()] = p.value;
    });
    return { ...inheritedValues, ...customRec };
  }, [inheritedValues, customProperties]);

  const { host, port, protocol } = extractConnectionCoordinates(unifiedProperties, selectedTemplate);
  const syntheticEndpoint = computeSyntheticEndpoint(host, port, protocol);
  const isStandaloneTwin = !protocol || !host;

  // Count active auth properties
  const activeAuthCount = useMemo(() => {
    const customAuth = customProperties.filter(c => c.useForAuth && c.key.trim()).length;
    return customAuth + inheritedAuthKeys.length;
  }, [customProperties, inheritedAuthKeys]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Search & Live Endpoint Bar */}
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
          gap: '12px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '6px 12px',
            flex: 1,
            minWidth: '220px',
            maxWidth: '380px'
          }}
        >
          <Search size={15} color="var(--text-secondary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search default & custom properties..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="neutral">
            {totalInherited} Inherited Defaults
          </Badge>
          <Badge variant="info">
            {totalCustom} Custom Properties
          </Badge>
          {activeAuthCount > 0 && (
            <Badge variant="warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              <Key size={12} style={{ marginRight: '4px' }} />
              {activeAuthCount} Auth Keys
            </Badge>
          )}
        </div>
      </div>

      {/* Live Resolved Endpoint (Derived from properties without duplicate inputs) */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px'
        }}
      >
        <Globe size={15} color={isStandaloneTwin ? '#10B981' : '#38BDF8'} />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Live Ingestion Status:</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
          {syntheticEndpoint}
        </span>
        {isStandaloneTwin && (
          <Badge variant="success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', marginLeft: 'auto' }}>
            Pure Digital Twin (Zero Sockets)
          </Badge>
        )}
      </div>

      {/* 2. Archetype Inherited Properties Table (Rendered only if template is present) */}
      {propertySchema.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#38BDF8" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Properties Matrix ({filteredSchema.length})
              </h4>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Template: {selectedTemplate?.templateName || selectedTemplate?.templateCode || 'Archetype'}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: isSoftware ? '24%' : '28%' }}>
                  Property Name / Key
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '12%' }}>
                  Data Type
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: isSoftware ? '16%' : '20%' }}>
                  Blueprint Default
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: isSoftware ? '28%' : '30%' }}>
                  Resource Value
                </th>
                {isSoftware && (
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '10%' }}>
                    Use for Auth
                  </th>
                )}
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '10%' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSchema.map(prop => {
                const currentValue = inheritedValues[prop.key];
                const hasOverride = currentValue !== undefined && currentValue !== prop.defaultValue;
                const displayVal = currentValue !== undefined ? String(currentValue) : (prop.defaultValue !== undefined ? String(prop.defaultValue) : '');
                const isAuth = inheritedAuthKeys.includes(prop.key);
                const isSecret = String(prop.type).toUpperCase() === 'SECRET';
                const isNum = ['NUMBER', 'INTEGER', 'LONG', 'DOUBLE'].includes(String(prop.type).toUpperCase());

                return (
                  <tr
                    key={prop.key}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      backgroundColor: hasOverride ? 'rgba(56, 189, 248, 0.03)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {prop.key}
                        </span>
                        {prop.required && (
                          <Badge variant="danger" style={{ fontSize: '9px', padding: '1px 5px' }}>REQ</Badge>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {prop.label}
                      </div>
                      {prop.description && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-disabled)', marginTop: '2px' }}>
                          {prop.description}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <Badge variant="info">
                        {prop.type}
                      </Badge>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11.5px',
                        color: prop.defaultValue !== undefined && prop.defaultValue !== '' ? 'var(--text-primary)' : 'var(--text-disabled)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-default)'
                      }}>
                        {prop.defaultValue !== undefined && prop.defaultValue !== '' ? String(prop.defaultValue) : '—'}
                      </span>
                    </td>

                    <td style={{ padding: '8px 14px' }}>
                      {prop.type === 'BOOLEAN' ? (
                        <select
                          value={displayVal}
                          onChange={e => onChangeInheritedValue(prop.key, e.target.value === 'true')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            width: '100%',
                            outline: 'none'
                          }}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : prop.options && prop.options.length > 0 ? (
                        <select
                          value={displayVal}
                          onChange={e => onChangeInheritedValue(prop.key, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            width: '100%',
                            outline: 'none'
                          }}
                        >
                          {prop.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : isSecret ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type={inheritedSecretVisibility[prop.key] ? 'text' : 'password'}
                            value={displayVal}
                            onChange={e => onChangeInheritedValue(prop.key, e.target.value)}
                            placeholder={prop.defaultValue !== undefined ? `Default: ${prop.defaultValue}` : 'Override secret...'}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              width: '100%',
                              outline: 'none',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => toggleInheritedSecret(prop.key)}
                            title={inheritedSecretVisibility[prop.key] ? 'Hide secret' : 'Show secret'}
                            style={{
                              height: '32px',
                              width: '32px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {inheritedSecretVisibility[prop.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      ) : (
                        <input
                          type={isNum ? 'number' : 'text'}
                          value={displayVal}
                          onChange={e => {
                            const v = isNum ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                            onChangeInheritedValue(prop.key, v);
                          }}
                          placeholder={prop.defaultValue !== undefined ? `Default: ${prop.defaultValue}` : 'Override value...'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            width: '100%',
                            outline: 'none',
                            fontFamily: isNum ? 'monospace' : 'inherit'
                          }}
                        />
                      )}
                    </td>

                    {/* Auth Toggle (Rendered only for Software resources) */}
                    {isSoftware && (
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onToggleInheritedAuth?.(prop.key)}
                          title={isAuth ? 'Configured for authentication' : 'Click to use for authentication'}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: isAuth ? '1px solid #F59E0B' : '1px solid var(--border-default)',
                            backgroundColor: isAuth ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface)',
                            color: isAuth ? '#F59E0B' : 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Key size={11} />
                          {isAuth ? 'AUTH' : 'Off'}
                        </button>
                      </td>
                    )}

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {hasOverride ? (
                        <Badge variant="info">Overridden</Badge>
                      ) : (
                        <Badge variant="neutral">Default</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Custom Instance Properties */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Custom Instance Properties ({customProperties.length})
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Define resource-specific variables, secrets, credentials, or custom driver parameters.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddCustomProperty}
            leftIcon={<Plus size={14} />}
            style={{ minHeight: '36px' }}
          >
            Add Property
          </Button>
        </div>

        {filteredCustom.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              borderRadius: '6px',
              border: '1px dashed var(--border-default)',
              color: 'var(--text-secondary)',
              fontSize: '12px'
            }}
          >
            {customProperties.length === 0
              ? 'No custom properties defined. Click "+ Add Property" to add custom parameters.'
              : 'No custom properties match your search.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCustom.map(row => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSoftware ? '2fr 1.2fr 3fr 90px 44px 44px' : '2fr 1.2fr 3.5fr 44px 44px',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)'
                }}
              >
                {/* Key */}
                <input
                  type="text"
                  value={row.key}
                  onChange={e => onUpdateCustomProperty(row.id, { key: e.target.value })}
                  placeholder="Property key (e.g. apiKey)"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />

                {/* Type */}
                <select
                  value={row.type}
                  onChange={e => onUpdateCustomProperty(row.id, {
                    type: e.target.value as CustomPropertyRow['type']
                  })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                >
                  <option value="STRING">STRING (Text / Serial / Code)</option>
                  <option value="INTEGER">INTEGER (32-bit Integer / Count)</option>
                  <option value="LONG">LONG (64-bit Tick / Millis)</option>
                  <option value="DOUBLE">DOUBLE (Analog Float / Sensor)</option>
                  <option value="BOOLEAN">BOOLEAN (Flag / Interlock)</option>
                  <option value="DATETIME">DATETIME (ISO-8601 Timestamp)</option>
                  <option value="SECRET">SECRET (Password / Token)</option>
                  <option value="ENUM">ENUM (Constrained Options)</option>
                  <option value="ARRAY">ARRAY (List / Waypoints)</option>
                  <option value="MAP">MAP (JSON Object / Sub-dict)</option>
                  <option value="LOCATION">LOCATION (6-DoF Coordinate)</option>
                </select>

                {/* Value */}
                <input
                  type={row.type === 'SECRET' && !row.isSecretVisible ? 'password' : 'text'}
                  value={row.value}
                  onChange={e => onUpdateCustomProperty(row.id, { value: e.target.value })}
                  placeholder="Value..."
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: row.type === 'SECRET' ? 'monospace' : 'inherit'
                  }}
                />

                {/* Use for Auth Toggle (Rendered only for Software resources) */}
                {isSoftware && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomProperty(row.id, { useForAuth: !row.useForAuth })}
                    title={row.useForAuth ? 'Used in Authentication' : 'Click to use for Authentication'}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: row.useForAuth ? '1px solid #F59E0B' : '1px solid var(--border-default)',
                      backgroundColor: row.useForAuth ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                      color: row.useForAuth ? '#F59E0B' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      height: '34px'
                    }}
                  >
                    <Key size={11} />
                    {row.useForAuth ? 'AUTH' : 'Off'}
                  </button>
                )}

                {/* Secret Toggle */}
                {row.type === 'SECRET' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomProperty(row.id, { isSecretVisible: !row.isSecretVisible })}
                    title={row.isSecretVisible ? 'Hide secret' : 'Show secret'}
                    style={{
                      height: '34px',
                      width: '34px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {row.isSecretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                ) : <div />}

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => onRemoveCustomProperty(row.id)}
                  title="Remove property"
                  style={{
                    height: '34px',
                    width: '34px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    color: '#EF4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          leftIcon={<ArrowLeft size={14} />}
          style={{ minHeight: '44px', padding: '0 20px' }}
        >
          Back to Definition
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          rightIcon={<ArrowRight size={14} />}
          style={{ minHeight: '44px', padding: '0 24px' }}
        >
          Proceed to Method Mapping
        </Button>
      </div>
    </div>
  );
};

