import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Shield,
  Zap,
  HeartPulse,
  Lock
} from 'lucide-react';
import { Badge } from '../../../../components/common/Badge';

/** HTTP verb → badge colour mapping (industrial palette). */
const HTTP_BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  GET:    { bg: 'rgba(16, 185, 129, 0.15)', fg: '#10B981' },
  POST:   { bg: 'rgba(56, 189, 248, 0.15)', fg: '#38BDF8' },
  PUT:    { bg: 'rgba(245, 158, 11, 0.15)', fg: '#F59E0B' },
  PATCH:  { bg: 'rgba(168, 85, 247, 0.15)', fg: '#A855F7' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)',  fg: '#EF4444' },
};

/** Icon selector for method type. */
function methodTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'AUTHENTICATION': return <Lock size={14} color="#F59E0B" />;
    case 'DIAGNOSTIC':     return <HeartPulse size={14} color="#10B981" />;
    case 'EXECUTION':      return <Zap size={14} color="#38BDF8" />;
    default:               return <Shield size={14} color="var(--text-secondary)" />;
  }
}

export interface MethodTableRowProps {
  name: string;
  /** Human-readable display name (e.g. "Pallet Pre-Announce"). */
  displayName?: string;
  httpMethod: string;
  port: string | number;
  urlPath: string;
  type: string;
  safetyTier?: string;
  isDefault: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
}

export const MethodTableRow: React.FC<MethodTableRowProps> = ({
  name,
  displayName,
  httpMethod,
  port,
  urlPath,
  type,
  safetyTier,
  isDefault,
  isExpanded,
  onToggleExpand,
  onDelete,
}) => {
  const verb = (httpMethod || 'POST').toUpperCase();
  const badgeStyle = HTTP_BADGE_COLORS[verb] ?? HTTP_BADGE_COLORS['POST'];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleExpand}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggleExpand(); }}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1.5fr 80px 70px 2fr 120px',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        minHeight: '48px',
        cursor: 'pointer',
        backgroundColor: isExpanded
          ? 'rgba(56, 189, 248, 0.06)'
          : 'var(--bg-surface-subtle)',
        border: isExpanded
          ? '1px solid var(--color-primary-500, #38BDF8)'
          : '1px solid var(--border-default)',
        borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
        transition: 'all 0.15s ease',
      }}
    >
      {/* 1. Expand chevron */}
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {isExpanded
          ? <ChevronDown size={16} color="var(--color-primary-400, #38BDF8)" />
          : <ChevronRight size={16} color="var(--text-secondary)" />}
      </span>

      {/* 2. Method Name + display name + type icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        {methodTypeIcon(type)}
        <div style={{ overflow: 'hidden', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 600,
              fontSize: '12.5px',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
          >
            {name}
          </span>
          {displayName && (
            <span
              style={{
                fontSize: '10.5px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
            >
              {displayName}
            </span>
          )}
        </div>
        {safetyTier === 'SAFETY_CRITICAL' && (
          <Badge variant="danger" style={{ fontSize: '9px' }}>CRITICAL</Badge>
        )}
      </div>

      {/* 3. HTTP Verb Badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'monospace',
          backgroundColor: badgeStyle.bg,
          color: badgeStyle.fg,
          letterSpacing: '0.04em',
        }}
      >
        {verb}
      </span>

      {/* 4. Port */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        {port ? `:${port}` : '—'}
      </span>

      {/* 5. URL Path (truncated with ellipsis) */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11.5px',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={urlPath || '/'}
      >
        {urlPath || '/'}
      </span>

      {/* 6. Action buttons */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}
      >
        {isDefault ? (
          <span
            title="Archetype Blueprint Method (Contract identity protected)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Lock size={11} />
            Blueprint
          </span>
        ) : (
          onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete Custom Method"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                cursor: 'pointer',
                color: '#EF4444',
                transition: 'background-color 0.15s',
              }}
            >
              <Trash2 size={14} />
            </button>
          )
        )}
      </div>
    </div>
  );
};
