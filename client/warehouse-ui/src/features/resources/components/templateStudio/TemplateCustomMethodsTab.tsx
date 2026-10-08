import React, { useState } from 'react';
import { Plus, X, Sparkles, ListFilter } from 'lucide-react';
import { Button } from '../../../../components/common/Button';
import { MethodDefinition } from '../../types/resourceEnums';
import { ServiceMethodIdeWorkspace } from './ServiceMethodIdeWorkspace';
import { DefinedMethodsTableView } from './DefinedMethodsTableView';

import { PropertySchemaItem } from '../../../../services/resourceTemplateService';

interface TemplateCustomMethodsTabProps {
  customMethods: MethodDefinition[];
  availableProperties?: string[];
  templateProperties?: PropertySchemaItem[];
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
  availableProperties = [],
  templateProperties = [],
  handleAddCustomMethod,
  handleUpdateCustomMethod,
  handleRemoveCustomMethod,
  commandInput,
  setCommandInput,
  supportedCommands,
  handleAddCommand,
  handleRemoveCommand
}) => {
  const [activeMode, setActiveMode] = useState<'IDE_WORKSPACE' | 'LIST'>('IDE_WORKSPACE');
  const [selectedMethodIndex, setSelectedMethodIndex] = useState<number>(0);

  const activeMethod = customMethods[selectedMethodIndex] || customMethods[0];

  const handleSaveFromIde = (saved: MethodDefinition) => {
    const idx = selectedMethodIndex < customMethods.length ? selectedMethodIndex : customMethods.length;
    handleUpdateCustomMethod(idx, saved);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Design Mode:
          </span>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={() => setActiveMode('IDE_WORKSPACE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeMode === 'IDE_WORKSPACE' ? '#3B82F6' : 'transparent',
                color: activeMode === 'IDE_WORKSPACE' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={13} /> 3-Column Service IDE
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
              <ListFilter size={13} /> Defined Services ({customMethods.length})
            </button>
          </div>

          {/* Quick Service Selector if multiple services */}
          {activeMode === 'IDE_WORKSPACE' && customMethods.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Editing:</span>
              <select
                value={selectedMethodIndex}
                onChange={e => setSelectedMethodIndex(Number(e.target.value))}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11.5px',
                  fontFamily: 'monospace'
                }}
              >
                {customMethods.map((m, idx) => (
                  <option key={idx} value={idx}>{m.name || `Service ${idx + 1}`}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus size={13} />}
            onClick={() => {
              handleAddCustomMethod();
              setSelectedMethodIndex(customMethods.length);
              setActiveMode('IDE_WORKSPACE');
            }}
            style={{ minHeight: '36px' }}
          >
            New Service
          </Button>
        </div>
      </div>

      {/* 3-Column Method IDE Workspace View */}
      {activeMode === 'IDE_WORKSPACE' && (
        <div>
          <ServiceMethodIdeWorkspace
            method={activeMethod}
            availableProperties={availableProperties}
            templateProperties={templateProperties}
            onSave={handleSaveFromIde}
          />
        </div>
      )}

      {/* Methods Table View (Structured Rows) */}
      {activeMode === 'LIST' && (
        <DefinedMethodsTableView
          methods={customMethods}
          onOpenInIde={(idx) => {
            setSelectedMethodIndex(idx);
            setActiveMode('IDE_WORKSPACE');
          }}
          onAddMethod={() => {
            handleAddCustomMethod();
            setSelectedMethodIndex(customMethods.length);
            setActiveMode('IDE_WORKSPACE');
          }}
          onRemoveMethod={(idx) => handleRemoveCustomMethod(idx)}
          onQuickTest={(m) => {
            const idx = customMethods.indexOf(m);
            setSelectedMethodIndex(idx >= 0 ? idx : 0);
            setActiveMode('IDE_WORKSPACE');
          }}
        />
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
