import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { PropertySchemaItem, IndustrialPropertyType } from '../../../../services/resourceTemplateService';

interface TemplateCustomPropertiesTabProps {
  customProperties: PropertySchemaItem[];
  handleAddCustomProperty: () => void;
  handleUpdateCustomProperty: (index: number, patch: Partial<PropertySchemaItem>) => void;
  handleRemoveCustomProperty: (index: number) => void;
  propertyTypes: IndustrialPropertyType[];
}

export const TemplateCustomPropertiesTab: React.FC<TemplateCustomPropertiesTabProps> = ({
  customProperties,
  handleAddCustomProperty,
  handleUpdateCustomProperty,
  handleRemoveCustomProperty,
  propertyTypes
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Define machine-specific variables (PLC DB offsets, max velocity, rack levels, motor speeds).
        </span>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={handleAddCustomProperty}
        >
          Add Property
        </Button>
      </div>

      {customProperties.length === 0 ? (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: '8px',
          border: '1px dashed var(--border-default)',
          color: 'var(--text-secondary)',
          fontSize: '12.5px'
        }}>
          No custom properties defined yet. Click "Add Property" above to define hardware tags or configuration parameters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {customProperties.map((prop, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Property Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. speed_m_s"
                    value={prop.key}
                    onChange={e => handleUpdateCustomProperty(idx, { key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Display Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Conveyor Belt Speed"
                    value={prop.label}
                    onChange={e => handleUpdateCustomProperty(idx, { label: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Industrial Type
                  </label>
                  <select
                    value={prop.type}
                    onChange={e => handleUpdateCustomProperty(idx, { type: e.target.value as IndustrialPropertyType })}
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
                    {propertyTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="m/s, kg, V"
                    value={prop.unit || ''}
                    onChange={e => handleUpdateCustomProperty(idx, { unit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleRemoveCustomProperty(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '6px',
                      minWidth: '40px',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete property"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                <div>
                  <input
                    type="text"
                    placeholder="Description or engineering notes..."
                    value={prop.description || ''}
                    onChange={e => handleUpdateCustomProperty(idx, { description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px'
                    }}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Default value"
                    value={String(prop.defaultValue ?? '')}
                    onChange={e => handleUpdateCustomProperty(idx, { defaultValue: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px'
                    }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(prop.required)}
                    onChange={e => handleUpdateCustomProperty(idx, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
