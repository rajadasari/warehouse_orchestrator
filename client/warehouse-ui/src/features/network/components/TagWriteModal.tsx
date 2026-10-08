import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { DeviceTag } from '../types';

interface TagWriteModalProps {
  tag: DeviceTag;
  newValue: string;
  isWriting: boolean;
  writeFeedback: { success: boolean; message: string } | null;
  onNewValueChange: (val: string) => void;
  onExecuteWrite: () => void;
  onClose: () => void;
}

/**
 * IEC 62443 / IEC 62541 Tag Write Dialog.
 * Supports Boolean toggles, numeric inputs, and JSON/UDT structure writes.
 */
export const TagWriteModal: React.FC<TagWriteModalProps> = ({
  tag,
  newValue,
  isWriting,
  writeFeedback,
  onNewValueChange,
  onExecuteWrite,
  onClose
}) => {
  const isBoolean = tag.dataType === 'Boolean' || typeof tag.value === 'boolean';
  const isUdt = tag.dataType === 'Variant' || typeof tag.value === 'object';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        width: isUdt ? '560px' : '440px',
        maxWidth: '92vw',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Write Setpoint Value
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {tag.nodeId}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isWriting}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: '6px',
          fontSize: '11.5px'
        }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Tag Name: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{tag.name}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Data Type: </span>
            <strong style={{ color: '#38BDF8' }}>{tag.dataType}</strong>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            New Value to Write:
          </label>
          {isBoolean ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onNewValueChange('true')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #10B981',
                  backgroundColor: newValue === 'true' ? '#10B981' : 'transparent',
                  color: newValue === 'true' ? '#fff' : '#10B981',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: '36px'
                }}
              >
                TRUE
              </button>
              <button
                type="button"
                onClick={() => onNewValueChange('false')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #EF4444',
                  backgroundColor: newValue === 'false' ? '#EF4444' : 'transparent',
                  color: newValue === 'false' ? '#fff' : '#EF4444',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: '36px'
                }}
              >
                FALSE
              </button>
            </div>
          ) : isUdt ? (
            <textarea
              rows={5}
              value={newValue}
              onChange={e => onNewValueChange(e.target.value)}
              placeholder="Enter JSON or structured string..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            />
          ) : (
            <input
              type="text"
              value={newValue}
              onChange={e => onNewValueChange(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px'
              }}
            />
          )}
        </div>

        {writeFeedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            color: writeFeedback.success ? '#10B981' : '#EF4444'
          }}>
            {writeFeedback.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{writeFeedback.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              minHeight: '32px'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExecuteWrite}
            disabled={isWriting}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#3B82F6',
              color: '#fff',
              fontSize: '12px',
              cursor: isWriting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              minHeight: '32px'
            }}
          >
            {isWriting ? 'Writing...' : 'Execute Write'}
          </button>
        </div>
      </div>
    </div>
  );
};
