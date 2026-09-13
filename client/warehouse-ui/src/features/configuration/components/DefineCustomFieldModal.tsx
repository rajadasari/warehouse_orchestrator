import React, { useState } from 'react';
import { Box, Layers, Cpu, Database, Plus } from 'lucide-react';
import {
  masterDataService,
  CustomAttributeItem,
  CreateCustomAttributePayload
} from '../../../services/masterDataService';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Button } from '../../../components/common/Button';
import { Alert } from '../../../components/common/Alert';

export interface DefineCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: CustomAttributeItem) => void;
}

export const DefineCustomFieldModal: React.FC<DefineCustomFieldModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [targetEntity, setTargetEntity] = useState<'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET'>('ITEM');
  const [attributeCode, setAttributeCode] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState<'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT_ONE' | 'MULTI_SELECT'>('STRING');
  const [unitOfMeasure, setUnitOfMeasure] = useState('');
  const [appliesToCategory, setAppliesToCategory] = useState('ALL');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [allowedOptions, setAllowedOptions] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setAttributeCode('');
    setLabel('');
    setDescription('');
    setDataType('STRING');
    setUnitOfMeasure('');
    setAppliesToCategory('ALL');
    setIsRequired(false);
    setDefaultValue('');
    setAllowedOptions('');
    setMinValue('');
    setMaxValue('');
    setSortOrder(10);
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attributeCode.trim() || !label.trim()) {
      setFormError('Attribute code and display label are required.');
      return;
    }

    const formattedCode = attributeCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateCustomAttributePayload = {
      targetEntity,
      attributeCode: formattedCode,
      label: label.trim(),
      description: description.trim() || undefined,
      dataType,
      unitOfMeasure: unitOfMeasure.trim() || undefined,
      appliesToCategory: appliesToCategory.trim() || 'ALL',
      isRequired,
      defaultValue: defaultValue.trim() || undefined,
      allowedOptions: allowedOptions.trim()
        ? allowedOptions.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      minValue: minValue !== '' ? Number(minValue) : undefined,
      maxValue: maxValue !== '' ? Number(maxValue) : undefined,
      isActive: true,
      sortOrder: Number(sortOrder) || 10
    };

    try {
      const createdItem = await masterDataService.createCustomAttribute(payload);
      onCreated(createdItem);
      handleClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create custom attribute definition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const entityOptions = [
    { id: 'ITEM', label: 'Material (ITEM)', desc: 'Product level attributes', icon: <Box size={13} /> },
    { id: 'SKU', label: 'Packaging (SKU)', desc: 'Pack level attributes', icon: <Layers size={13} /> },
    { id: 'HANDLING_STRATEGY', label: 'Strategy', desc: 'Palletization rules', icon: <Cpu size={13} /> },
    { id: 'PALLET', label: 'Pallet Load', desc: 'Live unit properties', icon: <Database size={13} /> }
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Define Custom Field Attribute"
      subtitle="Maps directly to PostgreSQL table wes.custom_attribute_definition"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {formError && (
          <Alert type="danger">
            {formError}
          </Alert>
        )}

        {/* Target Entity Scope Selector */}
        <div>
          <label className="form-label" style={{ marginBottom: '6px' }}>
            Target Entity Scope *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {entityOptions.map(opt => {
              const isSelected = targetEntity === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setTargetEntity(opt.id)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary-600)' : 'var(--border-default)',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface-subtle)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    fontSize: '11px',
                    color: isSelected ? 'var(--color-primary-600)' : 'var(--text-primary)'
                  }}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attribute Code & UI Label */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Attribute Code (JSON Key)"
            required
            placeholder="e.g. storage_temp_min"
            value={attributeCode}
            onChange={e => setAttributeCode(e.target.value)}
            hint="Auto-formatted to snake_case"
          />

          <Input
            label="UI Display Label"
            required
            placeholder="e.g. Min Storage Temperature"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        {/* Data Type & Unit of Measure */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select
            label="Data Type"
            required
            value={dataType}
            onChange={e => setDataType(e.target.value as any)}
          >
            <option value="STRING">STRING (Text input)</option>
            <option value="NUMBER">NUMBER (Integer or Decimal)</option>
            <option value="BOOLEAN">BOOLEAN (Yes / No Toggle)</option>
            <option value="DATE">DATE (Timestamp / ISO)</option>
            <option value="SELECT_ONE">SELECT_ONE (Single Choice Dropdown)</option>
            <option value="MULTI_SELECT">MULTI_SELECT (Multi Choice)</option>
          </Select>

          <Input
            label="Unit of Measure (UoM)"
            placeholder="e.g. °C, KG, MM, V"
            value={unitOfMeasure}
            onChange={e => setUnitOfMeasure(e.target.value)}
          />
        </div>

        {/* Category Scope & Default Value */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Applies to Category"
            placeholder="e.g. ALL, PERISHABLE, CHEMICAL"
            value={appliesToCategory}
            onChange={e => setAppliesToCategory(e.target.value)}
            hint="Enter 'ALL' or specific product category"
          />

          <Input
            label="Default Value"
            placeholder="Optional default"
            value={defaultValue}
            onChange={e => setDefaultValue(e.target.value)}
          />
        </div>

        {/* Allowed Options (for Select types) */}
        {(dataType === 'SELECT_ONE' || dataType === 'MULTI_SELECT') && (
          <Input
            label="Allowed Options (Comma-separated)"
            required
            placeholder="e.g. OPTION_A, OPTION_B, OPTION_C"
            value={allowedOptions}
            onChange={e => setAllowedOptions(e.target.value)}
            hint="Separate each selectable option with a comma"
          />
        )}

        {/* Min & Max Range (for Number type) */}
        {dataType === 'NUMBER' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Minimum Value"
              type="number"
              placeholder="e.g. -25"
              value={minValue}
              onChange={e => setMinValue(e.target.value)}
            />
            <Input
              label="Maximum Value"
              type="number"
              placeholder="e.g. 50"
              value={maxValue}
              onChange={e => setMaxValue(e.target.value)}
            />
          </div>
        )}

        {/* Description */}
        <Input
          label="Field Description / Guidance"
          placeholder="Operator instructions or validation remarks..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* Rules & Sort Order Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: '6px',
          border: '1px solid var(--border-default)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={e => setIsRequired(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
            />
            <span>Mandatory Field (Required for validation)</span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Display Order:</span>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="form-input"
              style={{ width: '60px', height: '30px', textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Plus size={14} />}
            isLoading={isSubmitting}
          >
            Create Attribute Definition
          </Button>
        </div>
      </form>
    </Modal>
  );
};
