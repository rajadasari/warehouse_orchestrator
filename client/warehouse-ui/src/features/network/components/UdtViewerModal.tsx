import React, { useState } from 'react';
import { X, Copy, Check, Layers } from 'lucide-react';

interface UdtViewerModalProps {
  tagName: string;
  nodeId: string;
  data: unknown;
  onClose: () => void;
}

/**
 * Industrial UDT / Structure Inspector Modal (IEC 62443 / IEC 62541).
 * Displays nested fields, types, and values of complex OPC UA User-Defined Types
 * in a clear, high-contrast tabular format with JSON export.
 */
export const UdtViewerModal: React.FC<UdtViewerModalProps> = ({
  tagName,
  nodeId,
  data,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Normalize data into array of rows for tabular inspection
  const rows: Array<{ path: string; key: string; value: string; type: string }> = [];

  const flatten = (obj: unknown, prefix = '') => {
    if (obj === null || obj === undefined) {
      rows.push({ path: prefix, key: prefix || 'value', value: 'null', type: 'null' });
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        flatten(item, prefix ? `${prefix}[${index}]` : `[${index}]`);
      });
    } else if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const newPrefix = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object') {
          flatten(v, newPrefix);
        } else {
          rows.push({
            path: newPrefix,
            key: k,
            value: String(v ?? '—'),
            type: typeof v
          });
        }
      }
    } else {
      rows.push({
        path: prefix || 'value',
        key: prefix || 'value',
        value: String(obj),
        type: typeof obj
      });
    }
  };

  flatten(data);

  const filteredRows = rows.filter(r =>
    r.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        width: '750px',
        maxWidth: '92vw',
        maxHeight: '85vh',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={18} color="#38BDF8" />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                UDT Inspector: {tagName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                {nodeId}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0
        }}>
          <input
            type="text"
            placeholder="Search fields or values..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              color: 'var(--text-primary)'
            }}
          />
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '11.5px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              color: copied ? '#10B981' : 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
            <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
          </button>
        </div>

        {/* Content Table */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 18px' }}>
          {filteredRows.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
              No UDT fields match search criteria.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', margin: '10px 0' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 10px', width: '45%' }}>Field Path</th>
                  <th style={{ padding: '8px 10px', width: '20%' }}>Data Type</th>
                  <th style={{ padding: '8px 10px', width: '35%' }}>Live Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={`${r.path}-${i}`} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#60A5FA', fontWeight: 600 }}>
                      {r.path}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-default)'
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{
                      padding: '8px 10px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: r.type === 'boolean'
                        ? (r.value === 'true' ? '#10B981' : '#EF4444')
                        : (r.type === 'number' ? '#38BDF8' : 'var(--text-primary)')
                    }}>
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Showing {filteredRows.length} of {rows.length} resolved UDT properties
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
