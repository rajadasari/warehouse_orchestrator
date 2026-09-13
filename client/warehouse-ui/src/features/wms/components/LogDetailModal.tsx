import React from 'react';
import { WmsTransactionLog } from '../../../services/wmsService';
import { Modal } from '../../../components/common/Modal';
import { Badge, getStatusBadgeVariant } from '../../../components/common/Badge';
import { JsonViewer } from '../../../components/common/JsonViewer';
import { Button } from '../../../components/common/Button';

export interface LogDetailModalProps {
  log: WmsTransactionLog | null;
  onClose: () => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <Modal
      isOpen={!!log}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Transaction Details</span>
          <Badge variant={getStatusBadgeVariant(log.status)}>
            {log.status}
          </Badge>
        </div>
      }
      subtitle={
        <span>
          ID: <code style={{ color: 'var(--color-primary-600)' }}>{log.id}</code> &bull; Created at {new Date(log.createdAt).toLocaleString()}
        </span>
      }
      maxWidth="780px"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Metadata summary grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            padding: '12px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            fontSize: '12px'
          }}
        >
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>Operation</span>
            <strong>{log.transactionType}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>Pallet LPN</span>
            <strong>{log.palletLpn || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>Order Reference</span>
            <strong>{log.orderReference || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>WMS Reference</span>
            <strong>{log.wmsReferenceId || 'N/A'}</strong>
          </div>
        </div>

        {log.details && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-neutral-50)',
              border: '1px solid var(--border-default)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}
          >
            <strong>Execution Details: </strong> {log.details}
          </div>
        )}

        {/* Payloads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Outbound Request Payload
            </div>
            <JsonViewer data={log.payload} title="Request JSON" maxHeight="240px" />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Inbound Response Payload
            </div>
            <JsonViewer data={log.responsePayload} title="Response JSON" maxHeight="240px" />
          </div>
        </div>
      </div>
    </Modal>
  );
};
