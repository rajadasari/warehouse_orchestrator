import React, { useState } from 'react';
import { Cpu, RefreshCw, Send, CheckCircle2, AlertTriangle, Search, ShieldAlert } from 'lucide-react';
import { ResourceItem, resourceService } from '../../../services/resourceService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';

export interface PlcTagControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  onSuccess?: (msg: string) => void;
}

interface TagItem {
  nodeId: string;
  browseName?: string;
  nodeClass?: string;
  value?: unknown;
}

export const PlcTagControlModal: React.FC<PlcTagControlModalProps> = ({
  isOpen,
  onClose,
  resource,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [readingTag, setReadingTag] = useState<string | null>(null);
  const [writingTag, setWritingTag] = useState<string | null>(null);
  const [tagValues, setTagValues] = useState<Record<string, unknown>>({});
  const [writeInputs, setWriteInputs] = useState<Record<string, string>>({});
  const [writeConfirm, setWriteConfirm] = useState<{ nodeId: string; value: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!resource || !isOpen) return null;

  // Extract tags from customProperties.tags
  const rawTags = (resource.customProperties?.tags as TagItem[]) || [];
  const tags: TagItem[] = Array.isArray(rawTags) ? rawTags : [];

  const filteredTags = tags.filter(t => {
    const q = searchTerm.toLowerCase();
    return (t.nodeId && t.nodeId.toLowerCase().includes(q)) ||
           (t.browseName && t.browseName.toLowerCase().includes(q));
  });

  const handleRead = async (nodeId: string) => {
    setReadingTag(nodeId);
    setStatusMessage(null);
    try {
      const res = await resourceService.executeResourceMethod(resource.resourceId, 'READ_TAG', { nodeId });
      if (res.success && res.data && typeof res.data === 'object') {
        const d = res.data as Record<string, unknown>;
        setTagValues(prev => ({ ...prev, [nodeId]: d.value ?? 'null' }));
        setStatusMessage({ text: `Successfully read ${nodeId}: ${String(d.value)}` });
      } else {
        setStatusMessage({ text: res.message || 'Read failed', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Read error';
      setStatusMessage({ text: `Read error: ${msg}`, isError: true });
    } finally {
      setReadingTag(null);
    }
  };

  const handleWriteClick = (nodeId: string) => {
    const val = writeInputs[nodeId];
    if (val === undefined || val.trim() === '') {
      setStatusMessage({ text: 'Please enter a value to write', isError: true });
      return;
    }
    setWriteConfirm({ nodeId, value: val.trim() });
  };

  const confirmWrite = async () => {
    if (!writeConfirm) return;
    const { nodeId, value } = writeConfirm;
    setWritingTag(nodeId);
    setWriteConfirm(null);
    setStatusMessage(null);

    // Parse primitive values (boolean, number, string)
    let parsedVal: unknown = value;
    if (value.toLowerCase() === 'true') parsedVal = true;
    else if (value.toLowerCase() === 'false') parsedVal = false;
    else if (!isNaN(Number(value))) parsedVal = Number(value);

    try {
      const res = await resourceService.executeResourceMethod(resource.resourceId, 'WRITE_TAG', {
        nodeId,
        value: parsedVal
      });

      if (res.success) {
        setTagValues(prev => ({ ...prev, [nodeId]: parsedVal }));
        setStatusMessage({ text: `Successfully wrote value '${value}' to ${nodeId}` });
        if (onSuccess) onSuccess(`Wrote ${value} to ${nodeId}`);
      } else {
        setStatusMessage({ text: res.message || 'Write failed', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Write error';
      setStatusMessage({ text: `Write error: ${msg}`, isError: true });
    } finally {
      setWritingTag(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={20} color="var(--color-primary-600, #2563EB)" />
          <span>PLC Tag Reader & Setpoint Control</span>
        </div>
      }
      subtitle={`Connected to: ${resource.name} (${resource.host || resource.ip}:4840)`}
      maxWidth="800px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Status Message */}
        {statusMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12.5px',
            backgroundColor: statusMessage.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: statusMessage.isError ? '#DC2626' : '#059669',
            border: `1px solid ${statusMessage.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
          }}>
            {statusMessage.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-disabled)' }} />
            <input
              type="text"
              placeholder="Search by Node ID or browse name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>
          <Badge variant="info">
            {filteredTags.length} Tags
          </Badge>
        </div>

        {/* Tags Table */}
        <div style={{
          maxHeight: '380px',
          overflowY: 'auto',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                textAlign: 'left'
              }}>
                <th style={{ padding: '8px 12px' }}>Node / Browse Name</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
                <th style={{ padding: '8px 12px' }}>Live Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map(tag => {
                const liveVal = tagValues[tag.nodeId] !== undefined ? String(tagValues[tag.nodeId]) : (tag.value !== undefined ? String(tag.value) : '—');
                const isReading = readingTag === tag.nodeId;
                const isWriting = writingTag === tag.nodeId;
                const isContainer = tag.nodeClass === 'Container';

                return (
                  <tr key={tag.nodeId} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tag.browseName || tag.nodeId}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{tag.nodeId}</div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <Badge variant={isContainer ? 'neutral' : 'info'}>
                        {tag.nodeClass || 'Variable'}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                      {liveVal}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRead(tag.nodeId)}
                          disabled={isReading}
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          <RefreshCw size={11} className={isReading ? 'animate-spin' : ''} style={{ marginRight: '4px' }} />
                          Read
                        </Button>

                        {!isContainer && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Value"
                              value={writeInputs[tag.nodeId] || ''}
                              onChange={e => setWriteInputs({ ...writeInputs, [tag.nodeId]: e.target.value })}
                              style={{
                                width: '70px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                fontSize: '11px',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                color: 'var(--text-primary)'
                              }}
                            />
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleWriteClick(tag.nodeId)}
                              disabled={isWriting}
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              title="Write Value (IEC 62443 Critical Action)"
                            >
                              <Send size={11} style={{ marginRight: '4px' }} />
                              Write
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* IEC 62443 Dual Approval / Safety Warning Modal Confirmation */}
        {writeConfirm && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #DC2626',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 600, fontSize: '13px' }}>
              <ShieldAlert size={16} />
              <span>IEC 62443 Safety-Critical PLC Write Confirmation</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              You are about to write setpoint value <strong>{writeConfirm.value}</strong> to live PLC tag:
              <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {writeConfirm.nodeId}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <Button size="sm" variant="secondary" onClick={() => setWriteConfirm(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={confirmWrite}>
                Authorize & Transmit
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
