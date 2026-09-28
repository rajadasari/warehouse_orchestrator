import React from 'react';
import { Badge } from '../../../../components/common/Badge';
import { MethodDefinition } from '../../types/resourceEnums';

interface TemplateBaseMethodsTabProps {
  baseMethods: MethodDefinition[];
}

export const TemplateBaseMethodsTab: React.FC<TemplateBaseMethodsTabProps> = ({
  baseMethods
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
        <strong style={{ color: '#3B82F6' }}>Inherited Standard Methods:</strong> Baseline operations inherited by all instances from the master archetype.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {baseMethods.map(m => (
          <div
            key={m.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {m.name}
                </span>
                {m.displayName && m.displayName !== m.name && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ({m.displayName})
                  </span>
                )}
                {m.category && <Badge variant="neutral">{m.category}</Badge>}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {m.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
