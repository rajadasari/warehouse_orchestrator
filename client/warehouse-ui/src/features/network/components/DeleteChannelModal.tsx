import React from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, FolderTree } from 'lucide-react';
import { NetworkDeviceChannel } from '../types';

interface DeleteChannelModalProps {
  channel: NetworkDeviceChannel | null;
  isOpen: boolean;
  isDeleting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  onNavigateToTags?: (channel: NetworkDeviceChannel) => void;
}

/**
 * IEC 62443 Industrial Channel Deletion Dialog.
 * Enforces tag removal pre-condition before deletion is permitted.
 */
export const DeleteChannelModal: React.FC<DeleteChannelModalProps> = ({
  channel,
  isOpen,
  isDeleting,
  errorMessage,
  onClose,
  onConfirmDelete,
  onNavigateToTags
}) => {
  if (!isOpen || !channel) return null;

  const hasTags = (channel.tagsCount ?? 0) > 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        width: '460px',
        maxWidth: '92vw',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: hasTags ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasTags ? '#F59E0B' : '#EF4444'
            }}>
              {hasTags ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {hasTags ? 'Cannot Delete Channel' : 'Delete Device Channel?'}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {channel.name} ({channel.protocol})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {hasTags ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '12px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '12.5px',
              color: 'var(--text-primary)',
              lineHeight: 1.5
            }}>
              This channel currently has <strong style={{ color: '#F59E0B' }}>{channel.tagsCount} monitored tag(s)</strong> stored in the database.
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              To protect warehouse control logic and equipment rules, a device channel cannot be deleted while its tags are still registered. Please remove all monitored tags first.
            </div>

            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-subtle)',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              Endpoint: {channel.endpointUrl}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{channel.name}</strong>?
            </div>

            <div style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-subtle)',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div>Endpoint: <strong style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{channel.endpointUrl}</strong></div>
              <div>Monitored Tags: <strong style={{ color: '#10B981' }}>0 tags (safe to delete)</strong></div>
            </div>

            <div style={{ fontSize: '11.5px', color: '#EF4444' }}>
              ⚠ This action cannot be undone. The OPC-UA client session will be terminated and the channel removed.
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-default)'
        }}>
          {hasTags ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              {onNavigateToTags && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToTags(channel);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FolderTree size={14} />
                  Manage Monitored Tags
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                <Trash2 size={13} />
                {isDeleting ? 'Deleting...' : 'Yes, Delete Channel'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
