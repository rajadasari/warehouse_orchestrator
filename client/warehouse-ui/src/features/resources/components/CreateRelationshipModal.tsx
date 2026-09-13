import React, { useState, useMemo } from 'react';
import { GitCommit, Plus, Trash2, ArrowRight } from 'lucide-react';
import { ResourceItem } from '../../../services/resourceService';
import { 
  resourceRelationshipService, 
  RelationCategory, 
  RelationType 
} from '../../../services/resourceRelationshipService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { Input } from '../../../components/common/Input';
import { Alert } from '../../../components/common/Alert';

export interface CreateRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: ResourceItem[];
  onSuccess: (msg: string) => void;
  onRefresh: () => Promise<void>;
}

export const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({
  isOpen,
  onClose,
  resources,
  onSuccess,
  onRefresh
}) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [category, setCategory] = useState<RelationCategory>('MATERIAL_FLOW');
  const [relType, setRelType] = useState<RelationType>('TRANSFERS_TO');
  const [propRows, setPropRows] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available relation types depending on category
  const relationTypeOptions = useMemo(() => {
    if (category === 'MATERIAL_FLOW') {
      return [
        { value: 'TRANSFERS_TO', label: 'TRANSFERS_TO (Physical material handoff)' }
      ];
    }
    return [
      { value: 'DATA_SOURCE_FOR', label: 'DATA_SOURCE_FOR (Sensor / Scanner feed)' },
      { value: 'CONTROLS', label: 'CONTROLS (Master supervisory link)' },
      { value: 'ATTACHED_TO', label: 'ATTACHED_TO (Physical mounting / station)' },
      { value: 'SERVICED_BY', label: 'SERVICED_BY (Maintenance / agent dependency)' }
    ];
  }, [category]);

  // Handle category toggle and sync relation type
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as RelationCategory;
    setCategory(newCat);
    if (newCat === 'MATERIAL_FLOW') {
      setRelType('TRANSFERS_TO');
    } else {
      setRelType('DATA_SOURCE_FOR');
    }
  };

  const handleAddPropRow = () => {
    setPropRows(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemovePropRow = (idx: number) => {
    setPropRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePropChange = (idx: number, field: 'key' | 'value', val: string) => {
    setPropRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId) {
      setErrorMessage('Please select a source resource');
      return;
    }
    if (!targetId) {
      setErrorMessage('Please select a target resource');
      return;
    }
    if (sourceId === targetId) {
      setErrorMessage('Source and target resources must be different');
      return;
    }

    const properties: Record<string, unknown> = {};
    propRows.forEach(r => {
      if (r.key.trim()) {
        const trimmedVal = r.value.trim();
        const numVal = Number(trimmedVal);
        if (!isNaN(numVal) && trimmedVal !== '') {
          properties[r.key.trim()] = numVal;
        } else if (trimmedVal.toLowerCase() === 'true') {
          properties[r.key.trim()] = true;
        } else if (trimmedVal.toLowerCase() === 'false') {
          properties[r.key.trim()] = false;
        } else {
          properties[r.key.trim()] = trimmedVal;
        }
      }
    });

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await resourceRelationshipService.createRelationship({
        sourceResourceId: sourceId,
        targetResourceId: targetId,
        relationCategory: category,
        relationType: relType,
        properties,
        active: true
      });
      onSuccess(`Created relationship: ${sourceId} --[${relType}]--> ${targetId}`);
      await onRefresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to establish relationship';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resourceOptions = useMemo(() => {
    return resources.map(r => ({
      value: r.resourceId,
      label: `${r.resourceId} (${r.name}) - [${r.type}]`
    }));
  }, [resources]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitCommit size={20} className="text-primary" />
          <span>Establish Resource Topology Link</span>
        </div>
      }
      subtitle="Define material flow routes or information data source links between equipment"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMessage && (
          <Alert variant="danger" title="Validation Error">
            {errorMessage}
          </Alert>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Select
            label="Category"
            value={category}
            onChange={handleCategoryChange}
            required
            options={[
              { value: 'MATERIAL_FLOW', label: 'Material Flow (Physical Conveyance / Routing)' },
              { value: 'INFORMATION_FLOW', label: 'Information Flow (Sensors / Telemetry / Controls)' }
            ]}
          />

          <Select
            label="Relation Type"
            value={relType}
            onChange={(e) => setRelType(e.target.value as RelationType)}
            required
            options={relationTypeOptions}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
          <Select
            label="Source Resource"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="-- Select Source --"
            required
            options={resourceOptions}
          />

          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '24px' }}>
            <ArrowRight size={24} className="text-muted" />
          </div>

          <Select
            label="Target Resource"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="-- Select Target --"
            required
            options={resourceOptions.filter(o => o.value !== sourceId)}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Link Attributes & Telemetry Config (Optional)
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleAddPropRow}
            >
              Add Property
            </Button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {propRows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Input
                  placeholder="Property key (e.g. transitTimeSeconds)"
                  value={row.key}
                  onChange={(e) => handlePropChange(idx, 'key', e.target.value)}
                  containerClassName="flex-1"
                />
                <Input
                  placeholder="Value (e.g. 15)"
                  value={row.value}
                  onChange={(e) => handlePropChange(idx, 'value', e.target.value)}
                  containerClassName="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove property"
                  onClick={() => handleRemovePropRow(idx)}
                  disabled={propRows.length <= 1 && !row.key && !row.value}
                >
                  <Trash2 size={16} className="text-danger" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={<GitCommit size={16} />}
          >
            Save Relationship
          </Button>
        </div>
      </form>
    </Modal>
  );
};
