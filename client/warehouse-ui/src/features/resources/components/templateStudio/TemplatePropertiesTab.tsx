import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Sliders, 
  Search, 
  Tag as TagIcon, 
  Check, 
  X, 
  ListPlus, 
  Radio, 
  Edit2
} from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import { PropertySchemaItem, IndustrialPropertyType } from '../../../../services/resourceTemplateService';
import { PropertyDrawer } from './PropertyDrawer';

interface TemplatePropertiesTabProps {
  properties: PropertySchemaItem[];
  handleAddProperty: (newProp?: PropertySchemaItem) => void;
  handleUpdateProperty: (index: number, patch: Partial<PropertySchemaItem>) => void;
  handleRemoveProperty: (index: number) => void;
  propertyTypes: IndustrialPropertyType[];
}

export const TemplatePropertiesTab: React.FC<TemplatePropertiesTabProps> = ({
  properties,
  handleAddProperty,
  handleUpdateProperty,
  handleRemoveProperty,
  propertyTypes
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Right Slider Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{ index: number; prop: PropertySchemaItem } | null>(null);

  // Enum Options Modal (Quick Editor)
  const [enumModalPropIndex, setEnumModalPropIndex] = useState<number | null>(null);
  const [newEnumOption, setNewEnumOption] = useState('');

  // Collect all property keys for uniqueness validation
  const allExistingKeys = properties.map(p => p.key);

  // Filtering
  const filteredProperties = properties.filter(p =>
    !searchQuery.trim() ||
    p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Drawer Open Handlers
  const handleOpenAddDrawer = () => {
    setEditingTarget(null);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (index: number, prop: PropertySchemaItem) => {
    setEditingTarget({ index, prop });
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingTarget(null);
  };

  const handleSaveDrawerProperty = (savedProp: PropertySchemaItem, isEdit: boolean) => {
    if (isEdit && editingTarget) {
      handleUpdateProperty(editingTarget.index, savedProp);
    } else {
      handleAddProperty(savedProp);
    }
    setDrawerOpen(false);
    setEditingTarget(null);
  };

  // Toggle Log to Telemetry
  const handleToggleTelemetry = (index: number) => {
    const current = properties[index];
    handleUpdateProperty(index, { logToTelemetry: !current.logToTelemetry });
  };

  // Quick Enum Editor Handlers
  const handleOpenEnumEditor = (index: number) => {
    setEnumModalPropIndex(index);
    setNewEnumOption('');
  };

  const handleCloseEnumEditor = () => {
    setEnumModalPropIndex(null);
    setNewEnumOption('');
  };

  const handleAddEnumOption = () => {
    if (enumModalPropIndex === null || !newEnumOption.trim()) return;
    const cleanOption = newEnumOption.trim().toUpperCase().replace(/\s+/g, '_');
    const target = properties[enumModalPropIndex];
    const options = target.options ? [...target.options] : [];
    if (!options.includes(cleanOption)) {
      options.push(cleanOption);
      handleUpdateProperty(enumModalPropIndex, {
        options,
        defaultValue: target.defaultValue || cleanOption
      });
    }
    setNewEnumOption('');
  };

  const handleRemoveEnumOption = (optionToRemove: string) => {
    if (enumModalPropIndex === null) return;
    const target = properties[enumModalPropIndex];
    const options = (target.options || []).filter(o => o !== optionToRemove);
    handleUpdateProperty(enumModalPropIndex, {
      options,
      defaultValue: target.defaultValue === optionToRemove ? (options[0] || '') : target.defaultValue
    });
  };

  const activeEnumProp = enumModalPropIndex !== null ? properties[enumModalPropIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
      {/* 1. Header Toolbar with Search & Action */}
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
          gap: '12px',
          flexShrink: 0
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
            placeholder="Search properties, tags, types..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge variant="info">
            <Sliders size={12} style={{ marginRight: '4px' }} />
            {properties.length} Defined {properties.length === 1 ? 'Property' : 'Properties'}
          </Badge>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={handleOpenAddDrawer}
            style={{ minHeight: '38px', minWidth: '48px' }}
          >
            Add Property
          </Button>
        </div>
      </div>

      {/* 2. Main Content Split Area: Properties Table (Pushed) & In-Layout Sliding Drawer */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left Column: Unified Properties Table with independent vertical scroll */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          paddingRight: drawerOpen ? '4px' : '0px',
          transition: 'all 0.25s ease-in-out'
        }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0
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
                <Sliders size={16} color="#3B82F6" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Properties Matrix ({properties.length})
                </h4>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Template configuration attributes, endpoints, and variables
              </span>
            </div>

            {properties.length === 0 ? (
              <div style={{
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '12.5px'
              }}>
                <Sliders size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No properties defined for this template yet
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '11.5px' }}>
                  Click below to open the right slider view and define properties, endpoints, or data tags.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={handleOpenAddDrawer}
                  style={{ minHeight: '44px' }}
                >
                  Add First Property
                </Button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '22%' }}>
                      Property Name *
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '12%' }}>
                      Data Type
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '14%' }}>
                      Current Value
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '16%' }}>
                      Default Value
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '18%' }}>
                      Tags
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '18%' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((prop, idx) => (
                    <tr
                      key={prop.key || idx}
                      style={{ borderBottom: '1px solid var(--border-default)' }}
                    >
                      {/* Property Name */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {prop.key}
                        </div>
                      </td>

                      {/* Data Type */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge variant="info">{prop.type}</Badge>
                          {prop.required && <Badge variant="danger" style={{ fontSize: '10px' }}>REQ</Badge>}
                        </div>
                      </td>

                      {/* Current Value (Live Display View) */}
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

                      {/* Default Value */}
                      <td style={{ padding: '10px 14px' }}>
                        {prop.type === 'ENUM' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {String(prop.defaultValue || '—')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEnumEditor(idx)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface)',
                                color: '#10B981',
                                fontSize: '10.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title="Configure Enum Values"
                            >
                              <ListPlus size={11} />
                              <span>({(prop.options || []).length})</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {prop.defaultValue !== undefined && prop.defaultValue !== '' ? String(prop.defaultValue) : '—'}
                            {prop.unit ? ` ${prop.unit}` : ''}
                          </span>
                        )}
                      </td>

                      {/* Tags */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(prop.tags || []).map(t => (
                            <span
                              key={t}
                              style={{
                                fontSize: '10.5px',
                                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38BDF8',
                                padding: '1px 6px',
                                borderRadius: '10px'
                              }}
                            >
                              {t}
                            </span>
                          ))}
                          {(!prop.tags || prop.tags.length === 0) && (
                            <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions: Edit in Drawer, Log to Telemetry, Delete */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {/* Log to Telemetry button */}
                          <button
                            type="button"
                            onClick={() => handleToggleTelemetry(idx)}
                            title={prop.logToTelemetry ? 'Logging to Telemetry (Active)' : 'Click to Log to Telemetry'}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: prop.logToTelemetry ? '1px solid #10B981' : '1px solid var(--border-default)',
                              backgroundColor: prop.logToTelemetry ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-subtle)',
                              color: prop.logToTelemetry ? '#10B981' : 'var(--text-secondary)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              minHeight: '48px',
                              minWidth: '48px',
                              justifyContent: 'center'
                            }}
                          >
                            <Radio size={13} />
                            <span style={{ fontSize: '10.5px', fontWeight: 600 }}>
                              {prop.logToTelemetry ? 'HISTORIAN' : 'LOG'}
                            </span>
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditDrawer(idx, prop)}
                            title="Edit property in right slider"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-default)',
                              color: '#38bdf8',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px',
                              minWidth: '48px',
                              minHeight: '48px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveProperty(idx)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px',
                              minWidth: '48px',
                              minHeight: '48px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete property"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: In-Layout Sliding Drawer (Pushes table side-by-side) */}
        {drawerOpen && (
          <PropertyDrawer
            isOpen={drawerOpen}
            onClose={handleCloseDrawer}
            onSave={handleSaveDrawerProperty}
            propertyTypes={propertyTypes}
            editingProperty={editingTarget ? editingTarget.prop : null}
            existingKeys={allExistingKeys}
          />
        )}
      </div>

      {/* Quick Enum Definitions Dialog */}
      {enumModalPropIndex !== null && activeEnumProp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TagIcon size={16} color="#38BDF8" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Define ENUM Values: <span style={{ fontFamily: 'monospace' }}>{activeEnumProp.key}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseEnumEditor}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Add allowed status tags or categorical constants for this property.
              </div>

              {/* Add New Option Form */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="NEW_ENUM_VALUE (e.g. FORWARD, REVERSE)"
                  value={newEnumOption}
                  onChange={e => setNewEnumOption(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEnumOption();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddEnumOption}
                  disabled={!newEnumOption.trim()}
                  leftIcon={<Plus size={13} />}
                >
                  Add
                </Button>
              </div>

              {/* Current Options List */}
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}
              >
                {(activeEnumProp.options || []).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    No enum values defined. Add one above.
                  </div>
                ) : (
                  (activeEnumProp.options || []).map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        borderBottom: i < (activeEnumProp.options?.length || 0) - 1 ? '1px solid var(--border-default)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '20px' }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          {opt}
                        </span>
                        {activeEnumProp.defaultValue === opt && (
                          <Badge variant="info" style={{ fontSize: '10px' }}>DEFAULT</Badge>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveEnumOption(opt)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title={`Remove ${opt}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: 'var(--bg-surface-subtle)'
              }}
            >
              <Button
                variant="primary"
                size="sm"
                onClick={handleCloseEnumEditor}
                leftIcon={<Check size={14} />}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
