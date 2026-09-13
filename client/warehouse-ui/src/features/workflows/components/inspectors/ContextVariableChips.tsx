import React from 'react';
import { Sparkles } from 'lucide-react';

export interface ContextVariableItem {
  name: string;
  type?: string;
  sourceNodeLabel?: string;
  sampleValue?: string;
}

interface ContextVariableChipsProps {
  variables: ContextVariableItem[];
  onInsertVariable: (token: string) => void;
  title?: string;
}

export const ContextVariableChips: React.FC<ContextVariableChipsProps> = ({
  variables,
  onInsertVariable,
  title = 'Available Context Variables (Click to Insert):'
}) => {
  if (variables.length === 0) {
    return (
      <div style={{
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        border: '1px dashed rgba(239, 68, 68, 0.3)',
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '11px',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{ color: '#f87171' }}>●</span>
        <span>No upstream node connected. Connect this node on the canvas to use its emitted outputs.</span>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#090d16',
      border: '1px solid #1e293b',
      borderRadius: '6px',
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '10.5px',
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}>
        <Sparkles size={13} style={{ color: '#38bdf8' }} />
        <span>{title}</span>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px'
      }}>
        {variables.map((v) => {
          const token = `{{${v.name}}}`;
          return (
            <button
              key={v.name}
              type="button"
              onClick={() => onInsertVariable(token)}
              title={`Insert ${token}${v.sampleValue ? ` (e.g. ${v.sampleValue})` : ''}${v.sourceNodeLabel ? ` from [${v.sourceNodeLabel}]` : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                color: '#38bdf8',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
              }}
            >
              <span>{token}</span>
              {v.type && (
                <span style={{
                  fontSize: '9px',
                  color: '#64748b',
                  backgroundColor: '#0f172a',
                  padding: '1px 3px',
                  borderRadius: '2px'
                }}>
                  {v.type}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
