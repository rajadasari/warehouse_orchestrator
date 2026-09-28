import React, { useState } from 'react';
import { Plus, Trash2, X, Sparkles, ListFilter } from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { MethodDefinition } from '../../types/resourceEnums';
import { VisualSnippetMethodComposer } from './VisualSnippetMethodComposer';

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
  const [activeMode, setActiveMode] = useState<'LIST' | 'VISUAL_COMPOSER'>('VISUAL_COMPOSER');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mode Switcher Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Design Mode:
          </span>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={() => setActiveMode('VISUAL_COMPOSER')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeMode === 'VISUAL_COMPOSER' ? '#3B82F6' : 'transparent',
                color: activeMode === 'VISUAL_COMPOSER' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={13} /> Visual Snippet Composer
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('LIST')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeMode === 'LIST' ? '#3B82F6' : 'transparent',
                color: activeMode === 'LIST' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ListFilter size={13} /> Defined Methods ({customMethods.length})
            </button>
          </div>
        </div>

        {activeMode === 'LIST' && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus size={13} />}
            onClick={handleAddCustomMethod}
            style={{ minHeight: '36px' }}
          >
            Add Method
          </Button>
        )}
      </div>

      {/* Visual Composer View */}
      {activeMode === 'VISUAL_COMPOSER' && (
        <div>
          <VisualSnippetMethodComposer />
        </div>
      )}

      {/* Methods List View */}
      {activeMode === 'LIST' && (
        <>
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
              No custom methods defined yet. Click &quot;Add Method&quot; or switch to Visual Snippet Composer.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customMethods.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Method Identifier
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
                        Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jog Conveyor Forward"
                        value={m.displayName || ''}
                        onChange={e => handleUpdateCustomMethod(idx, { displayName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Category
                      </label>
                      <select
                        value={m.category || 'HARDWARE'}
                        onChange={e => handleUpdateCustomMethod(idx, { category: e.target.value })}
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
                        <option value="HARDWARE">HARDWARE</option>
                        <option value="API">API</option>
                        <option value="LOGIC">LOGIC</option>
                        <option value="CALCULATION">CALCULATION</option>
                        <option value="DIAGNOSTIC">DIAGNOSTIC</option>
                        <option value="CUSTOM">CUSTOM</option>
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
                      placeholder="Description of operation and expected response..."
                      value={m.description || ''}
                      onChange={e => handleUpdateCustomMethod(idx, { description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Supported Direct Commands (Tags) */}
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
