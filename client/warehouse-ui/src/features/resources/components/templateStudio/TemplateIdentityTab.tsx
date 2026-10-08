import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface CategoryOption {
  key: string;
  label: string;
  desc: string;
}

interface TemplateIdentityTabProps {
  isEditing: boolean;
  isSystemTemplate?: boolean;
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
  responseTokenPropertyName?: string;
  setResponseTokenPropertyName?: (val: string) => void;
  isCodeDuplicate: boolean;
  categories: CategoryOption[];
}

const RESOURCE_TYPE_SUGGESTIONS = [
  'PHYSICAL_ASSET',
  'STORAGE_LOCATION',
  'PROCESS_CELL',
  'DIGITAL_TWIN',
  'SENSOR_DEVICE',
  'CALCULATOR',
  'CYBER_SERVICE',
  'ROBOTIC_CELL'
];

export const TemplateIdentityTab: React.FC<TemplateIdentityTabProps> = ({
  isEditing,
  isSystemTemplate = false,
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
  responseTokenPropertyName = '',
  setResponseTokenPropertyName,
  isCodeDuplicate,
  categories
}) => {
  const isLockedArchetype = isEditing && isSystemTemplate;
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
            placeholder="e.g. ASSET_ZONE_01"
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
              outline: 'none',
              minHeight: '48px',
              boxSizing: 'border-box'
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
            placeholder="e.g. High-Density Buffer Location"
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
              outline: 'none',
              minHeight: '48px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Category Cards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Resource Category (Optional)
          </label>
          {isLockedArchetype && (
            <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 500 }}>
              Category locked on standard system archetypes
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {categories.map(c => {
            const selected = category === c.key;
            return (
              <div
                key={c.key}
                onClick={() => {
                  if (!isLockedArchetype) {
                    setCategory(c.key);
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${selected ? '#3B82F6' : 'var(--border-default)'}`,
                  backgroundColor: selected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
                  cursor: isLockedArchetype ? 'not-allowed' : 'pointer',
                  opacity: isLockedArchetype && !selected ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                  minHeight: '48px',
                  boxSizing: 'border-box'
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
          Resource Type (Role / Archetype) <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          type="text"
          disabled={isLockedArchetype}
          placeholder="e.g. PHYSICAL_ASSET, STORAGE_LOCATION, PROCESS_CELL, SENSOR_DEVICE"
          value={resourceType}
          onChange={e => setResourceType(e.target.value.toUpperCase())}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: isLockedArchetype ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            minHeight: '48px',
            boxSizing: 'border-box',
            cursor: isLockedArchetype ? 'not-allowed' : 'text'
          }}
        />
        {!isLockedArchetype && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {RESOURCE_TYPE_SUGGESTIONS.map(sugg => (
              <span
                key={sugg}
                onClick={() => setResourceType(sugg)}
                style={{
                  fontSize: '10.5px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  minHeight: '28px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                +{sugg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description & Doc URL */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
          Description
        </label>
        <textarea
          rows={2}
          placeholder="Purpose, operational responsibilities, engineering parameters..."
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
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
          Documentation URL / Reference Link
        </label>
        <input
          type="text"
          placeholder="https://docs.plant.internal/assets/specs"
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
            outline: 'none',
            minHeight: '48px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Response Token Property Name (JSON key for software/REST auth) */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
          Response Token Property Name
        </label>
        <input
          type="text"
          list="template-token-field-presets"
          placeholder="e.g. accessToken, access_token, token, jwt"
          value={responseTokenPropertyName || ''}
          onChange={e => setResponseTokenPropertyName?.(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '12.5px',
            fontFamily: 'monospace',
            outline: 'none',
            minHeight: '48px',
            boxSizing: 'border-box'
          }}
        />
        <datalist id="template-token-field-presets">
          <option value="accessToken" />
          <option value="access_token" />
          <option value="token" />
          <option value="jwt" />
          <option value="jwt_token" />
          <option value="data.accessToken" />
        </datalist>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
          JSON key in the authentication response extracted by TokenManager for downstream REST dispatches.
        </span>
      </div>
    </div>
  );
};
