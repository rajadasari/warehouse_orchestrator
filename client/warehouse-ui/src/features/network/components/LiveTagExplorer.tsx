import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FolderTree,
  Search, 
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  BookmarkPlus,
  BookmarkCheck
} from 'lucide-react';
import { DeviceTag, NetworkDeviceChannel, AcquisitionMethod } from '../types';
import { networkService } from '../networkService';

interface LiveTagExplorerProps {
  channel: NetworkDeviceChannel;
}

type ViewFilter = 'ALL_BROWSED' | 'MONITORED_ONLY';

export const LiveTagExplorer: React.FC<LiveTagExplorerProps> = ({ channel }) => {
  const [browsedTags, setBrowsedTags] = useState<DeviceTag[]>([]);
  const [monitoredTags, setMonitoredTags] = useState<DeviceTag[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('ALL_BROWSED');
  const [editingTag, setEditingTag] = useState<DeviceTag | null>(null);
  const [newValue, setNewValue] = useState<string>('');
  const [isWriting, setIsWriting] = useState(false);
  const [writeFeedback, setWriteFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isChannelOnline, setIsChannelOnline] = useState<boolean>(channel.status === 'ONLINE');

  // Unified Synchronization Handler:
  // Disables sync button during execution, crawls live address space and syncs with DB. Zero background polling!
  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await networkService.syncChannelData(channel.id);
      if (synced && synced.length > 0) {
        setBrowsedTags(synced);
        setMonitoredTags(synced.filter(t => Boolean(t.isMonitored)));
        setIsChannelOnline(true);
        const availableFolders = Array.from(new Set(synced.map(t => t.folder)));
        setSelectedFolder(prev => availableFolders.includes(prev) ? prev : (availableFolders[0] || ''));
      } else {
        const health = await networkService.checkChannelHealth(channel.id);
        setIsChannelOnline(health.reachable);
        if (!health.reachable) {
          setBrowsedTags(prev => prev.map(bt => ({
            ...bt,
            quality: 'BAD (0x80050000 - Bad_CommunicationFailure)'
          })));
          setMonitoredTags(prev => prev.map(mt => ({
            ...mt,
            quality: 'BAD (0x80050000 - Bad_CommunicationFailure)'
          })));
        }
      }
    } catch (err) {
      console.error('Error synchronizing device data:', err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [channel.id, isSyncing]);

  // Initial load: trigger sync once on mount
  useEffect(() => {
    handleSync();
  }, []); // Run strictly once on mount - zero continuous background polling intervals

  // Real-time Push Subscription Stream (SSE):
  // Receives live DataChangeNotifications pushed by Milo without continuous HTTP polling
  useEffect(() => {
    const sse = networkService.createTelemetryStream(channel.id, (update) => {
      setBrowsedTags(prev => prev.map(t => {
        if (t.nodeId === update.nodeId) {
          return {
            ...t,
            value: update.value !== undefined ? update.value : t.value,
            quality: update.quality || t.quality,
            timestamp: update.timestamp || t.timestamp
          };
        }
        return t;
      }));
      setMonitoredTags(prev => prev.map(t => {
        if (t.nodeId === update.nodeId) {
          return {
            ...t,
            value: update.value !== undefined ? update.value : t.value,
            quality: update.quality || t.quality,
            timestamp: update.timestamp || t.timestamp
          };
        }
        return t;
      }));
    });

    return () => {
      sse.close();
    };
  }, [channel.id]);

  // Toggle Monitored Tag (+ / -)
  const handleToggleMonitor = async (tag: DeviceTag) => {
    const existing = monitoredTags.find(m => m.nodeId === tag.nodeId || (m.id && m.id === tag.id));
    const isCurrentlyMonitored = Boolean(existing || tag.isMonitored);
    try {
      if (isCurrentlyMonitored) {
        const idToDelete = (existing && existing.id) ? existing.id : tag.id;
        await networkService.removeMonitoredTag(channel.id, idToDelete, tag.nodeId);
        setMonitoredTags(prev => prev.filter(m => m.nodeId !== tag.nodeId && m.id !== idToDelete));
        setBrowsedTags(prev => prev.map(b => b.nodeId === tag.nodeId ? { ...b, isMonitored: false, subscribed: false } : b));
      } else {
        const added = await networkService.addMonitoredTag(channel.id, {
          ...tag,
          acquisitionMethod: tag.acquisitionMethod || 'SUBSCRIPTION',
          isLoggingEnabled: tag.isLoggingEnabled ?? false
        });
        const savedTag = { ...added, isMonitored: true, subscribed: true };
        setMonitoredTags(prev => [...prev, savedTag]);
        setBrowsedTags(prev => prev.map(b => b.nodeId === tag.nodeId ? { ...b, ...savedTag } : b));
      }
    } catch (err) {
      console.error('Failed to toggle monitored tag:', err);
    }
  };

  // Update Acquisition Method (Default SUBSCRIPTION, POLLED_READ, HISTORICAL_ACCESS, PUBSUB_BROKER)
  const handleAcquisitionMethodChange = async (tag: DeviceTag, newMethod: AcquisitionMethod) => {
    try {
      setBrowsedTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, acquisitionMethod: newMethod } : t));
      setMonitoredTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, acquisitionMethod: newMethod } : t));

      const isMonitored = Boolean(tag.isMonitored || monitoredTags.some(m => m.nodeId === tag.nodeId));
      if (isMonitored) {
        await networkService.updateTagAcquisitionConfig(channel.id, tag.id || tag.nodeId, {
          acquisitionMethod: newMethod
        });
      }
    } catch (err) {
      console.error('Failed to update acquisition method:', err);
    }
  };

  // Toggle Tag Logging to DB (isLoggingEnabled)
  const handleToggleLogging = async (tag: DeviceTag) => {
    const nextVal = !tag.isLoggingEnabled;
    try {
      setBrowsedTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, isLoggingEnabled: nextVal } : t));
      setMonitoredTags(prev => prev.map(t => t.nodeId === tag.nodeId ? { ...t, isLoggingEnabled: nextVal } : t));

      const isMonitored = Boolean(tag.isMonitored || monitoredTags.some(m => m.nodeId === tag.nodeId));
      if (isMonitored) {
        await networkService.updateTagAcquisitionConfig(channel.id, tag.id || tag.nodeId, {
          isLoggingEnabled: nextVal
        });
      }
    } catch (err) {
      console.error('Failed to toggle logging:', err);
    }
  };

  const activeSourceTags = viewFilter === 'MONITORED_ONLY' ? monitoredTags : (browsedTags.length > 0 ? browsedTags : monitoredTags);
  const folders = Array.from(new Set(activeSourceTags.map(t => t.folder)));

  const filteredTags = activeSourceTags.filter(t => {
    const matchesFolder = !selectedFolder || t.folder === selectedFolder;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.nodeId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const handleOpenWrite = (tag: DeviceTag) => {
    setEditingTag(tag);
    setNewValue(String(tag.value ?? ''));
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
      } else if (editingTag.dataType.includes('Int') || editingTag.dataType === 'Float') {
        parsedVal = Number(newValue);
      }
      const res = await networkService.writeTag(channel.id, editingTag.nodeId, parsedVal);
      setWriteFeedback({ success: res.success, message: res.message });
      if (res.success) {
        setBrowsedTags(prev => prev.map(t => t.nodeId === editingTag.nodeId ? { ...t, value: parsedVal, timestamp: new Date().toISOString() } : t));
        setMonitoredTags(prev => prev.map(t => t.nodeId === editingTag.nodeId ? { ...t, value: parsedVal, timestamp: new Date().toISOString() } : t));
        setTimeout(() => {
          setEditingTag(null);
          setWriteFeedback(null);
        }, 1200);
      }
    } catch (err: unknown) {
      setWriteFeedback({ success: false, message: err instanceof Error ? err.message : 'Write failed' });
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '270px 1fr',
      height: '620px',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-surface)',
      overflow: 'hidden'
    }}>
      {/* Left Tree Explorer (Live Address Space Hierarchy) */}
      <div style={{
        borderRight: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface-subtle)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-default)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="#3B82F6" />
            <span>Address Space</span>
          </div>
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: '#60A5FA',
            fontWeight: 500
          }}>
            IEC 62541
          </span>
        </div>

        <div style={{ padding: '8px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 6px', fontWeight: 600 }}>
            {channel.name} ({channel.protocol})
          </div>

          {folders.length === 0 && !isLoading && (
            <div style={{ padding: '16px 8px', fontSize: '11.5px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              No tag groups found.
            </div>
          )}

          {folders.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFolder('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !selectedFolder ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: !selectedFolder ? '#3B82F6' : 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <FolderTree size={15} color={!selectedFolder ? '#3B82F6' : 'var(--text-secondary)'} />
              <span style={{ fontWeight: !selectedFolder ? 600 : 400, flex: 1 }}>All Folders & UDTs</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {activeSourceTags.length}
              </span>
            </button>
          )}

          {folders.map(folder => {
            const isSelected = selectedFolder === folder;
            const count = activeSourceTags.filter(t => t.folder === folder).length;
            return (
              <button
                key={folder}
                type="button"
                onClick={() => setSelectedFolder(folder)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isSelected ? '#3B82F6' : 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {isSelected ? <FolderOpen size={15} color="#3B82F6" /> : <Folder size={15} color="var(--text-secondary)" />}
                <span style={{ fontWeight: isSelected ? 600 : 400, flex: 1 }}>{folder}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Live Tag Table */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Filter & View Mode Bar */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedFolder || 'All Device Tags'}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              ({filteredTags.length} tags)
            </span>

            {/* View Mode Toggle: All Browsed vs Monitored Watchlist */}
            <div style={{ display: 'flex', marginLeft: '12px', border: '1px solid var(--border-default)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewFilter('ALL_BROWSED')}
                style={{
                  padding: '3px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: viewFilter === 'ALL_BROWSED' ? '#3B82F6' : 'transparent',
                  color: viewFilter === 'ALL_BROWSED' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                All Live Nodes ({browsedTags.length})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('MONITORED_ONLY')}
                style={{
                  padding: '3px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: viewFilter === 'MONITORED_ONLY' ? '#10B981' : 'transparent',
                  color: viewFilter === 'MONITORED_ONLY' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Watchlist ({monitoredTags.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Filter tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px'
                }}
              />
            </div>

            {/* Single Unified Sync Button with in-progress lock */}
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              title={isSyncing ? "Sync in progress..." : "Synchronize live OPC-UA address space with database registry"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #3B82F6',
                backgroundColor: isSyncing ? 'rgba(59, 130, 246, 0.4)' : '#2563EB',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Device Data'}</span>
            </button>
          </div>
        </div>

        {/* Offline / Communication Failure Alarm Banner (IEC 62443 / IEC 62541) */}
        {!isChannelOnline && (
          <div style={{
            padding: '8px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>
              <strong>COMMUNICATION FAILURE: </strong>
              Target server <code>{channel.endpointUrl}</code> is unreachable (Socket closed / Timeout). Tag quality is <strong>BAD (0x80050000 - Bad_CommunicationFailure)</strong>. Values are stale and setpoint writes are locked.
            </span>
          </div>
        )}

        {/* Live Tag Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Connecting to OPC-UA device...
            </div>
          ) : filteredTags.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              <Database size={32} color="var(--text-secondary)" />
              <div>No tags matching current filter.</div>
              {viewFilter === 'MONITORED_ONLY' && (
                <button
                  type="button"
                  onClick={() => setViewFilter('ALL_BROWSED')}
                  style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: '#3B82F6', color: '#fff', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                >
                  View All Live Nodes & Add with (+)
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px' }}>Tag Name</th>
                  <th style={{ padding: '8px 12px' }}>NodeId / Address</th>
                  <th style={{ padding: '8px 12px' }}>Data Type</th>
                  <th style={{ padding: '8px 12px' }}>Quality Watchdog</th>
                  <th style={{ padding: '8px 12px' }}>Live Value</th>
                  <th style={{ padding: '8px 12px' }}>Acquisition Method</th>
                  <th style={{ padding: '8px 12px' }}>Log to DB</th>
                  <th style={{ padding: '8px 12px' }}>Timestamp</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map(tag => {
                  const isMonitored = Boolean(tag.isMonitored ?? monitoredTags.some(m => m.nodeId === tag.nodeId));
                  const isQualityGood = tag.quality?.startsWith('GOOD');
                  const isQualityBad = tag.quality?.startsWith('BAD');

                  return (
                    <tr key={tag.nodeId} style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color 0.1s ease' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {tag.name}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px' }}>
                        {tag.nodeId}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#93C5FD' }}>
                        {tag.dataType}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {/* Dynamic Quality Badge: Red if BAD, Green if GOOD, Amber if Uncertain */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: isQualityGood ? 'rgba(16, 185, 129, 0.12)' : (isQualityBad ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)'),
                          color: isQualityGood ? '#10B981' : (isQualityBad ? '#EF4444' : '#F59E0B'),
                          border: `1px solid ${isQualityGood ? 'rgba(16, 185, 129, 0.3)' : (isQualityBad ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)')}`
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isQualityGood ? '#10B981' : (isQualityBad ? '#EF4444' : '#F59E0B')
                          }} />
                          {isQualityGood ? 'GOOD' : (isQualityBad ? 'BAD (COMM_FAILURE)' : 'UNCERTAIN')}
                        </span>
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: !isQualityGood 
                          ? 'var(--text-secondary)' 
                          : (typeof tag.value === 'boolean' ? (tag.value ? '#10B981' : '#EF4444') : '#38BDF8')
                      }}>
                        {String(tag.value ?? '—')}
                      </td>
                      {/* Acquisition Method Selector */}
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          value={tag.acquisitionMethod || 'SUBSCRIPTION'}
                          onChange={(e) => handleAcquisitionMethodChange(tag, e.target.value as AcquisitionMethod)}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
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
                      </td>
                      {/* Log to DB Toggle */}
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleLogging(tag)}
                          title={tag.isLoggingEnabled ? "Logging to DB enabled. Click to disable." : "Logging disabled. Click to enable logging."}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: `1px solid ${tag.isLoggingEnabled ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-default)'}`,
                            backgroundColor: tag.isLoggingEnabled ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            color: tag.isLoggingEnabled ? '#10B981' : 'var(--text-secondary)',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: tag.isLoggingEnabled ? '#10B981' : 'var(--text-secondary)'
                          }} />
                          <span>{tag.isLoggingEnabled ? 'LOG ON' : 'LOG OFF'}</span>
                        </button>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '10.5px' }}>
                        {tag.timestamp ? (tag.timestamp.includes('T') ? tag.timestamp.split('T')[1].slice(0, 8) : tag.timestamp) : 'Just now'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* (+) / (-) Watchlist Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleMonitor(tag)}
                            title={isMonitored ? 'Remove from monitored database list' : 'Add to monitored database list (+)'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${isMonitored ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                              backgroundColor: isMonitored ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: isMonitored ? '#EF4444' : '#10B981',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {isMonitored ? <BookmarkCheck size={12} /> : <BookmarkPlus size={12} />}
                            <span>{isMonitored ? '– Watchlist' : '+ Watchlist'}</span>
                          </button>

                          {/* Write Button (Disabled if connection is BAD / offline) */}
                          {tag.writable && (
                            <button
                              type="button"
                              onClick={() => handleOpenWrite(tag)}
                              disabled={!isQualityGood}
                              title={!isQualityGood ? 'Device connection is offline - write disabled' : 'Write setpoint to tag'}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: isQualityGood ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                                color: isQualityGood ? '#3B82F6' : 'var(--text-secondary)',
                                fontSize: '11px',
                                cursor: isQualityGood ? 'pointer' : 'not-allowed',
                                opacity: isQualityGood ? 1 : 0.5
                              }}
                            >
                              Write
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Status Ribbon (Live Quality Status) */}
        <div style={{
          padding: '6px 14px',
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span>
              <strong>Status: </strong>
              <span style={{ color: isChannelOnline ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {isChannelOnline ? 'ONLINE' : 'DISCONNECTED'}
              </span>
            </span>
            <span><strong>Channel:</strong> {channel.channelCode || channel.name}</span>
            <span><strong>Endpoint:</strong> {channel.endpointUrl}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span><strong>{monitoredTags.length}</strong> Saved in Watchlist</span>
            <span><strong>{browsedTags.length}</strong> Discovered Live Nodes</span>
          </div>
        </div>
      </div>

      {/* Write / Force Value Modal */}
      {editingTag && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            width: '380px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Write Value to Live Tag
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {editingTag.name} ({editingTag.dataType})
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {editingTag.nodeId}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Value
              </label>
              {editingTag.dataType === 'Boolean' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setNewValue('true')}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #10B981', backgroundColor: newValue === 'true' ? '#10B981' : 'transparent', color: newValue === 'true' ? '#fff' : '#10B981', cursor: 'pointer', fontWeight: 600 }}
                  >
                    TRUE
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewValue('false')}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #EF4444', backgroundColor: newValue === 'false' ? '#EF4444' : 'transparent', color: newValue === 'false' ? '#fff' : '#EF4444', cursor: 'pointer', fontWeight: 600 }}
                  >
                    FALSE
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-primary)', fontSize: '12px' }}
                />
              )}
            </div>

            {writeFeedback && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                color: writeFeedback.success ? '#10B981' : '#EF4444'
              }}>
                {writeFeedback.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{writeFeedback.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => { setEditingTag(null); setWriteFeedback(null); }}
                style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--border-default)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteWrite}
                disabled={isWriting}
                style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#3B82F6', color: '#fff', fontSize: '12px', cursor: isWriting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                {isWriting ? 'Writing...' : 'Execute Write'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
