import React, { useState, useEffect } from 'react';
import { X, Check, Tag as TagIcon, Plus, Trash2, Info, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { PropertySchemaItem, IndustrialPropertyType } from '../../../../services/resourceTemplateService';

export interface PropertyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: PropertySchemaItem, isEdit: boolean, originalKey?: string) => void;
  propertyTypes: IndustrialPropertyType[];
  editingProperty: PropertySchemaItem | null;
  existingKeys: string[];
}

// OOPS Identifier regex: must begin with letter or underscore, followed by letters, numbers, or underscores
const OOPS_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const PropertyDrawer: React.FC<PropertyDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  propertyTypes,
  editingProperty,
  existingKeys
}) => {
  const isEdit = Boolean(editingProperty);

  // Information Section
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Configuration Section
  const [dataType, setDataType] = useState<IndustrialPropertyType>('STRING');
  const [defaultValue, setDefaultValue] = useState<string>('');
  const [required, setRequired] = useState(false);
  const [unit, setUnit] = useState('');
  const [logToTelemetry, setLogToTelemetry] = useState(false);

  // Enum Options (if ENUM type)
  const [enumOptions, setEnumOptions] = useState<string[]>([]);
  const [newEnumOption, setNewEnumOption] = useState('');

  // Validation Errors
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingProperty) {
        setName(editingProperty.key || '');
        setPurpose(editingProperty.description || '');
        setTags(editingProperty.tags ? [...editingProperty.tags] : []);
        setDataType((editingProperty.type as IndustrialPropertyType) || 'STRING');
        setDefaultValue(editingProperty.defaultValue !== undefined && editingProperty.defaultValue !== null ? String(editingProperty.defaultValue) : '');
        setRequired(Boolean(editingProperty.required));
        setUnit(editingProperty.unit || '');
        setLogToTelemetry(Boolean(editingProperty.logToTelemetry));
        setEnumOptions(editingProperty.options ? [...editingProperty.options] : []);
      } else {
        setName('');
        setPurpose('');
        setTags([]);
        setDataType('STRING');
        setDefaultValue('');
        setRequired(false);
        setUnit('');
        setLogToTelemetry(false);
        setEnumOptions(['OPTION_A', 'OPTION_B']);
      }
      setTagInput('');
      setNewEnumOption('');
      setNameError(null);
    }
  }, [isOpen, editingProperty]);

  if (!isOpen) return null;

  // Name validation following strict OOPS rules & uniqueness
  const validateName = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setNameError('Property name is required.');
      return false;
    }
    if (!OOPS_IDENTIFIER_REGEX.test(trimmed)) {
      setNameError('Must follow OOP naming standards (alphanumeric & underscores only, starting with a letter or underscore, no spaces).');
      return false;
    }
    const isDuplicate = existingKeys.some(
      k => k.toLowerCase() === trimmed.toLowerCase() && (!isEdit || k.toLowerCase() !== editingProperty?.key.toLowerCase())
    );
    if (isDuplicate) {
      setNameError(`A property with name "${trimmed}" already exists at template/resource scope.`);
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) validateName(val);
  };

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddEnum = () => {
    const clean = newEnumOption.trim().toUpperCase().replace(/\s+/g, '_');
    if (!clean) return;
    if (!enumOptions.includes(clean)) {
      const updated = [...enumOptions, clean];
      setEnumOptions(updated);
      if (!defaultValue) setDefaultValue(clean);
    }
    setNewEnumOption('');
  };

  const handleRemoveEnum = (opt: string) => {
    const updated = enumOptions.filter(o => o !== opt);
    setEnumOptions(updated);
    if (defaultValue === opt) {
      setDefaultValue(updated[0] || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) return;

    let parsedDefault: unknown = defaultValue;
    if (defaultValue === '') {
      parsedDefault = undefined;
    } else if (dataType === 'INTEGER' || dataType === 'LONG') {
      parsedDefault = parseInt(defaultValue, 10);
    } else if (dataType === 'DOUBLE') {
      parsedDefault = parseFloat(defaultValue);
    } else if (dataType === 'BOOLEAN') {
      parsedDefault = defaultValue === 'true';
    }

    const updatedProp: PropertySchemaItem = {
      key: name.trim(),
      label: name.trim(),
      type: dataType,
      required,
      defaultValue: parsedDefault,
      unit: unit.trim() || undefined,
      description: purpose.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      logToTelemetry,
      options: dataType === 'ENUM' ? enumOptions : undefined,
      isBaseProperty: editingProperty?.isBaseProperty
    };

    onSave(updatedProp, isEdit, editingProperty?.key);
  };

  return (
    <div
      style={{
        width: '480px',
        minWidth: '420px',
        maxWidth: '520px',
        height: '100%',
        backgroundColor: 'var(--bg-surface, #1e293b)',
        border: '1px solid var(--border-default, #334155)',
        borderRadius: '8px',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        flexShrink: 0,
        animation: 'slideInRight 0.25s ease-out'
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-default, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-subtle, #0f172a)',
          flexShrink: 0
        }}
      >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
              {isEdit ? `Edit Property: ${editingProperty?.key}` : 'Add New Property'}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
              Configure property specifications, data contracts, and telemetry logging
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              minWidth: '48px',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            title="Close Drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body with Vertical Scrolling */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* SECTION 1: INFORMATION */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle, #0f172a)',
              border: '1px solid var(--border-default, #334155)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-default, #334155)', paddingBottom: '8px' }}>
              <Info size={15} color="#38bdf8" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                Information Section
              </h4>
            </div>

            {/* Name / Key */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                Property Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. conveyorSpeed, maxPayloadKg"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: nameError ? '1px solid #ef4444' : '1px solid var(--border-default, #334155)',
                  backgroundColor: 'var(--bg-surface, #1e293b)',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                Must follow OOP naming standards (alphanumeric and underscores, unique at template/resource scope).
              </div>
              {nameError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#ef4444', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{nameError}</span>
                </div>
              )}
            </div>

            {/* Purpose / Description */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                Purpose / Description
              </label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                rows={2}
                placeholder="Describe why this property exists and its role in orchestration..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default, #334155)',
                  backgroundColor: 'var(--bg-surface, #1e293b)',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Tags */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                Tags (Additional Context / Categorization)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="e.g. kinematic, calibration, plc_read"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default, #334155)',
                    backgroundColor: 'var(--bg-surface, #1e293b)',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  leftIcon={<Plus size={13} />}
                >
                  Add Tag
                </Button>
              </div>

              {tags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {tags.map(t => (
                    <span
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8'
                      }}
                    >
                      <TagIcon size={10} />
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                  No tags added yet. Type and press Add or Enter.
                </span>
              )}
            </div>
          </div>

          {/* SECTION 2: CONFIGURATION */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle, #0f172a)',
              border: '1px solid var(--border-default, #334155)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-default, #334155)', paddingBottom: '8px' }}>
              <Settings size={15} color="#10B981" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                Configuration Section
              </h4>
            </div>

            {/* Data Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                Data Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={dataType}
                onChange={e => setDataType(e.target.value as IndustrialPropertyType)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default, #334155)',
                  backgroundColor: 'var(--bg-surface, #1e293b)',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              >
                {propertyTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                Engineering Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="e.g. m/s, kg, mm, V, bar, RPM"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default, #334155)',
                  backgroundColor: 'var(--bg-surface, #1e293b)',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Default Value */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                Default Value
              </label>
              {dataType === 'ENUM' ? (
                <select
                  value={defaultValue}
                  onChange={e => setDefaultValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #334155)',
                    backgroundColor: 'var(--bg-surface, #1e293b)',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Select Default Option --</option>
                  {enumOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : dataType === 'BOOLEAN' ? (
                <select
                  value={defaultValue}
                  onChange={e => setDefaultValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #334155)',
                    backgroundColor: 'var(--bg-surface, #1e293b)',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Unset / None --</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  type={dataType === 'INTEGER' || dataType === 'LONG' || dataType === 'DOUBLE' ? 'number' : dataType === 'SECRET' ? 'password' : 'text'}
                  step={dataType === 'DOUBLE' ? 'any' : '1'}
                  value={defaultValue}
                  onChange={e => setDefaultValue(e.target.value)}
                  placeholder="Fallback default value"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #334155)',
                    backgroundColor: 'var(--bg-surface, #1e293b)',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: ['INTEGER', 'LONG', 'DOUBLE', 'DATETIME'].includes(dataType) ? 'monospace' : 'inherit'
                  }}
                />
              )}
            </div>

            {/* Enum Options Editor (when dataType is ENUM) */}
            {dataType === 'ENUM' && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default, #334155)' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', display: 'block', marginBottom: '6px' }}>
                  Enum Allowed Values ({enumOptions.length})
                </span>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={newEnumOption}
                    onChange={e => setNewEnumOption(e.target.value)}
                    placeholder="e.g. FORWARD, REVERSE"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEnum();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default, #334155)',
                      backgroundColor: 'var(--bg-surface, #1e293b)',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddEnum} disabled={!newEnumOption.trim()}>
                    Add Enum
                  </Button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {enumOptions.map(opt => (
                    <span
                      key={opt}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: 'var(--bg-surface, #1e293b)',
                        border: '1px solid var(--border-default, #334155)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-primary, #f8fafc)'
                      }}
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveEnum(opt)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checkbox Options: Required & Log to Telemetry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-primary, #f8fafc)' }}>
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                />
                <span><strong>Required property</strong> (must be instantiated by child resources)</span>
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-primary, #f8fafc)' }}>
                <input
                  type="checkbox"
                  checked={logToTelemetry}
                  onChange={e => setLogToTelemetry(e.target.checked)}
                />
                <span><strong>Log to Telemetry</strong> (dispatch state changes to TimescaleDB historian)</span>
              </label>
            </div>
          </div>

          {/* SECTION 3: VALIDATION SECTION (Placeholder for future rules) */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle, #0f172a)',
              border: '1px dashed var(--border-default, #334155)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={15} color="#94a3b8" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                Validation Section
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-disabled, #64748b)' }}>
              Range thresholds, regex filters, and custom assertions will be added in upcoming release.
            </p>
          </div>
        </form>

        {/* Drawer Footer with Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-default, #334155)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--bg-surface-subtle, #0f172a)'
          }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            style={{ minHeight: '44px' }}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            leftIcon={<Check size={14} />}
            style={{ minHeight: '44px', minWidth: '120px' }}
          >
            {isEdit ? 'Save Changes' : 'Add Property'}
          </Button>
        </div>
      </div>
  );
};
