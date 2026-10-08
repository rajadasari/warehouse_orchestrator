import React from 'react';
import { Radar, AlertTriangle, X } from 'lucide-react';

interface DiscoverConfirmModalProps {
  channelName: string;
  isDiscovering: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * IEC 62443 Operator Confirmation Modal for Discover Tags.
 * Informs the operator that full address-space discovery crawls the PLC
 * and prevents accidental heavy operations on production controllers.
 */
export const DiscoverConfirmModal: React.FC<DiscoverConfirmModalProps> = ({
  channelName,
  isDiscovering,
  onConfirm,
  onCancel
}) => {
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
        width: '480px',
        maxWidth: '90vw',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Radar size={20} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Discover All Tags from OPC UA Server?
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Target: {channelName}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDiscovering}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(245, 158, 11, 0.10)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
            <strong>High PLC Load Warning:</strong> A full recursive browse will traverse the entire OPC UA address space, including all folders, objects, and UDT structures.
            <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
              On production PLCs, this can take several seconds. Existing monitored tags in your database will be preserved.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDiscovering}
            style={{
              padding: '7px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              minHeight: '36px'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDiscovering}
            style={{
              padding: '7px 18px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isDiscovering ? 'rgba(16, 185, 129, 0.5)' : '#059669',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isDiscovering ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '36px'
            }}
          >
            <Radar size={14} className={isDiscovering ? 'spin' : ''} />
            <span>{isDiscovering ? 'Discovering...' : 'Yes, Discover All Tags'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
