import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Network, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Server, 
  FolderTree, 
  RefreshCw,
  ArrowRightLeft,
  Trash2
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { NetworkDeviceChannel } from './types';
import { networkService } from './networkService';
import { AddDeviceModal } from './AddDeviceModal';
import { DeleteChannelModal } from './components/DeleteChannelModal';
import { LiveTagExplorer } from './components/LiveTagExplorer';
import { SessionDiagnosticsPanel } from './components/SessionDiagnosticsPanel';
import { FunctionalSupportPanel } from './components/FunctionalSupportPanel';

type SubTab = 'CHANNELS' | 'TAG_EXPLORER' | 'DIAGNOSTICS' | 'FUNCTIONAL_SUPPORT';

export const NetworkGatewayView: React.FC = () => {
  const [channels, setChannels] = useState<NetworkDeviceChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<NetworkDeviceChannel | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>('CHANNELS');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channelToDelete, setChannelToDelete] = useState<NetworkDeviceChannel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      const list = await networkService.getChannels();
      setChannels(list);
      if (list.length > 0) {
        setSelectedChannel(prev => {
          if (!prev) {
            return list.find(c => c.status === 'ONLINE') || list[0];
          }
          return list.find(c => c.id === prev.id) || prev;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleChannelAdded = (newChannel: NetworkDeviceChannel) => {
    setChannels(prev => [newChannel, ...prev]);
    setSelectedChannel(newChannel);
  };

  const handleOpenExplorer = (channel: NetworkDeviceChannel) => {
    setSelectedChannel(channel);
    setActiveTab('TAG_EXPLORER');
  };

  const handleOpenDiagnostics = (channel: NetworkDeviceChannel) => {
    setSelectedChannel(channel);
    setActiveTab('DIAGNOSTICS');
  };

  const handlePromptDelete = (channel: NetworkDeviceChannel) => {
    setChannelToDelete(channel);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!channelToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await networkService.deleteChannel(channelToDelete.id);
      if (!res.success) {
        setDeleteError(res.message || 'Failed to delete channel');
        return;
      }
      setChannels(prev => prev.filter(c => c.id !== channelToDelete.id));
      if (selectedChannel?.id === channelToDelete.id) {
        const remaining = channels.filter(c => c.id !== channelToDelete.id);
        setSelectedChannel(remaining.length > 0 ? (remaining.find(c => c.status === 'ONLINE') || remaining[0]) : null);
      }
      setIsDeleteModalOpen(false);
      setChannelToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting channel');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTagsCountChange = useCallback((channelId: string, newCount: number) => {
    setChannels(prev => prev.map(c => c.id === channelId ? (c.tagsCount === newCount ? c : { ...c, tagsCount: newCount }) : c));
    setSelectedChannel(prev => {
      if (!prev || prev.id !== channelId || prev.tagsCount === newCount) return prev;
      return { ...prev, tagsCount: newCount };
    });
  }, []);

  const onlineCount = channels.filter(c => c.status === 'ONLINE').length;
  const offlineCount = channels.length - onlineCount;
  const totalMonitoredTags = channels.reduce((sum, c) => sum + (c.tagsCount || 0), 0);
  const protocolsList = Array.from(new Set(channels.map(c => c.protocol))).filter(Boolean);
  const protocolSummary = protocolsList.length > 0 ? protocolsList.join(', ') : 'OPC-UA, Modbus, S7';

  const channelsWithLatency = channels.filter(c => c.status === 'ONLINE' && c.latencyMs != null && c.latencyMs > 0);
  const avgLatency = channelsWithLatency.length > 0
    ? (channelsWithLatency.reduce((sum, c) => sum + c.latencyMs, 0) / channelsWithLatency.length).toFixed(1)
    : (channels.length > 0 && channels[0].latencyMs != null ? channels[0].latencyMs.toFixed(1) : '0.0');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '100vh',
      backgroundColor: 'var(--bg-page)',
      padding: '20px 24px',
      gap: '16px',
      overflowY: 'auto'
    }}>
      {/* 1. Header & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Network size={22} color="#3B82F6" />
            Industrial Network Gateway (OPC-UA & Fieldbus Channels)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Kepware-style multi-protocol connectivity server, session pooling, and real-time PLC tag hierarchy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={loadChannels}
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
          >
            Add Device Channel
          </Button>
        </div>
      </div>

      {/* 2. Top Real-Time KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Configured Channels', value: `${channels.length} Total`, sub: protocolSummary, icon: <Server size={18} color="#3B82F6" /> },
          { label: 'Connected Sessions', value: `${onlineCount}/${channels.length} Healthy`, sub: offlineCount > 0 ? `${offlineCount} Offline / Fault` : 'All Online', icon: <CheckCircle2 size={18} color={onlineCount > 0 ? "#10B981" : "#EF4444"} /> },
          { label: 'Live Tags Monitored', value: `${totalMonitoredTags.toLocaleString()} Tag${totalMonitoredTags === 1 ? '' : 's'}`, sub: totalMonitoredTags > 0 ? 'Across Active Watchlists' : '0 Tags in Database', icon: <Activity size={18} color="#8B5CF6" /> },
          { label: 'Avg Network Latency', value: `${avgLatency} ms`, sub: onlineCount > 0 ? 'Sub-millisecond jitter' : 'Channels Offline', icon: <Clock size={18} color="#F59E0B" /> }
        ].map((kpi, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                {kpi.sub}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('CHANNELS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'CHANNELS' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'CHANNELS' ? '#3B82F6' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'CHANNELS' ? '2px solid #3B82F6' : '2px solid transparent'
          }}
        >
          <Server size={15} />
          Channels & Devices ({channels.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TAG_EXPLORER')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'TAG_EXPLORER' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'TAG_EXPLORER' ? '#3B82F6' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'TAG_EXPLORER' ? '2px solid #3B82F6' : '2px solid transparent'
          }}
        >
          <FolderTree size={15} />
          Live Tag Explorer
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DIAGNOSTICS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'DIAGNOSTICS' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'DIAGNOSTICS' ? '#3B82F6' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'DIAGNOSTICS' ? '2px solid #3B82F6' : '2px solid transparent'
          }}
        >
          <Activity size={15} />
          Session Diagnostics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FUNCTIONAL_SUPPORT')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'FUNCTIONAL_SUPPORT' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'FUNCTIONAL_SUPPORT' ? '#8B5CF6' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'FUNCTIONAL_SUPPORT' ? '2px solid #8B5CF6' : '2px solid transparent'
          }}
        >
          <ArrowRightLeft size={15} />
          Functional Support
        </button>
      </div>

      {/* 4. Tab Body */}
      {activeTab === 'CHANNELS' && (
        channels.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            textAlign: 'center'
          }}>
            <Server size={42} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Industrial Device Channels Configured
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Add an OPC-UA, Siemens S7, or Modbus TCP channel to start polling tags and monitoring live equipment.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setIsAddModalOpen(true)}
              style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
            >
              Add First Device Channel
            </Button>
          </div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
          {channels.map(chan => (
            <div
              key={chan.id}
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {chan.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {chan.deviceType}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    backgroundColor: chan.status === 'ONLINE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: chan.status === 'ONLINE' ? '#10B981' : '#F59E0B',
                    border: `1px solid ${chan.status === 'ONLINE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: chan.status === 'ONLINE' ? '#10B981' : '#F59E0B'
                    }} />
                    {chan.status}
                  </span>
                </div>
              </div>

              <div style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle)',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                color: '#38BDF8',
                wordBreak: 'break-all'
              }}>
                {chan.endpointUrl}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div>
                  Protocol: <strong style={{ color: 'var(--text-primary)' }}>{chan.protocol}</strong>
                </div>
                <div>
                  Security: <strong style={{ color: 'var(--text-primary)' }}>{chan.securityPolicy.split(' ')[0]}</strong>
                </div>
                <div>
                  Monitored Tags: <strong style={{ color: 'var(--text-primary)' }}>{chan.tagsCount} tags</strong>
                </div>
                <div>
                  Latency: <strong style={{ color: '#10B981' }}>{chan.latencyMs} ms</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
                <button
                  type="button"
                  onClick={() => handleOpenExplorer(chan)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <FolderTree size={13} color="#3B82F6" /> Browse Tags
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDiagnostics(chan)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Activity size={13} color="#10B981" /> Diagnostics
                </button>

                <button
                  type="button"
                  onClick={() => handlePromptDelete(chan)}
                  title="Delete device channel"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: '#EF4444',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} color="#EF4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {activeTab === 'TAG_EXPLORER' && selectedChannel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Active Channel:</span>
            <select
              value={selectedChannel.id}
              onChange={e => {
                const found = channels.find(c => c.id === e.target.value);
                if (found) setSelectedChannel(found);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.protocol})
                </option>
              ))}
            </select>
          </div>
          <LiveTagExplorer channel={selectedChannel} onTagsCountChange={handleTagsCountChange} />
        </div>
      )}

      {activeTab === 'DIAGNOSTICS' && selectedChannel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Channel:</span>
            <select
              value={selectedChannel.id}
              onChange={e => {
                const found = channels.find(c => c.id === e.target.value);
                if (found) setSelectedChannel(found);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.protocol})
                </option>
              ))}
            </select>
          </div>
          <SessionDiagnosticsPanel channel={selectedChannel} />
        </div>
      )}

      {activeTab === 'FUNCTIONAL_SUPPORT' && selectedChannel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Channel:</span>
            <select
              value={selectedChannel.id}
              onChange={e => {
                const found = channels.find(c => c.id === e.target.value);
                if (found) setSelectedChannel(found);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.protocol})
                </option>
              ))}
            </select>
          </div>
          <FunctionalSupportPanel channel={selectedChannel} />
        </div>
      )}

      {/* Add Device Channel Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onChannelAdded={handleChannelAdded}
      />

      {/* Delete Device Channel Confirmation Modal */}
      <DeleteChannelModal
        channel={channelToDelete}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setChannelToDelete(null);
          setDeleteError(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        onNavigateToTags={(chan) => handleOpenExplorer(chan)}
      />
    </div>
  );
};
