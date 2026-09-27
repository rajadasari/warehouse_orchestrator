import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface CategoryOption {
  key: string;
  label: string;
  desc: string;
}

interface TemplateIdentityTabProps {
  isEditing: boolean;
  templateCode: string;
  setTemplateCode: (val: string) => void;
  templateName: string;
  setTemplateName: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  resourceType: string;
  setResourceType: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  documentationUrl: string;
  setDocumentationUrl: (val: string) => void;
  isCodeDuplicate: boolean;
  categories: CategoryOption[];
}

export const TemplateIdentityTab: React.FC<TemplateIdentityTabProps> = ({
  isEditing,
  templateCode,
  setTemplateCode,
  templateName,
  setTemplateName,
  category,
  setCategory,
  resourceType,
  setResourceType,
  description,
  setDescription,
  documentationUrl,
  setDocumentationUrl,
  isCodeDuplicate,
  categories
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
            Template Code <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            disabled={isEditing}
            placeholder="e.g. SIEMENS_S7_1500"
            value={templateCode}
            onChange={e => setTemplateCode(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: `1px solid ${isCodeDuplicate ? '#EF4444' : 'var(--border-default)'}`,
              backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
          {isCodeDuplicate && (
            <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px', display: 'block' }}>
              Template code already exists in database
            </span>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
            Template Name <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Siemens S7-1500 Zone Conveyor"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Category Cards */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Industrial Asset Category <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {categories.map(c => {
            const selected = category === c.key;
            return (
              <div
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${selected ? '#3B82F6' : 'var(--border-default)'}`,
                  backgroundColor: selected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '48px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: selected ? '#3B82F6' : 'var(--text-primary)' }}>
                    {c.label}
                  </span>
                  {selected && <CheckCircle2 size={14} color="#3B82F6" />}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {c.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Type */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
          Resource Type <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. CONVEYOR, AGV, PLC, SCANNER, CALCULATOR, ALGORITHM, REST_SERVICE"
          value={resourceType}
          onChange={e => setResourceType(e.target.value.toUpperCase())}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          {['CONVEYOR', 'AGV', 'PLC', 'ROBOT', 'SCANNER', 'CALCULATOR', 'ALGORITHM', 'SERVICE'].map(sugg => (
            <span
              key={sugg}
              onClick={() => setResourceType(sugg)}
              style={{
                fontSize: '10.5px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              +{sugg}
            </span>
          ))}
        </div>
      </div>

      {/* Description & Doc URL */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
          Description
        </label>
        <textarea
          rows={2}
          placeholder="Engineering purpose, hardware specs, wiring or protocol notes..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '12.5px',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
          Documentation URL / Schematics Link
        </label>
        <input
          type="text"
          placeholder="https://docs.plant.internal/schematics/s7-1500"
          value={documentationUrl}
          onChange={e => setDocumentationUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '12.5px',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
};
