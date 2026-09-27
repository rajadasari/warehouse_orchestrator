import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { MethodDefinition } from '../../types/resourceEnums';

interface TemplateCustomMethodsTabProps {
  customMethods: MethodDefinition[];
  handleAddCustomMethod: () => void;
  handleUpdateCustomMethod: (index: number, patch: Partial<MethodDefinition>) => void;
  handleRemoveCustomMethod: (index: number) => void;
  commandInput: string;
  setCommandInput: (val: string) => void;
  supportedCommands: string[];
  handleAddCommand: () => void;
  handleRemoveCommand: (cmd: string) => void;
}

export const TemplateCustomMethodsTab: React.FC<TemplateCustomMethodsTabProps> = ({
  customMethods,
  handleAddCustomMethod,
  handleUpdateCustomMethod,
  handleRemoveCustomMethod,
  commandInput,
  setCommandInput,
  supportedCommands,
  handleAddCommand,
  handleRemoveCommand
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Define callable operations, service methods, and hardware commands (e.g. `dockToCharger`, `syncOrders`, `pingHealth`).
        </span>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={handleAddCustomMethod}
          style={{ minHeight: '44px' }}
        >
          Add Method
        </Button>
      </div>

      {customMethods.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: '8px',
          border: '1px dashed var(--border-default)',
          color: 'var(--text-secondary)',
          fontSize: '12.5px'
        }}>
          No methods defined for this template yet. Click &quot;Add Method&quot; to define template execution services or API commands.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {customMethods.map((m, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 40px', gap: '10px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Method Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. jogForward"
                    value={m.name}
                    onChange={e => handleUpdateCustomMethod(idx, { name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Execution Type
                  </label>
                  <select
                    value={m.type}
                    onChange={e => handleUpdateCustomMethod(idx, { type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  >
                    <option value="CONTROL">CONTROL</option>
                    <option value="DIAGNOSTIC">DIAGNOSTIC</option>
                    <option value="EXECUTION">EXECUTION</option>
                    <option value="TELEMETRY">TELEMETRY</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Safety Tier (IEC 62443)
                  </label>
                  <select
                    value={m.safetyTier || 'OPERATIONAL'}
                    onChange={e => handleUpdateCustomMethod(idx, { safetyTier: e.target.value as 'READ_ONLY' | 'OPERATIONAL' | 'SAFETY_CRITICAL' })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  >
                    <option value="READ_ONLY">READ_ONLY</option>
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="SAFETY_CRITICAL">SAFETY_CRITICAL</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleRemoveCustomMethod(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '6px',
                      minWidth: '40px',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete method"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Description of operation and expected machine response..."
                  value={m.description || ''}
                  onChange={e => handleUpdateCustomMethod(idx, { description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supported Command Chips */}
      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-default)' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Supported Direct Commands (Tags)
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="e.g. JOG_FWD, HOME, CLEAR_JAM"
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCommand(); } }}
            style={{
              width: '260px',
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />
          <Button variant="outline" size="sm" onClick={handleAddCommand}>
            Add Tag
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {supportedCommands.map(cmd => (
            <span
              key={cmd}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '14px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#3B82F6',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}
            >
              {cmd}
              <X
                size={12}
                style={{ cursor: 'pointer' }}
                onClick={() => handleRemoveCommand(cmd)}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
