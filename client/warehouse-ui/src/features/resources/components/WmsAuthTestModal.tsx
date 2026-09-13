import React from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { WmsAuthStatus } from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';

export interface WmsAuthTestResult {
  success: boolean;
  token?: string;
  status?: WmsAuthStatus;
  message: string;
  error?: string;
}

export interface WmsAuthTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  authResult: WmsAuthTestResult | null;
}

export const WmsAuthTestModal: React.FC<WmsAuthTestModalProps> = ({
  isOpen,
  onClose,
  authResult
}) => {
  if (!authResult) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {authResult.success ? (
            <Shield size={18} color="#10B981" />
          ) : (
            <AlertCircle size={18} color="#EF4444" />
          )}
          <span>WMS Authentication Status</span>
        </div>
      }
      subtitle={
        authResult.success
          ? 'Active Bearer token acquired and cached in memory'
          : 'Authentication was rejected or an error occurred'
      }
      maxWidth="560px"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Status Badge */}
        <div>
          <Badge variant={authResult.success ? 'success' : 'danger'}>
            ● {authResult.success ? 'Token Active & Cached in Memory' : 'Authentication Error'}
          </Badge>
        </div>

        {/* Diagnostic Details */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          fontSize: '12.5px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div>
            <strong>Resource:</strong>{' '}
            <code style={{ color: 'var(--color-primary-600, #2563EB)' }}>
              {authResult.status?.resourceId || 'Default'}
            </code>
          </div>
          <div>
            <strong>Endpoint:</strong>{' '}
            <code style={{ color: 'var(--color-primary-600, #2563EB)' }}>
              POST {authResult.status?.authEndpoint || '/WMS.Api/api/authentication'}
            </code>
          </div>
          <div>
            <strong>Target Host:</strong>{' '}
            <code>{authResult.status?.targetBaseUrl || '—'}</code>
          </div>
          <div>
            <strong>Header Format:</strong>{' '}
            <code style={{ color: '#8B5CF6' }}>
              {authResult.status?.headerFormat || 'Bearer <token>'}
            </code>
          </div>
          {authResult.status?.expiresAt && (
            <div>
              <strong>Expires At:</strong> <code>{authResult.status.expiresAt}</code>
            </div>
          )}
          {authResult.error && (
            <div style={{ color: '#EF4444', marginTop: '4px', wordBreak: 'break-all' }}>
              <strong>Server Response / Error:</strong> {authResult.error}
            </div>
          )}
        </div>

        {/* Token Preview */}
        {authResult.token && (
          <div>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Active Access Token (In-Memory Bearer):
            </span>
            <pre style={{
              margin: 0,
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              maxHeight: '120px',
              overflowY: 'auto',
              color: 'var(--text-primary)'
            }}>
              {authResult.token}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};
