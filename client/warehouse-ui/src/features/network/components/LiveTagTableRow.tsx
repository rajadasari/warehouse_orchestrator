import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Database,
  BookmarkPlus,
  Trash2
} from 'lucide-react';
import { DeviceTag, AcquisitionMethod } from '../types';
import { TagValueDisplay } from './TagValueDisplay';
import { extractDirectChildren, isComplexValue } from '../udtUtils';

export interface QualityInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isMissing: boolean;
}

export const getQualityInfo = (quality: string | undefined): QualityInfo => {
  if (!quality) return { label: 'GOOD', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', isMissing: false };
  if (quality.startsWith('GOOD')) return { label: 'GOOD', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', isMissing: false };
  if (quality.startsWith('MISSING')) return { label: '⚠ MISSING', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', isMissing: true };
  if (quality.startsWith('BAD')) return { label: 'BAD', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', isMissing: false };
  return { label: 'UNCERTAIN', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)', isMissing: false };
};

interface LiveTagTableRowProps {
  tag: DeviceTag;
  depth?: number;
  isMonitored: boolean;
  expandedTags: Set<string>;
  childMap?: Map<string, DeviceTag[]>;
  onToggleExpand: (nodeId: string) => void;
  onOpenWriteModal: (tag: DeviceTag) => void;
  onToggleMonitor: (tag: DeviceTag) => void;
  onDeleteTag?: (tag: DeviceTag) => void;
  onAcquisitionMethodChange: (tag: DeviceTag, method: AcquisitionMethod) => void;
  onToggleLogging: (tag: DeviceTag) => void;
}

export const LiveTagTableRow: React.FC<LiveTagTableRowProps> = ({
  tag,
  depth = 0,
  isMonitored,
  expandedTags,
  childMap,
  onToggleExpand,
  onOpenWriteModal,
  onToggleMonitor,
  onDeleteTag,
  onAcquisitionMethodChange,
  onToggleLogging
}) => {
  const isExpanded = expandedTags.has(tag.nodeId);
  const explicitChildren = childMap?.get(tag.nodeId) ?? [];
  const directChildren = extractDirectChildren(tag, explicitChildren);
  const childCount = directChildren.length;
  const isComplex = childCount > 0 || tag.isUdt || isComplexValue(tag.value);
  const qi = getQualityInfo(tag.quality);

  // Full qualified path
  const fullPath = tag.name;

  // Relative display name for tree level
  let relativeName = tag.memberPath;
  if (!relativeName) {
    if (tag.name.endsWith(']')) {
      const bIdx = tag.name.lastIndexOf('[');
      relativeName = bIdx >= 0 ? tag.name.substring(bIdx) : tag.name;
    } else {
      relativeName = tag.name.split('.').pop() ?? tag.name;
    }
  }

  // Display name: at depth 0, display the full tag name; at depth > 0, display the hierarchical member name
  const displayName = depth === 0 ? fullPath : (relativeName || fullPath);

  return (
    <React.Fragment>
      <tr
        style={{
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: isExpanded
            ? (depth === 0 ? 'rgba(59, 130, 246, 0.04)' : 'rgba(56, 189, 248, 0.03)')
            : (depth > 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent'),
          transition: 'background-color 0.15s ease'
        }}
      >
        {/* Tag Name with Indentation, Relative Name & Full Qualified Path Sub-label */}
        <td
          style={{
            padding: `6px 12px 6px ${12 + depth * 22}px`,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }} title={fullPath}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {depth > 0 && (
                <span style={{ color: '#64748B', marginRight: '2px', userSelect: 'none' }}>
                  └─
                </span>
              )}

              {isComplex ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(tag.nodeId)}
                  title={isExpanded ? 'Collapse members' : 'Expand members'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: isExpanded ? '#60A5FA' : 'var(--text-secondary)'
                  }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span style={{ width: '18px', display: 'inline-block' }} />
              )}

              {isComplex && <Layers size={13} color="#38BDF8" />}
              <span style={{
                color: depth === 0 ? 'var(--text-primary)' : '#38BDF8',
                fontWeight: depth === 0 ? 700 : 600,
                fontSize: depth === 0 ? '12px' : '11.5px'
              }}>
                {displayName}
              </span>

              {childCount > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    color: '#60A5FA',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fontWeight: 500
                  }}
                >
                  {childCount} fields
                </span>
              )}
            </div>

            {/* Hierarchical sub-label showing full qualified path */}
            {depth > 0 && fullPath !== displayName && (
              <div style={{
                paddingLeft: '24px',
                fontSize: '9.5px',
                color: 'var(--text-secondary)',
                opacity: 0.75,
                lineHeight: '1.2'
              }}>
                {fullPath}
              </div>
            )}
          </div>
        </td>

        {/* NodeId / Address */}
        <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
          {tag.nodeId}
        </td>

        {/* Data Type */}
        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              fontSize: '10.5px',
              fontWeight: 500,
              color: isComplex ? '#38BDF8' : '#60A5FA'
            }}
          >
            {isComplex ? 'UDT / Struct' : tag.dataType}
          </span>
        </td>

        {/* Quality Watchdog */}
        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '10.5px',
              fontWeight: 600,
              backgroundColor: qi.bgColor,
              color: qi.color,
              border: `1px solid ${qi.borderColor}`
            }}
            title={tag.quality ?? ''}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: qi.color
              }}
            />
            {qi.label}
          </span>
        </td>

        {/* Live Value */}
        <td style={{ padding: '7px 12px', minWidth: '200px' }}>
          <TagValueDisplay
            value={tag.value}
            quality={tag.quality}
            isMissing={qi.isMissing}
          />
        </td>

        {/* Acquisition Method Selector */}
        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
          {depth === 0 ? (
            <select
              value={tag.acquisitionMethod || 'SUBSCRIPTION'}
              onChange={e => onAcquisitionMethodChange(tag, e.target.value as AcquisitionMethod)}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '10.5px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                color: tag.acquisitionMethod === 'POLLED_READ' ? '#F59E0B' : (tag.acquisitionMethod === 'HISTORICAL_ACCESS' ? '#A78BFA' : (tag.acquisitionMethod === 'PUBSUB_BROKER' ? '#EC4899' : '#10B981')),
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="SUBSCRIPTION">SUBSCRIPTION (Push)</option>
              <option value="POLLED_READ">POLLED_READ (Cyclic)</option>
              <option value="HISTORICAL_ACCESS">HISTORICAL_ACCESS</option>
              <option value="PUBSUB_BROKER">PUBSUB_BROKER</option>
            </select>
          ) : (
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              {tag.acquisitionMethod || 'SUBSCRIPTION'} (Inherited)
            </span>
          )}
        </td>

        {/* Log to DB */}
        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
          {depth === 0 ? (
            <button
              type="button"
              onClick={() => onToggleLogging(tag)}
              title={tag.isLoggingEnabled ? "Logging to DB enabled" : "Logging disabled"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 7px',
                borderRadius: '12px',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: tag.isLoggingEnabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-subtle)',
                color: tag.isLoggingEnabled ? '#10B981' : 'var(--text-secondary)',
                border: tag.isLoggingEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-default)'
              }}
            >
              <Database size={11} />
              <span>{tag.isLoggingEnabled ? 'Active' : 'Off'}</span>
            </button>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>—</span>
          )}
        </td>

        {/* Timestamp */}
        <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
          {tag.timestamp ? new Date(tag.timestamp).toLocaleTimeString() : '—'}
        </td>

        {/* Actions */}
        <td style={{ padding: '7px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <button
              type="button"
              onClick={() => onOpenWriteModal(tag)}
              disabled={!tag.writable || qi.isMissing}
              title={qi.isMissing ? 'Cannot write to missing tag' : (!tag.writable ? 'Tag is Read-Only or composite' : 'Write live setpoint')}
              style={{
                padding: '2px 7px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'transparent',
                color: (!tag.writable || qi.isMissing) ? 'var(--text-secondary)' : '#3B82F6',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: (!tag.writable || qi.isMissing) ? 'not-allowed' : 'pointer'
              }}
            >
              Write
            </button>

            {isMonitored ? (
              <button
                type="button"
                onClick={() => onDeleteTag ? onDeleteTag(tag) : onToggleMonitor(tag)}
                title="Remove monitored tag from database"
                style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Trash2 size={11} color="#EF4444" />
                <span>Delete</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleMonitor(tag)}
                title="Save to Database Watchlist (+)"
                style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <BookmarkPlus size={11} />
                <span>+ Add</span>
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Recursive Expansion: Render direct child rows with incremented depth */}
      {isExpanded && directChildren.map(child => (
        <LiveTagTableRow
          key={child.nodeId}
          tag={child}
          depth={depth + 1}
          isMonitored={Boolean(child.isMonitored)}
          expandedTags={expandedTags}
          childMap={childMap}
          onToggleExpand={onToggleExpand}
          onOpenWriteModal={onOpenWriteModal}
          onToggleMonitor={onToggleMonitor}
          onDeleteTag={onDeleteTag}
          onAcquisitionMethodChange={onAcquisitionMethodChange}
          onToggleLogging={onToggleLogging}
        />
      ))}
    </React.Fragment>
  );
};
