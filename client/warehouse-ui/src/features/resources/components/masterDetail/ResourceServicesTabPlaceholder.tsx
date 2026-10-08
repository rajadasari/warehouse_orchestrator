import React from 'react';
import { Cog } from 'lucide-react';
import { ResourceItem } from '../../../../services/resourceService';

export interface ResourceServicesTabPlaceholderProps {
  resource: ResourceItem | null;
}

export const ResourceServicesTabPlaceholder: React.FC<ResourceServicesTabPlaceholderProps> = ({
  resource
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      minHeight: '360px',
      padding: '32px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <Cog size={28} color="var(--text-secondary)" />
      </div>

      <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Services & Operational Dispatch
      </h3>

      <p style={{
        margin: 0,
        fontSize: '12px',
        color: 'var(--text-secondary)',
        maxWidth: '440px',
        lineHeight: 1.5
      }}>
        Services for resource <strong style={{ color: 'var(--text-primary)' }}>{resource?.name || resource?.resourceId}</strong> are not yet configured. Service configuration will be added here.
      </p>
    </div>
  );
};
