import React from 'react';
import {
  Folder,
  FolderOpen,
  Database,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { DeviceTag } from '../types';

interface AddressSpaceTreeProps {
  channelName: string;
  protocol: string;
  folders: string[];
  selectedFolder: string;
  activeSourceTags: DeviceTag[];
  isCollapsed: boolean;
  isLoading: boolean;
  onSelectFolder: (folder: string) => void;
  onToggleCollapse: () => void;
}

export const AddressSpaceTree: React.FC<AddressSpaceTreeProps> = ({
  channelName,
  protocol,
  folders,
  selectedFolder,
  activeSourceTags,
  isCollapsed,
  isLoading,
  onSelectFolder,
  onToggleCollapse
}) => {
  const [folderSearch, setFolderSearch] = React.useState('');

  const filteredFolders = React.useMemo(() => {
    if (!folderSearch) return folders;
    const query = folderSearch.toLowerCase();
    return folders.filter(f => f.toLowerCase().includes(query));
  }, [folders, folderSearch]);

  if (isCollapsed) {
    return (
      <div
        style={{
          width: '42px',
          borderRight: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: '12px',
          flexShrink: 0,
          transition: 'width 0.2s ease'
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand Address Space panel"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-primary-400, #60A5FA)',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            minWidth: '40px'
          }}
        >
          <ChevronRight size={18} />
        </button>
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 0'
          }}
          onClick={onToggleCollapse}
          title="Click to expand Address Space"
        >
          <Database size={13} color="#3B82F6" style={{ transform: 'rotate(90deg)' }} />
          <span>ADDRESS SPACE</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '270px',
        borderRight: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface-subtle)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flexShrink: 0,
        transition: 'width 0.2s ease'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-default)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={15} color="#3B82F6" />
          <span>Address Space</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#60A5FA',
              fontWeight: 500
            }}
          >
            IEC 62541
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Address Space panel"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '28px',
              minWidth: '28px'
            }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Channel info & search */}
      <div style={{ padding: '8px 10px 4px 10px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '2px 4px 6px 4px', fontWeight: 600 }}>
          {channelName} ({protocol})
        </div>

        {folders.length > 5 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '3px 8px',
              marginBottom: '6px'
            }}
          >
            <Search size={12} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Filter folders..."
              value={folderSearch}
              onChange={e => setFolderSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '11px',
                width: '100%'
              }}
            />
          </div>
        )}
      </div>

      {/* Folders List */}
      <div style={{ padding: '0 8px 8px 8px', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {folders.length === 0 && !isLoading && (
          <div style={{ padding: '16px 8px', fontSize: '11.5px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            No tag groups found. Click &quot;Discover Tags&quot; to browse the OPC UA server.
          </div>
        )}

        {filteredFolders.map(folder => {
          const isSelected = selectedFolder === folder;
          const count = activeSourceTags.filter(t => t.folder === folder).length;
          // Format folder name: show leaf name if path is deep, and tooltip shows full path
          const segments = folder.split('/');
          const leafName = segments.length > 1 ? segments[segments.length - 1] : folder;
          const parentPrefix = segments.length > 1 ? segments.slice(0, -1).join('/') + '/' : '';

          return (
            <button
              key={folder}
              type="button"
              onClick={() => onSelectFolder(folder)}
              title={folder}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 8px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isSelected ? '#60A5FA' : 'var(--text-primary)',
                fontSize: '11.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
                {isSelected ? <FolderOpen size={14} color="#3B82F6" style={{ flexShrink: 0 }} /> : <Folder size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />}
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {parentPrefix && (
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                      {parentPrefix}
                    </span>
                  )}
                  <strong style={{ fontWeight: 600 }}>{leafName}</strong>
                </div>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'var(--bg-surface)',
                  color: isSelected ? '#60A5FA' : 'var(--text-secondary)',
                  fontWeight: 600,
                  flexShrink: 0,
                  marginLeft: '4px'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
