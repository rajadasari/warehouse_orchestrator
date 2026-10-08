import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Database,
  RefreshCw,
  AlertCircle,
  Radar,
  AlertTriangle,
  Trash2,
  SlidersHorizontal,
  Folder,
  ChevronRight,
  FilterX
} from 'lucide-react';
import { DeviceTag, NetworkDeviceChannel, AcquisitionMethod } from '../types';
import { networkService } from '../networkService';
import { DiscoverConfirmModal } from './DiscoverConfirmModal';
import { TagWriteModal } from './TagWriteModal';
import { LiveTagTableRow } from './LiveTagTableRow';
import { LiveTagTableFilterHeader } from './LiveTagTableFilterHeader';
import { AddressSpaceTree } from './AddressSpaceTree';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';

interface LiveTagExplorerProps {
  channel: NetworkDeviceChannel;
  onTagsCountChange?: (channelId: string, count: number) => void;
}

type ViewFilter = 'ALL_BROWSED' | 'MONITORED_ONLY';

export const LiveTagExplorer: React.FC<LiveTagExplorerProps> = ({ channel, onTagsCountChange }) => {
  const [browsedTags, setBrowsedTags] = useState<DeviceTag[]>([]);
  const [monitoredTags, setMonitoredTags] = useState<DeviceTag[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('MONITORED_ONLY');
  const [editingTag, setEditingTag] = useState<DeviceTag | null>(null);
  const [newValue, setNewValue] = useState<string>('');
  const [isWriting, setIsWriting] = useState(false);
  const [writeFeedback, setWriteFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Address space panel collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Column filter state (matches MasterDataView pattern)
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Discover Tags state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showDiscoverConfirm, setShowDiscoverConfirm] = useState(false);

  // Sync with Device state
  const [isSyncing, setIsSyncing] = useState(false);

  // Recursive UDT Tree View: track expanded tag nodeIds
  const [expandedUdtTags, setExpandedUdtTags] = useState<Set<string>>(new Set());

  const toggleExpandUdt = (nodeId: string) => {
    setExpandedUdtTags(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const [isChannelOnline, setIsChannelOnline] = useState<boolean>(channel.status === 'ONLINE');

  // Stable ref for onTagsCountChange to prevent callback re-creation
  const onTagsCountChangeRef = React.useRef(onTagsCountChange);
  useEffect(() => {
    onTagsCountChangeRef.current = onTagsCountChange;
  }, [onTagsCountChange]);

  // ────────────────────────────────────────────────────────────────────
  // Page Load: DB-only tag fetch — triggers ONCE on mount / channel change
  // Zero automatic PLC traffic. Live sync only triggers upon user request.
  // ────────────────────────────────────────────────────────────────────
  const loadDbTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const tags = await networkService.getTags(channel.id);
      setMonitoredTags(tags);
      setBrowsedTags(tags);
      onTagsCountChangeRef.current?.(channel.id, tags.length);
      setViewFilter('MONITORED_ONLY');
      const availableFolders = Array.from(new Set(tags.map(t => t.folder)));
      setSelectedFolder(prev => availableFolders.includes(prev) ? prev : (availableFolders[0] || ''));
    } catch (err) {
      console.error('Error loading DB tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [channel.id]);

  useEffect(() => {
    loadDbTags();
  }, [loadDbTags]);


  // ────────────────────────────────────────────────────────────────────
  // Discover Tags: Full recursive OPC UA browse (user-initiated only)
  // ────────────────────────────────────────────────────────────────────
  const handleDiscover = useCallback(async () => {
    if (isDiscovering) return;
    setShowDiscoverConfirm(false);
    setIsDiscovering(true);
    try {
      const discovered = await networkService.browseTags(channel.id);
      if (discovered && discovered.length > 0) {
        const merged: DeviceTag[] = [];
        const processedNodeIds = new Set<string>();

        for (const dt of discovered) {
          processedNodeIds.add(dt.nodeId);
          const existing = monitoredTags.find(m => m.nodeId === dt.nodeId);
          if (existing) {
            merged.push({ ...existing, isMonitored: true });
          } else {
            merged.push({ ...dt, isMonitored: false });
          }
        }

        for (const mt of monitoredTags) {
          if (!processedNodeIds.has(mt.nodeId)) {
            merged.push({
              ...mt,
              isMonitored: true,
              quality: 'MISSING (0x80330000 - Bad_NodeIdUnknown)'
            });
          }
        }

        setBrowsedTags(merged);
        setViewFilter('ALL_BROWSED');
        setIsChannelOnline(true);
        const availableFolders = Array.from(new Set(merged.map(t => t.folder)));
        setSelectedFolder(prev => availableFolders.includes(prev) ? prev : (availableFolders[0] || ''));
      } else {
        const health = await networkService.checkChannelHealth(channel.id);
        setIsChannelOnline(health.reachable);
      }
    } catch (err) {
      console.error('Discover tags error:', err);
    } finally {
      setIsDiscovering(false);
    }
  }, [channel.id, isDiscovering, monitoredTags]);


  // ────────────────────────────────────────────────────────────────────
  // Monitored Watchlist & Acquisition Config Toggles (Supports UDT Cascade)
  // ────────────────────────────────────────────────────────────────────
  const handleDeleteTag = async (tag: DeviceTag) => {
    try {
      const identifier = tag.id || tag.nodeId;
      await networkService.removeMonitoredTag(channel.id, identifier, tag.nodeId);
      setMonitoredTags(prev => {
        const next = prev.filter(t => t.nodeId !== tag.nodeId && (!tag.id || t.id !== tag.id));
        onTagsCountChange?.(channel.id, next.length);
        return next;
      });
      setBrowsedTags(prev => prev.map(t => (t.nodeId === tag.nodeId || (tag.id && t.id === tag.id)) ? { ...t, isMonitored: false } : t));
    } catch (err) {
      console.error('Failed to delete tag:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  const handleClearAllTags = async () => {
    if (!window.confirm(`Are you sure you want to remove all monitored tags for channel "${channel.name}"?`)) {
      return;
    }
    try {
      await networkService.removeAllMonitoredTags(channel.id);
      setMonitoredTags([]);
      onTagsCountChange?.(channel.id, 0);
      setBrowsedTags(prev => prev.map(t => ({ ...t, isMonitored: false })));
    } catch (err) {
      console.error('Failed to clear tags:', err);
      alert(err instanceof Error ? err.message : 'Failed to clear tags');
    }
  };

  const handleToggleMonitor = async (tag: DeviceTag) => {
    const isCurrentlyMonitored = Boolean(tag.isMonitored ?? monitoredTags.some(m => m.nodeId === tag.nodeId));
    if (isCurrentlyMonitored) {
      await handleDeleteTag(tag);
    } else {
      try {
        const newTag = await networkService.addMonitoredTag(channel.id, {
          ...tag,
          isMonitored: true,
          acquisitionMethod: tag.acquisitionMethod || 'SUBSCRIPTION'
        });

        // Cascade save ALL descendant children across all levels (Level 1, 2, 3...)
        const collectDescendants = (parentNodeId: string): DeviceTag[] => {
          const res: DeviceTag[] = [];
          const queue = [...(childrenByParentNodeId.get(parentNodeId) ?? [])];
          while (queue.length > 0) {
            const current = queue.shift()!;
            res.push(current);
            const subChildren = childrenByParentNodeId.get(current.nodeId);
            if (subChildren && subChildren.length > 0) {
              queue.push(...subChildren);
            }
          }
          return res;
        };

        const allDescendants = collectDescendants(tag.nodeId);
        const savedChildren: DeviceTag[] = [];
        const idMap = new Map<string, string>();
        idMap.set(tag.nodeId, newTag.id || tag.nodeId);

        for (const child of allDescendants) {
          try {
            const pId = (child.parentTagId && idMap.get(child.parentTagId)) || child.parentTagId || newTag.id || tag.nodeId;
            const sc = await networkService.addMonitoredTag(channel.id, {
              ...child,
              isMonitored: true,
              parentTagId: pId,
              isUdtMember: true,
              acquisitionMethod: child.acquisitionMethod || tag.acquisitionMethod || 'SUBSCRIPTION'
            });
            idMap.set(child.nodeId, sc.id || child.nodeId);
            savedChildren.push(sc);
          } catch {
            // Ignore individual child save error
          }
        }

        setMonitoredTags(prev => {
          const next = [...prev, newTag, ...savedChildren];
          onTagsCountChange?.(channel.id, next.length);
          return next;
        });

        const savedNodeIds = new Set([tag.nodeId, ...savedChildren.map(c => c.nodeId)]);
        setBrowsedTags(prev => prev.map(t => savedNodeIds.has(t.nodeId) ? { ...t, isMonitored: true } : t));
      } catch (err) {
        console.error('Failed to add monitored tag:', err);
      }
    }
  };

  const handleAcquisitionMethodChange = async (tag: DeviceTag, newMethod: AcquisitionMethod) => {
    setMonitoredTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, acquisitionMethod: newMethod } : t));
    setBrowsedTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, acquisitionMethod: newMethod } : t));

    const identifier = tag.id || tag.nodeId;
    await networkService.updateTagAcquisitionConfig(channel.id, identifier, {
      acquisitionMethod: newMethod
    });
  };

  const handleToggleLogging = async (tag: DeviceTag) => {
    const newStatus = !tag.isLoggingEnabled;
    setMonitoredTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, isLoggingEnabled: newStatus } : t));
    setBrowsedTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, isLoggingEnabled: newStatus } : t));

    const identifier = tag.id || tag.nodeId;
    await networkService.updateTagAcquisitionConfig(channel.id, identifier, {
      isLoggingEnabled: newStatus
    });
  };

  // ────────────────────────────────────────────────────────────────────
  // Write to single tag or single UDT member
  // ────────────────────────────────────────────────────────────────────
  const handleOpenWriteModal = (tag: DeviceTag) => {
    setEditingTag(tag);
    setNewValue(tag.value !== undefined && tag.value !== null ? (typeof tag.value === 'object' ? JSON.stringify(tag.value) : String(tag.value)) : '');
    setWriteFeedback(null);
  };

  const handleExecuteWrite = async () => {
    if (!editingTag) return;
    setIsWriting(true);
    setWriteFeedback(null);
    try {
      let parsedVal: unknown = newValue;
      if (editingTag.dataType === 'Boolean') {
        parsedVal = newValue.toLowerCase() === 'true' || newValue === '1';
      } else if (editingTag.dataType === 'Int16' || editingTag.dataType === 'Int32' || editingTag.dataType === 'Int64') {
        parsedVal = parseInt(newValue, 10);
      } else if (editingTag.dataType === 'Float' || editingTag.dataType === 'Double') {
        parsedVal = parseFloat(newValue);
      } else if (editingTag.dataType === 'Variant' || typeof editingTag.value === 'object') {
        try {
          parsedVal = JSON.parse(newValue);
        } catch {
          parsedVal = newValue;
        }
      }

      await networkService.writeTag(channel.id, editingTag.nodeId, parsedVal);

      if (editingTag.nodeId.includes('#')) {
        const hashIdx = editingTag.nodeId.indexOf('#');
        const parentNid = editingTag.nodeId.substring(0, hashIdx);
        const memberKey = editingTag.nodeId.substring(hashIdx + 1);

        const updateUdt = (t: DeviceTag): DeviceTag => {
          if (t.nodeId === parentNid && typeof t.value === 'object' && t.value !== null) {
            const updated = Array.isArray(t.value)
              ? [...t.value]
              : { ...(t.value as Record<string, unknown>), [memberKey]: parsedVal };
            return { ...t, value: updated };
          }
          return t;
        };

        setBrowsedTags(prev => prev.map(updateUdt));
        setMonitoredTags(prev => prev.map(updateUdt));
      } else {
        setBrowsedTags(prev => prev.map(t => t.nodeId === editingTag.nodeId ? { ...t, value: parsedVal } : t));
        setMonitoredTags(prev => prev.map(t => t.nodeId === editingTag.nodeId ? { ...t, value: parsedVal } : t));
      }

      setWriteFeedback({ success: true, message: 'Write executed successfully' });
      setTimeout(() => {
        setEditingTag(null);
        setWriteFeedback(null);
      }, 1200);
    } catch (err: unknown) {
      setWriteFeedback({ success: false, message: err instanceof Error ? err.message : 'Write failed' });
    } finally {
      setIsWriting(false);
    }
  };

  const activeSourceTags = viewFilter === 'MONITORED_ONLY' ? monitoredTags : browsedTags;

  const folders = useMemo(() => {
    const list = Array.from(new Set(activeSourceTags.map(t => t.folder))).filter(Boolean);
    return list.sort();
  }, [activeSourceTags]);

  // Build parent→children map from DB-level UDT hierarchy (parentTagId / isUdtMember)
  const { topLevelTags, childrenByParentNodeId } = useMemo(() => {
    const childMap = new Map<string, DeviceTag[]>();
    const topLevel: DeviceTag[] = [];

    // O(N) indexing for instantaneous parent lookups
    const tagById = new Map<string, DeviceTag>();
    const tagByNodeId = new Map<string, DeviceTag>();
    for (const tag of activeSourceTags) {
      if (tag.id) tagById.set(tag.id, tag);
      if (tag.nodeId) tagByNodeId.set(tag.nodeId, tag);
    }

    for (const tag of activeSourceTags) {
      if (tag.isUdtMember && tag.parentTagId) {
        const parent = tagById.get(tag.parentTagId) ?? tagByNodeId.get(tag.parentTagId);
        const parentKey = parent?.nodeId ?? tag.parentTagId;
        const existing = childMap.get(parentKey) ?? [];
        existing.push(tag);
        childMap.set(parentKey, existing);
      }
    }

    for (const tag of activeSourceTags) {
      if (!tag.isUdtMember) {
        topLevel.push(tag);
      }
    }

    return { topLevelTags: topLevel, childrenByParentNodeId: childMap };
  }, [activeSourceTags]);

  // Breadcrumb path computation from selectedFolder
  const breadcrumbSegments = useMemo(() => {
    if (!selectedFolder) return [{ label: 'All Folders', path: '' }];
    const parts = selectedFolder.split('/').filter(Boolean);
    const result = [{ label: 'Root', path: '' }];
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      result.push({ label: part, path: acc });
    }
    return result;
  }, [selectedFolder]);

  // Filtering: combines folder match, search query, and per-column filters
  const filteredTags = useMemo(() => {
    const hasColFilters = Object.values(colFilters).some(v => Boolean(v && v.trim()));

    return topLevelTags.filter(tag => {
      const matchFolder = !selectedFolder || tag.folder === selectedFolder || tag.folder.startsWith(selectedFolder + '/');
      if (!matchFolder) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchGlobal = tag.name.toLowerCase().includes(q) || tag.nodeId.toLowerCase().includes(q);
        if (!matchGlobal) {
          const children = childrenByParentNodeId.get(tag.nodeId) ?? [];
          const childMatches = children.some(c =>
            c.name.toLowerCase().includes(q) || c.nodeId.toLowerCase().includes(q)
          );
          if (!childMatches) return false;
        }
      }

      if (hasColFilters) {
        if (colFilters.name && !tag.name.toLowerCase().includes(colFilters.name.toLowerCase())) {
          const children = childrenByParentNodeId.get(tag.nodeId) ?? [];
          if (!children.some(c => c.name.toLowerCase().includes(colFilters.name.toLowerCase()))) {
            return false;
          }
        }
        if (colFilters.nodeId && !tag.nodeId.toLowerCase().includes(colFilters.nodeId.toLowerCase())) {
          const children = childrenByParentNodeId.get(tag.nodeId) ?? [];
          if (!children.some(c => c.nodeId.toLowerCase().includes(colFilters.nodeId.toLowerCase()))) {
            return false;
          }
        }
        if (colFilters.dataType && !tag.dataType.toLowerCase().includes(colFilters.dataType.toLowerCase())) {
          return false;
        }
        if (colFilters.quality && !(tag.quality ?? '').toLowerCase().includes(colFilters.quality.toLowerCase())) {
          return false;
        }
        if (colFilters.value && !String(tag.value ?? '').toLowerCase().includes(colFilters.value.toLowerCase())) {
          return false;
        }
        if (colFilters.acquisitionMethod && !(tag.acquisitionMethod ?? 'SUBSCRIPTION').toLowerCase().includes(colFilters.acquisitionMethod.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [topLevelTags, childrenByParentNodeId, selectedFolder, searchQuery, colFilters]);

  // ────────────────────────────────────────────────────────────────────
  // Sync with Device: Batch-reads live values from PLC
  // ────────────────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (viewFilter === 'MONITORED_ONLY' && monitoredTags.length > 0) {
        const synced = await networkService.syncTagValues(channel.id);
        if (synced && synced.length > 0) {
          setMonitoredTags(synced);
          setBrowsedTags(prev => {
            const syncMap = new Map(synced.map(s => [s.nodeId, s]));
            return prev.map(t => {
              const found = syncMap.get(t.nodeId);
              return found ? { ...t, ...found } : t;
            });
          });
          const hasBad = synced.some(t => t.quality?.startsWith('BAD'));
          setIsChannelOnline(!hasBad);
        }
      } else {
        // Read live values for currently browsed / visible tags
        const nodeIdsToRead: string[] = [];
        for (const tag of filteredTags.slice(0, 100)) {
          if (!tag.isUdt) nodeIdsToRead.push(tag.nodeId);
          const children = childrenByParentNodeId.get(tag.nodeId) ?? [];
          for (const c of children) {
            nodeIdsToRead.push(c.nodeId);
          }
        }
        if (nodeIdsToRead.length > 0) {
          const live = await networkService.readLiveValues(channel.id, nodeIdsToRead.slice(0, 100));
          if (live && live.length > 0) {
            const syncMap = new Map(live.map(s => [s.nodeId, s]));
            const apply = (t: DeviceTag): DeviceTag => {
              const u = syncMap.get(t.nodeId);
              return u ? { ...t, value: u.value, quality: u.quality, timestamp: u.timestamp } : t;
            };
            setBrowsedTags(prev => prev.map(apply));
            setMonitoredTags(prev => prev.map(apply));
            setIsChannelOnline(true);
          }
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
      setIsChannelOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, [channel.id, isSyncing, viewFilter, monitoredTags.length, filteredTags, childrenByParentNodeId]);

  // Real-Time Live Telemetry: SSE push for monitored tags + cyclic poll for visible/expanded tags
  useLiveTelemetry({
    channelId: channel.id,
    isOnline: isChannelOnline,
    visibleTags: filteredTags,
    expandedTags: expandedUdtTags,
    childrenByParentNodeId,
    setMonitoredTags,
    setBrowsedTags,
    setIsChannelOnline
  });

  const missingCount = activeSourceTags.filter(t => t.quality?.startsWith('MISSING')).length;
  const activeColFilterCount = Object.values(colFilters).filter(Boolean).length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isSidebarCollapsed ? '42px 1fr' : '270px 1fr',
        height: 'calc(100vh - 230px)',
        minHeight: '600px',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.2s ease'
      }}
    >
      {/* Left Tree Explorer (Collapsible) */}
      <AddressSpaceTree
        channelName={channel.name}
        protocol={channel.protocol}
        folders={folders}
        selectedFolder={selectedFolder}
        activeSourceTags={activeSourceTags}
        isCollapsed={isSidebarCollapsed}
        isLoading={isLoading}
        onSelectFolder={setSelectedFolder}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Right Tag Table Explorer */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        {/* Top Action Bar */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              padding: '4px 10px',
              width: '240px'
            }}
          >
            <Search size={14} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search tags or NodeIds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                width: '100%'
              }}
            />
          </div>

          {/* Filter Pills & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: '2px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setViewFilter('MONITORED_ONLY')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewFilter === 'MONITORED_ONLY' ? 'var(--bg-surface)' : 'transparent',
                  color: viewFilter === 'MONITORED_ONLY' ? '#3B82F6' : 'var(--text-secondary)',
                  boxShadow: viewFilter === 'MONITORED_ONLY' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  minHeight: '26px'
                }}
              >
                Monitored ({monitoredTags.length})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('ALL_BROWSED')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewFilter === 'ALL_BROWSED' ? 'var(--bg-surface)' : 'transparent',
                  color: viewFilter === 'ALL_BROWSED' ? '#3B82F6' : 'var(--text-secondary)',
                  boxShadow: viewFilter === 'ALL_BROWSED' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  minHeight: '26px'
                }}
              >
                All Browsed ({browsedTags.length})
              </button>
            </div>

            {/* Column Filters Toggle Button (matches MasterDataView style) */}
            <button
              type="button"
              onClick={() => setShowColFilters(prev => !prev)}
              title="Toggle column-level search filters"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: activeColFilterCount > 0 ? '1px solid #3B82F6' : '1px solid var(--border-default)',
                backgroundColor: showColFilters ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-subtle)',
                color: showColFilters || activeColFilterCount > 0 ? '#60A5FA' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '32px'
              }}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {activeColFilterCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '9.5px',
                    padding: '1px 5px',
                    fontWeight: 700
                  }}
                >
                  {activeColFilterCount}
                </span>
              )}
            </button>

            {/* Clear Filters if active */}
            {activeColFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setColFilters({})}
                title="Reset all column filters"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  minHeight: '32px'
                }}
              >
                <FilterX size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Discover Tags Button */}
            <button
              type="button"
              onClick={() => { if (!isDiscovering) setShowDiscoverConfirm(true); }}
              disabled={isDiscovering}
              title="Initiates full address-space discovery from OPC UA server"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #059669',
                backgroundColor: isDiscovering ? 'rgba(5, 150, 105, 0.2)' : '#059669',
                color: '#fff',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: isDiscovering ? 'not-allowed' : 'pointer',
                opacity: isDiscovering ? 0.7 : 1,
                minHeight: '32px'
              }}
            >
              <Radar size={13} className={isDiscovering ? 'spin' : ''} />
              <span>{isDiscovering ? 'Discovering...' : 'Discover Tags'}</span>
            </button>

            {/* Sync with Device Button */}
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              title="Reads live values from PLC for tags currently stored in DB"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: isSyncing ? '#3B82F6' : 'var(--text-primary)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                minHeight: '32px'
              }}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with Device'}</span>
            </button>

            {/* Clear All Tags Button */}
            {monitoredTags.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllTags}
                title="Remove all monitored tags from database for this channel"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '32px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <Trash2 size={13} />
                <span>Clear All Tags</span>
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb Path Bar (Address Space Depth Indicator) */}
        <div
          style={{
            padding: '6px 14px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-default)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          <Folder size={12} color="#3B82F6" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Address Space:</span>
          {breadcrumbSegments.map((segment, index) => (
            <React.Fragment key={segment.path || 'root'}>
              {index > 0 && <ChevronRight size={11} color="var(--text-secondary)" style={{ opacity: 0.6 }} />}
              <button
                type="button"
                onClick={() => setSelectedFolder(segment.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  color: index === breadcrumbSegments.length - 1 ? '#60A5FA' : 'var(--text-secondary)',
                  fontWeight: index === breadcrumbSegments.length - 1 ? 700 : 500,
                  fontSize: '11px'
                }}
              >
                {segment.label}
              </button>
            </React.Fragment>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.8 }}>
            Showing {filteredTags.length} tag{filteredTags.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Offline Alarm Banner */}
        {!isChannelOnline && (
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '11.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>
              <strong>COMMUNICATION FAILURE: </strong>
              Target server <code>{channel.endpointUrl}</code> is unreachable. Tag quality is <strong>BAD</strong>.
            </span>
          </div>
        )}

        {/* MISSING Tags Banner */}
        {missingCount > 0 && (
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.10)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#F59E0B',
              fontSize: '11.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
            <span>
              <strong>{missingCount} tag{missingCount > 1 ? 's' : ''} MISSING: </strong>
              Tag exists in DB but was not found on the OPC UA server.
            </span>
          </div>
        )}

        {/* Live Tag Table with Horizontal Scroll & Recursive UDT Tree */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Loading tags from database...
            </div>
          ) : filteredTags.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              <Database size={32} color="var(--text-secondary)" />
              <div>No tags matching current filter.</div>
              {viewFilter === 'MONITORED_ONLY' && monitoredTags.length === 0 && (
                <button
                  type="button"
                  onClick={() => { if (!isDiscovering) setShowDiscoverConfirm(true); }}
                  disabled={isDiscovering}
                  style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: '#059669', color: '#fff', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600, minHeight: '32px' }}
                >
                  <Radar size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Discover Tags from OPC UA Server
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '1300px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <LiveTagTableFilterHeader
                showColFilters={showColFilters}
                colFilters={colFilters}
                onColFilterChange={(key, val) => setColFilters(prev => ({ ...prev, [key]: val }))}
              />
              <tbody>
                {filteredTags.map(tag => {
                  const isMonitored = Boolean(tag.isMonitored ?? monitoredTags.some(m => m.nodeId === tag.nodeId));

                  return (
                    <LiveTagTableRow
                      key={tag.nodeId}
                      tag={tag}
                      depth={0}
                      isMonitored={isMonitored}
                      expandedTags={expandedUdtTags}
                      childMap={childrenByParentNodeId}
                      onToggleExpand={toggleExpandUdt}
                      onOpenWriteModal={handleOpenWriteModal}
                      onToggleMonitor={handleToggleMonitor}
                      onDeleteTag={handleDeleteTag}
                      onAcquisitionMethodChange={handleAcquisitionMethodChange}
                      onToggleLogging={handleToggleLogging}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Discover Confirmation Modal */}
      {showDiscoverConfirm && (
        <DiscoverConfirmModal
          channelName={channel.name}
          isDiscovering={isDiscovering}
          onConfirm={handleDiscover}
          onCancel={() => setShowDiscoverConfirm(false)}
        />
      )}

      {/* Tag Write Modal */}
      {editingTag && (
        <TagWriteModal
          tag={editingTag}
          newValue={newValue}
          isWriting={isWriting}
          writeFeedback={writeFeedback}
          onNewValueChange={setNewValue}
          onExecuteWrite={handleExecuteWrite}
          onClose={() => { setEditingTag(null); setWriteFeedback(null); }}
        />
      )}
    </div>
  );
};
