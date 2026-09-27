import React from 'react';
import { 
  ArrowRight,
  ExternalLink,
  Info,
  Layers,
  Wrench,
  Check
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { ResourceTemplateItem } from '../../../services/resourceTemplateService';

export interface Step1IdentityProps {
  creationMode: 'TEMPLATE' | 'STANDALONE';
  onChangeCreationMode: (mode: 'TEMPLATE' | 'STANDALONE') => void;
  availableTemplates: ResourceTemplateItem[];
  selectedTemplate: ResourceTemplateItem | null;
  onSelectTemplate: (template: ResourceTemplateItem | null) => void;
  category: string;
  onChangeCategory: (val: string) => void;
  type: string;
  onChangeType: (val: string) => void;
  resourceId: string;
  onChangeResourceId: (val: string) => void;
  name: string;
  onChangeName: (val: string) => void;
  application: string;
  onChangeApplication: (val: string) => void;
  description: string;
  onChangeDescription: (val: string) => void;
  documentationUrl: string;
  onChangeDocumentationUrl: (val: string) => void;
  status: string;
  onChangeStatus: (val: string) => void;
  isEditing: boolean;
  onNext: () => void;
}

export const Step1Identity: React.FC<Step1IdentityProps> = ({
  creationMode,
  onChangeCreationMode,
  availableTemplates,
  selectedTemplate,
  onSelectTemplate,
  category,
  onChangeCategory,
  type,
  onChangeType,
  resourceId,
  onChangeResourceId,
  name,
  onChangeName,
  application,
  onChangeApplication,
  description,
  onChangeDescription,
  documentationUrl,
  onChangeDocumentationUrl,
  status,
  onChangeStatus,
  isEditing,
  onNext
}) => {
  const isValid = Boolean(
    resourceId.trim() && 
    name.trim() && 
    category.trim() && 
    type.trim() &&
    (creationMode === 'STANDALONE' || selectedTemplate !== null || isEditing)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Creation Mode Selector (Template vs Standalone) */}
      {!isEditing && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px'
          }}
        >
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Resource Instantiation Archetype
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {/* Template-Based Option */}
            <div
              onClick={() => onChangeCreationMode('TEMPLATE')}
              style={{
                border: `2px solid ${creationMode === 'TEMPLATE' ? '#38BDF8' : 'var(--border-default)'}`,
                backgroundColor: creationMode === 'TEMPLATE' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface-subtle)',
                borderRadius: '8px',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: creationMode === 'TEMPLATE' ? '#38BDF8' : '#334155',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Layers size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Inherit from Template Blueprint
                  </span>
                  {creationMode === 'TEMPLATE' && <Check size={16} color="#38BDF8" />}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Clones predefined properties, capabilities, and shape mixins from an existing equipment template.
                </p>
              </div>
            </div>

            {/* Standalone Option */}
            <div
              onClick={() => {
                onChangeCreationMode('STANDALONE');
                onSelectTemplate(null);
              }}
              style={{
                border: `2px solid ${creationMode === 'STANDALONE' ? '#38BDF8' : 'var(--border-default)'}`,
                backgroundColor: creationMode === 'STANDALONE' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface-subtle)',
                borderRadius: '8px',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: creationMode === 'STANDALONE' ? '#38BDF8' : '#334155',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Wrench size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Pure Standalone Resource
                  </span>
                  {creationMode === 'STANDALONE' && <Check size={16} color="#38BDF8" />}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  One-of-a-kind physical asset, custom MES cell, legacy machine, or third-party ad-hoc connector.
                </p>
              </div>
            </div>
          </div>

          {/* Template Dropdown Selector if TEMPLATE mode */}
          {creationMode === 'TEMPLATE' && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-default)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Select Equipment Template <span style={{ color: '#EF4444' }}>*</span>
              </label>
              {availableTemplates.length === 0 ? (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px dashed var(--border-default)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  No templates have been registered in the database yet. Select <strong>Standalone Asset</strong> above to define a resource from scratch, or create templates first in Template Management.
                </div>
              ) : (
                <select
                  value={selectedTemplate?.templateCode || ''}
                  onChange={(e) => {
                    const found = availableTemplates.find(t => t.templateCode === e.target.value) || null;
                    onSelectTemplate(found);
                    if (found) {
                      if (!name) onChangeName(found.templateName);
                      if (found.category) onChangeCategory(found.category);
                      if (found.resourceType) onChangeType(found.resourceType);
                      if (found.application) onChangeApplication(found.application);
                      if (found.description && !description) onChangeDescription(found.description);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Choose a Resource Template Blueprint --</option>
                  {availableTemplates.map(t => (
                    <option key={t.templateCode} value={t.templateCode}>
                      {t.templateName} ({t.templateCode}) - [{t.category}]
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resource Definition & System Identity */}
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
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Resource Definition & System Identity
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Declare identity, industrial classification (Physical, Logical, Controller, Software), and domain role.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px'
          }}
        >
          {/* Resource ID */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resource ID <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={resourceId}
              disabled={isEditing}
              onChange={e => onChangeResourceId(e.target.value.toUpperCase())}
              placeholder="e.g. AMR_001, CRANE_02, LINE_CONVEYOR"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resource Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => onChangeName(e.target.value)}
              placeholder="e.g. High-Bay Stacker Crane Alpha"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Generic Multi-Tier Category */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Operational Category <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={category}
              onChange={e => onChangeCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            >
              <option value="PHYSICAL">PHYSICAL (AMR, AGV, Stacker Crane, Sorter, Forklift, Robot)</option>
              <option value="CONTROLLER">CONTROLLER (PLC, IPC, SCADA, Fieldbus Gateway, Remote I/O)</option>
              <option value="LOGICAL">LOGICAL (Warehouse Bin, Aisle, Staging Bay, Dock Door, Workstation)</option>
              <option value="SOFTWARE">SOFTWARE (WMS, MES, ERP, WCS, Fleet Manager Gateway)</option>
              <option value="DEVICE">DEVICE (Handheld Scanner, Dimensioner, Scale, RFID Portal)</option>
              <option value="HARDWARE">HARDWARE (Generic Industrial Equipment)</option>
            </select>
          </div>

          {/* Resource Type */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resource Type / Archetype Class <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={type}
              onChange={e => onChangeType(e.target.value.toUpperCase())}
              placeholder="e.g. AMR, AS_RS_CRANE, WCS, CONVEYOR, BIN"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
          </div>

          {/* Application Tag */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Subsystem Domain (WMS / WES / WCS / MES / Fleet)
            </label>
            <input
              type="text"
              value={application}
              onChange={e => onChangeApplication(e.target.value)}
              placeholder="e.g. Fleet Management, Sorting Loop, Storage High-Bay"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Initial Operational Status
            </label>
            <select
              value={status}
              onChange={e => onChangeStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            >
              <option value="ACTIVE">ACTIVE / AVAILABLE</option>
              <option value="MAINTENANCE">MAINTENANCE / CALIBRATING</option>
              <option value="INACTIVE">INACTIVE / OFFLINE</option>
            </select>
          </div>

          {/* Documentation URL */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Documentation / Spec URL (Linked for AI & Engineers)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={documentationUrl}
                onChange={e => onChangeDocumentationUrl(e.target.value)}
                placeholder="https://wiki.company.internal/specs/crane-asrs.html"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              {documentationUrl && (
                <a
                  href={documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: '#38BDF8',
                    textDecoration: 'none',
                    fontSize: '12px'
                  }}
                >
                  <ExternalLink size={13} />
                  Open Spec
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
            Operational Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => onChangeDescription(e.target.value)}
            placeholder="Operational notes, business role, physical warehouse location..."
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Info Notice about Step 2 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}
      >
        <Info size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
        <span>
          Connection coordinates (Host, Port, Protocol) along with inherited default and custom properties are configured in Step 2.
        </span>
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          disabled={!isValid}
          rightIcon={<ArrowRight size={14} />}
          style={{ minHeight: '44px', padding: '0 24px' }}
        >
          Proceed to Properties
        </Button>
      </div>
    </div>
  );
};
