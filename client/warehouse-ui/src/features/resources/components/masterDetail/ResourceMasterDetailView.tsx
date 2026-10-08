import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sliders, 
  Cog, 
  Edit2, 
  Trash2, 
  Globe, 
  Server,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Code2
} from 'lucide-react';
import { ResourceItem } from '../../../../services/resourceService';
import { Badge, getStatusBadgeVariant } from '../../../../components/common/Badge';
import { Button } from '../../../../components/common/Button';
import { ResourceSidebarList } from './ResourceSidebarList';
import { ResourcePropertiesTab } from './ResourcePropertiesTab';
import { ResourceServicesTabPlaceholder } from './ResourceServicesTabPlaceholder';
import { ResourceCategoryTab } from './types';

export interface ResourceMasterDetailViewProps {
  resources: ResourceItem[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (res: ResourceItem) => void;
  onOpenDetails?: (res: ResourceItem) => void;
  onOpenMethods?: (res: ResourceItem) => void;
  onOpenPlcControl?: (res: ResourceItem) => void;
  onDelete: (resourceId: string) => Promise<void>;
  onRefreshAll: () => Promise<void>;
  copiedIp: string | null;
  onCopyIp: (ip: string) => void;
  onResourceUpdated?: (updated: ResourceItem) => void;
}

export const ResourceMasterDetailView: React.FC<ResourceMasterDetailViewProps> = ({
  resources,
  isLoading,
  onOpenCreate,
  onOpenEdit,
  onOpenDetails,
  onOpenMethods,
  onOpenPlcControl,
  onDelete,
  onRefreshAll,
  copiedIp,
  onCopyIp,
  onResourceUpdated
}) => {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'PROPERTIES' | 'SERVICES'>('PROPERTIES');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<ResourceCategoryTab>('ALL');

  // Auto-select first resource if none selected or if selected resource was deleted
  useEffect(() => {
    if (resources.length > 0) {
      if (!selectedResourceId || !resources.some(r => r.resourceId === selectedResourceId)) {
        setSelectedResourceId(resources[0].resourceId);
      }
    } else {
      setSelectedResourceId(null);
    }
  }, [resources, selectedResourceId]);

  const selectedResource = useMemo(() => {
    return resources.find(r => r.resourceId === selectedResourceId) || null;
  }, [resources, selectedResourceId]);

  const endpoint = selectedResource?.host 
    ? `${selectedResource.host}${selectedResource.port ? `:${selectedResource.port}` : ''}` 
    : selectedResource?.ip;

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      minHeight: 0,
      height: '100%',
      backgroundColor: 'var(--bg-page)',
      borderRadius: '8px',
      border: '1px solid var(--border-default)',
      overflow: 'hidden'
    }}>
      {/* 1. Left Sidebar: Resource List */}
      <ResourceSidebarList
        resources={resources}
        selectedResource={selectedResource}
        onSelectResource={res => setSelectedResourceId(res.resourceId)}
        onOpenCreate={onOpenCreate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* 2. Right Pane: Detail Workspace (Tabs: Properties & Services) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        backgroundColor: 'var(--bg-page)',
        overflow: 'hidden'
      }}>
        {!selectedResource ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--text-secondary)',
            fontSize: '13px',
            gap: '8px'
          }}>
            <Server size={32} color="var(--text-disabled)" />
            <span>Select a resource from the left section to view properties and services.</span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            padding: '14px 18px',
            gap: '12px',
            overflow: 'hidden'
          }}>
            {/* Selected Resource Header Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h2 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)'
                  }}>
                    {selectedResource.name}
                  </h2>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--color-primary-600, #2563EB)'
                  }}>
                    {selectedResource.resourceId}
                  </span>
                  <Badge variant={getStatusBadgeVariant(selectedResource.status)}>
                    {selectedResource.status}
                  </Badge>
                  <Badge variant="info">
                    {selectedResource.type}
                  </Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {endpoint && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                      <Globe size={12} />
                      <span>{endpoint}</span>
                      <button
                        type="button"
                        onClick={() => onCopyIp(endpoint)}
                        title="Copy endpoint"
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: copiedIp === endpoint ? '#10B981' : 'var(--text-secondary)',
                          padding: '1px 3px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {copiedIp === endpoint ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}
                  {selectedResource.templateCode && (
                    <div>
                      <span>Template: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedResource.templateCode}</strong>
                    </div>
                  )}
                  {selectedResource.application && (
                    <div>
                      <span>Application: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedResource.application}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshAll}
                  isLoading={isLoading}
                  leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
                  style={{ minHeight: '36px' }}
                  title="Reload all resources from WES backend"
                >
                  Reload
                </Button>

                {onOpenDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenDetails(selectedResource)}
                    leftIcon={<Eye size={13} />}
                    style={{ minHeight: '36px' }}
                    title="View Raw Details"
                  >
                    JSON
                  </Button>
                )}

                {onOpenMethods && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenMethods(selectedResource)}
                    leftIcon={<Code2 size={13} />}
                    style={{ minHeight: '36px' }}
                    title="Method Configuration"
                  >
                    Methods
                  </Button>
                )}

                {onOpenPlcControl && selectedResource.type?.toUpperCase() === 'PLC' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPlcControl(selectedResource)}
                    leftIcon={<Sliders size={13} />}
                    style={{ minHeight: '36px' }}
                    title="PLC Tag Control"
                  >
                    PLC Tags
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenEdit(selectedResource)}
                  leftIcon={<Edit2 size={13} />}
                  style={{ minHeight: '36px' }}
                >
                  Edit Resource
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(selectedResource.resourceId)}
                  leftIcon={<Trash2 size={13} />}
                  style={{ minHeight: '36px' }}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Right Section Tabs: Properties & Services */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-default)',
              gap: '4px',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setActiveRightTab('PROPERTIES')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  minHeight: '44px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeRightTab === 'PROPERTIES' ? '2px solid var(--color-primary-600, #2563EB)' : '2px solid transparent',
                  color: activeRightTab === 'PROPERTIES' ? 'var(--color-primary-600, #2563EB)' : 'var(--text-secondary)',
                  fontWeight: activeRightTab === 'PROPERTIES' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sliders size={15} />
                <span>Properties</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('SERVICES')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  minHeight: '44px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeRightTab === 'SERVICES' ? '2px solid var(--color-primary-600, #2563EB)' : '2px solid transparent',
                  color: activeRightTab === 'SERVICES' ? 'var(--color-primary-600, #2563EB)' : 'var(--text-secondary)',
                  fontWeight: activeRightTab === 'SERVICES' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Cog size={15} />
                <span>Services</span>
              </button>
            </div>

            {/* Tab Body */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {activeRightTab === 'PROPERTIES' ? (
                <ResourcePropertiesTab
                  key={selectedResource.resourceId}
                  resource={selectedResource}
                  onResourceUpdated={onResourceUpdated}
                />
              ) : (
                <ResourceServicesTabPlaceholder
                  resource={selectedResource}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
