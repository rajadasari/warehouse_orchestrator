import React from 'react';
import { Server, Globe, Calendar, Clock } from 'lucide-react';
import { ResourceItem } from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { JsonViewer } from '../../../components/common/JsonViewer';

export interface ResourceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
}

export const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({
  isOpen,
  onClose,
  resource
}) => {
  if (!resource) return null;

  const getTypeVariant = (type: string): 'info' | 'success' | 'warning' | 'neutral' => {
    const t = type.toUpperCase();
    if (t === 'SOFTWARE' || t === 'WMS') return 'info';
    if (t === 'PLC' || t === 'EQUIPMENT') return 'info';
    if (t === 'HARDWARE') return 'warning';
    return 'neutral';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} color="var(--color-primary-600, #2563EB)" />
          <span>{resource.name}</span>
        </div>
      }
      subtitle={`Resource Identifier: ${resource.resourceId}`}
      maxWidth="560px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Core Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          fontSize: '13px'
        }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
              Resource ID:
            </span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-600, #2563EB)' }}>
              {resource.resourceId}
            </span>
          </div>

          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
              Type:
            </span>
            <Badge variant={getTypeVariant(resource.type)}>
              {resource.type}
            </Badge>
          </div>

          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
              Status:
            </span>
            <Badge variant={resource.status.toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>
              {resource.status}
            </Badge>
          </div>

          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
              IP / Host Address:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace', fontWeight: 600 }}>
              <Globe size={13} color="var(--text-secondary)" />
              <span>{resource.ip || '—'}</span>
            </div>
          </div>

          {resource.createdAt && (
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
                Created At:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Calendar size={12} />
                <span>{new Date(resource.createdAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {resource.updatedAt && (
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
                Last Updated:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Clock size={12} />
                <span>{new Date(resource.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Template Blueprint Indicator */}
        {resource.templateCode && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Inherited Template Blueprint:</span>
            <Badge variant="info">{resource.templateCode}</Badge>
          </div>
        )}

        {/* Template Blueprint Properties */}
        {((resource.templateProperties && Object.keys(resource.templateProperties).length > 0) ||
          (resource.effectiveProperties && Object.keys(resource.effectiveProperties).length > 0)) && (
          <div>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Template Properties:
            </span>
            <JsonViewer
              data={resource.templateProperties && Object.keys(resource.templateProperties).length > 0
                ? resource.templateProperties
                : (resource.effectiveProperties || {})}
              maxHeight="200px"
            />
          </div>
        )}

        {/* Custom Properties */}
        <div>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '6px'
          }}>
            Custom Properties & Configuration:
          </span>
          <JsonViewer
            data={resource.customProperties || {}}
            maxHeight="200px"
          />
        </div>
      </div>
    </Modal>
  );
};
