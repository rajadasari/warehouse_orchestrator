import React from 'react';
import { Badge } from '../../../../components/common/Badge';
import { PropertySchemaItem } from '../../../../services/resourceTemplateService';

interface TemplateBasePropertiesTabProps {
  baseProperties: PropertySchemaItem[];
  setBaseProperties: React.Dispatch<React.SetStateAction<PropertySchemaItem[]>>;
}

export const TemplateBasePropertiesTab: React.FC<TemplateBasePropertiesTabProps> = ({
  baseProperties,
  setBaseProperties
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        padding: '12px 14px',
        borderRadius: '6px',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: '#3B82F6' }}>Platform Universal Baseline:</strong> Inherited by all physical & software resources. Governs dispatching, heartbeat health checks, and safety monitoring across all satellite software (WES, WMS, WCS).
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {baseProperties.map((prop, idx) => (
          <div
            key={prop.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {prop.key}
                </span>
                <Badge variant="neutral">{prop.type}</Badge>
                {prop.required && <Badge variant="danger">REQUIRED</Badge>}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {prop.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Default:</label>
              {prop.type === 'ENUM' && prop.options ? (
                <select
                  value={String(prop.defaultValue || '')}
                  onChange={e => {
                    const updated = [...baseProperties];
                    updated[idx].defaultValue = e.target.value;
                    setBaseProperties(updated);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                >
                  {prop.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={String(prop.defaultValue || '')}
                  onChange={e => {
                    const updated = [...baseProperties];
                    updated[idx].defaultValue = e.target.value;
                    setBaseProperties(updated);
                  }}
                  style={{
                    width: '120px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
