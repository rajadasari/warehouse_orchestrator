import React from 'react';
import { FileCode, Info } from 'lucide-react';
import { ResourceTemplateItem, PropertySchemaItem } from '../../../services/resourceTemplateService';
import { Badge } from '../../../components/common/Badge';

export interface TemplatePropertiesFormSectionProps {
  templates: ResourceTemplateItem[];
  selectedTemplateCode: string;
  onSelectTemplateCode: (code: string) => void;
  templateProperties: Record<string, unknown>;
  onPropertyChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

export const TemplatePropertiesFormSection: React.FC<TemplatePropertiesFormSectionProps> = ({
  templates,
  selectedTemplateCode,
  onSelectTemplateCode,
  templateProperties,
  onPropertyChange,
  disabled = false
}) => {
  const currentTemplate = templates.find(t => t.templateCode === selectedTemplateCode);

  return (
    <div style={{
      padding: '14px',
      borderRadius: '10px',
      border: '1px solid var(--border-default)',
      backgroundColor: 'var(--bg-surface-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-primary-600, #2563EB)' }}>
          <FileCode size={15} />
          <span>Archetype Template & Schema</span>
        </div>
        {currentTemplate && (
          <Badge variant="info">
            {currentTemplate.communicationProtocol}
          </Badge>
        )}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
          Inherited Archetype Template
        </label>
        <select
          value={selectedTemplateCode}
          disabled={disabled}
          onChange={(e) => onSelectTemplateCode(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-page)',
            color: 'var(--text-primary)',
            fontSize: '12.5px'
          }}
        >
          <option value="">-- No Template (Standalone Custom Resource) --</option>
          {templates.map(tpl => (
            <option key={tpl.templateCode} value={tpl.templateCode}>
              {tpl.templateName} ({tpl.templateCode}) [{tpl.category}]
            </option>
          ))}
        </select>
      </div>

      {currentTemplate && currentTemplate.propertySchema && currentTemplate.propertySchema.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <Info size={14} />
            <span>Configured attributes for {currentTemplate.templateName}:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {currentTemplate.propertySchema
              .filter((field: PropertySchemaItem) => {
                // Conditional filtering based on authType
                const authType = String(templateProperties['authType'] || 'ANONYMOUS').toUpperCase();
                if (['username', 'password'].includes(field.key) && authType !== 'USERNAME_PASSWORD') {
                  return false;
                }
                if (['keyStorePath', 'keyStorePassword'].includes(field.key) && authType !== 'X509_CERTIFICATE') {
                  return false;
                }
                return true;
              })
              .map((field: PropertySchemaItem) => {
                const currentVal = templateProperties[field.key];
                const displayVal = currentVal !== undefined ? currentVal : (field.defaultValue !== undefined ? field.defaultValue : '');
                const isNumeric = ['NUMBER', 'INTEGER', 'LONG', 'DOUBLE'].includes(String(field.type).toUpperCase());
                const isSecret = String(field.type).toUpperCase() === 'SECRET';

                return (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{field.label || field.key}</span>
                      {field.required && <span style={{ color: 'var(--color-danger, #EF4444)' }}>*</span>}
                      {field.unit && <span className="text-muted" style={{ fontWeight: 400 }}>({field.unit})</span>}
                    </label>

                    {field.description && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', lineHeight: '1.2' }}>
                        {field.description}
                      </span>
                    )}

                    {field.type === 'BOOLEAN' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', minHeight: '32px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(displayVal)}
                          onChange={(e) => onPropertyChange(field.key, e.target.checked)}
                        />
                        <span>Enabled</span>
                      </label>
                    ) : field.type === 'ENUM' && field.options ? (
                      <select
                        value={String(displayVal)}
                        onChange={(e) => onPropertyChange(field.key, e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      >
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : isNumeric ? (
                      <input
                        type="number"
                        value={displayVal !== undefined ? String(displayVal) : ''}
                        onChange={(e) => onPropertyChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                    ) : isSecret ? (
                      <input
                        type="password"
                        value={displayVal !== undefined ? String(displayVal) : ''}
                        onChange={(e) => onPropertyChange(field.key, e.target.value)}
                        placeholder="••••••••"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={displayVal !== undefined ? String(displayVal) : ''}
                        onChange={(e) => onPropertyChange(field.key, e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
