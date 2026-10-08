import React, { useMemo } from 'react';
import { 
  Search, 
  Cpu, 
  Sliders, 
  Laptop, 
  HardDrive, 
  Layers, 
  Plus, 
  Globe 
} from 'lucide-react';
import { ResourceItem } from '../../../../services/resourceService';
import { Badge, getStatusBadgeVariant } from '../../../../components/common/Badge';
import { ResourceCategoryTab } from './types';

export interface ResourceSidebarListProps {
  resources: ResourceItem[];
  selectedResource: ResourceItem | null;
  onSelectResource: (res: ResourceItem) => void;
  onOpenCreate: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: ResourceCategoryTab;
  onCategoryChange: (cat: ResourceCategoryTab) => void;
}

export const ResourceSidebarList: React.FC<ResourceSidebarListProps> = ({
  resources,
  selectedResource,
  onSelectResource,
  onOpenCreate,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange
}) => {
  // Category counts
  const counts = useMemo(() => {
    const total = resources.length;
    const software = resources.filter(r => ['SOFTWARE', 'WMS'].includes(r.type?.toUpperCase() || '')).length;
    const plc = resources.filter(r => r.type?.toUpperCase() === 'PLC').length;
    const devices = resources.filter(r => ['DEVICE', 'DEVICES', 'EQUIPMENT'].includes(r.type?.toUpperCase() || '')).length;
    const hardware = resources.filter(r => r.type?.toUpperCase() === 'HARDWARE').length;
    return { total, software, plc, devices, hardware };
  }, [resources]);

  // Filtered resources
  const filtered = useMemo(() => {
    return resources.filter(res => {
      // Category filter
      const t = (res.type || '').toUpperCase();
      if (activeCategory === 'SOFTWARE' && !['SOFTWARE', 'WMS'].includes(t)) return false;
      if (activeCategory === 'PLC' && t !== 'PLC') return false;
      if (activeCategory === 'DEVICES' && !['DEVICE', 'DEVICES', 'EQUIPMENT'].includes(t)) return false;
      if (activeCategory === 'HARDWARE' && t !== 'HARDWARE') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          res.resourceId.toLowerCase().includes(q) ||
          res.name.toLowerCase().includes(q) ||
          res.type.toLowerCase().includes(q) ||
          (res.ip && res.ip.toLowerCase().includes(q)) ||
          (res.host && res.host.toLowerCase().includes(q)) ||
          (res.templateCode && res.templateCode.toLowerCase().includes(q)) ||
          res.status.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [resources, activeCategory, searchQuery]);

  const getTypeIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'SOFTWARE' || t === 'WMS') return <Cpu size={14} color="#38BDF8" />;
    if (t === 'PLC') return <Sliders size={14} color="#F59E0B" />;
    if (t === 'HARDWARE') return <HardDrive size={14} color="#EC4899" />;
    return <Laptop size={14} color="#10B981" />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-default)',
      width: '320px',
      minWidth: '280px',
      maxWidth: '380px',
      flexShrink: 0
    }}>
      {/* Sidebar Header & Search */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="var(--color-primary-500, #3B82F6)" />
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Resources
            </h3>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}>
              {filtered.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCreate}
            title="Create new resource"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '32px',
              minHeight: '32px',
              borderRadius: '6px',
              border: '1px solid var(--color-primary-600, #2563EB)',
              backgroundColor: 'var(--color-primary-600, #2563EB)',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '0 8px',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          padding: '6px 10px'
        }}>
          <Search size={14} color="var(--text-secondary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by ID, name, IP..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          {[
            { key: 'ALL' as ResourceCategoryTab, label: 'All', count: counts.total },
            { key: 'SOFTWARE' as ResourceCategoryTab, label: 'Software', count: counts.software },
            { key: 'PLC' as ResourceCategoryTab, label: 'PLC', count: counts.plc },
            { key: 'DEVICES' as ResourceCategoryTab, label: 'Devices', count: counts.devices },
            { key: 'HARDWARE' as ResourceCategoryTab, label: 'Hardware', count: counts.hardware }
          ].map(tab => {
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onCategoryChange(tab.key)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: isActive ? '1px solid var(--color-primary-500, #3B82F6)' : '1px solid transparent',
                  backgroundColor: isActive ? 'var(--color-primary-500, #3B82F6)' : 'var(--bg-surface-subtle)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10px',
                  opacity: isActive ? 0.9 : 0.6
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resource Cards List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '12px'
          }}>
            No resources match criteria.
          </div>
        ) : (
          filtered.map(res => {
            const isSelected = selectedResource?.resourceId === res.resourceId;
            const endpoint = res.host ? `${res.host}${res.port ? `:${res.port}` : ''}` : res.ip;

            return (
              <div
                key={res.resourceId}
                onClick={() => onSelectResource(res)}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '10px 14px',
                  minHeight: '48px', // IEC 62443 touch target
                  boxSizing: 'border-box',
                  borderBottom: '1px solid var(--border-default)',
                  borderLeft: isSelected ? '4px solid var(--color-primary-500, #3B82F6)' : '4px solid transparent',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    {getTypeIcon(res.type)}
                    <span style={{
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: isSelected ? 'var(--color-primary-600, #2563EB)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {res.resourceId}
                    </span>
                  </div>

                  <Badge 
                    variant={getStatusBadgeVariant(res.status)} 
                    style={{ fontSize: '10px', padding: '1px 6px' }}
                  >
                    {res.status}
                  </Badge>
                </div>

                <div style={{
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {res.name}
                </div>

                {endpoint && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10.5px',
                    color: 'var(--text-disabled)',
                    fontFamily: 'monospace'
                  }}>
                    <Globe size={11} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {endpoint}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
