import React, { useMemo } from 'react';

export interface DynamicPathVariableCardProps {
  urlPath: string;
  /** Current runtime values for each detected variable. */
  variableValues: Record<string, string>;
  /** Callback to update a single variable value. */
  onChangeVariable: (variableName: string, value: string) => void;
  disabled?: boolean;
}

/** Extracts all `{variableName}` tokens from the URL path. */
export function extractPathVariables(url: string): string[] {
  const matches = url.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

export const DynamicPathVariableCard: React.FC<DynamicPathVariableCardProps> = ({
  urlPath,
  variableValues,
  onChangeVariable,
  disabled = false,
}) => {
  const variables = useMemo(() => extractPathVariables(urlPath), [urlPath]);

  if (variables.length === 0) return null;

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '6px',
        border: '1px dashed rgba(245, 158, 11, 0.35)',
        backgroundColor: 'rgba(245, 158, 11, 0.04)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#F59E0B',
          marginBottom: '8px',
        }}
      >
        Dynamic Path Variables ({variables.length})
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {variables.map(v => (
          <div
            key={v}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              minWidth: '160px',
              flex: '1 1 160px',
              maxWidth: '260px',
            }}
          >
            <label
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              {`{${v}}`}
            </label>
            <input
              type="text"
              value={variableValues[v] ?? ''}
              onChange={e => onChangeVariable(v, e.target.value)}
              disabled={disabled}
              placeholder={`e.g. ${v.toUpperCase()}-001`}
              style={{
                padding: '7px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: disabled ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace',
                minHeight: '36px',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
