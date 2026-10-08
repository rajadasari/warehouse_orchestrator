import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { ResourceItem } from '../../../../services/resourceService';
import { Badge } from '../../../../components/common/Badge';
import { ResourcePropertiesTable } from './ResourcePropertiesTable';
import { useResourceLiveProperties } from './useResourceLiveProperties';

export interface ResourcePropertiesTabProps {
  resource: ResourceItem;
  onResourceUpdated?: (updated: ResourceItem) => void;
}

export const ResourcePropertiesTab: React.FC<ResourcePropertiesTabProps> = ({
  resource,
  onResourceUpdated
}) => {
  const {
    template,
    isLoadingTemplate,
    isManualRefreshing,
    searchQuery,
    setSearchQuery,
    inheritedProperties,
    totalInheritedCount,
    customProperties,
    totalCustomCount,
    handleManualRefresh
  } = useResourceLiveProperties(resource, onResourceUpdated);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
      {/* 1. Control & Search Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          padding: '6px 12px',
          flex: 1,
          minWidth: '220px',
          maxWidth: '360px'
        }}>
          <Search size={14} color="var(--text-secondary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search properties by name, key, or value..."
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

        {/* Counter Badges & Manual Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge variant="neutral">
            {totalInheritedCount} Inherited
          </Badge>
          <Badge variant="info">
            {totalCustomCount} Custom
          </Badge>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            title="Manual refresh: trigger on-demand property check from backend"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isManualRefreshing ? 'not-allowed' : 'pointer',
              minHeight: '34px'
            }}
          >
            <RefreshCw size={13} className={isManualRefreshing ? 'animate-spin' : ''} />
            <span>{isManualRefreshing ? 'Refreshing...' : 'Manual Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Scrollable Properties Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '2px' }}>
        {/* Template Inherited Properties Group */}
        <ResourcePropertiesTable
          properties={inheritedProperties}
          groupTitle="Template Inherited Properties"
          badgeLabel={template ? `Template: ${template.templateName || template.templateCode}` : (resource.templateCode ? `Blueprint: ${resource.templateCode}` : 'Archetype Baseline')}
          emptyMessage={
            isLoadingTemplate 
              ? 'Loading archetype template properties...' 
              : resource.templateCode 
                ? 'No inherited properties found in the selected template.' 
                : 'No template linked to this resource instance. All parameters are custom.'
          }
        />

        {/* Custom Properties Group */}
        <ResourcePropertiesTable
          properties={customProperties}
          groupTitle="Custom Properties"
          badgeLabel="Instance Overrides & Extended Variables"
          emptyMessage="No custom properties defined on this resource instance."
        />
      </div>
    </div>
  );
};
