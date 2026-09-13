import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Layers, 
  Send, 
  Network, 
  Activity, 
  Code2, 
  RefreshCw, 
  Plus 
} from 'lucide-react';
import { 
  dynamicMappingService, 
  ApiIntegrationMappingItem, 
  SchemaDictionary 
} from '../../services/dynamicMappingService';
import { fetchResourcesApi, ResourceItem } from '../../services/resourceService';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Tabs } from '../../components/common/Tabs';

// Subcomponents
import { MappingTable } from './components/MappingTable';
import { MappingEditorModal } from './components/MappingEditorModal';

type TabKey = 'ALL' | 'INBOUND' | 'OUTBOUND' | 'TRACKING' | 'CUSTOM';

export const ApiMappingManagerView: React.FC = () => {
  const [mappings, setMappings] = useState<ApiIntegrationMappingItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [dictionary, setDictionary] = useState<SchemaDictionary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingMapping, setEditingMapping] = useState<ApiIntegrationMappingItem | null>(null);

  // Load Data from Backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [mappingsData, resourcesData, dictData] = await Promise.all([
        dynamicMappingService.getMappings(),
        fetchResourcesApi(),
        dynamicMappingService.getFieldDictionary().catch(() => null)
      ]);
      setMappings(mappingsData);
      setResources(resourcesData);
      if (dictData) setDictionary(dictData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load API mappings and resources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Compute category stats for tab badges
  const stats = useMemo(() => {
    const total = mappings.length;
    const inbound = mappings.filter(m => 
      ['PRE_ANNOUNCE'].includes(m.operationType.toUpperCase())
    ).length;
    const outbound = mappings.filter(m => 
      ['CREATE_ORDER', 'RESERVE_ORDER', 'OUTBOUND_RELEASE', 'LOAD_CONFIRMATION'].includes(m.operationType.toUpperCase())
    ).length;
    const tracking = mappings.filter(m => 
      ['PALLET_STATUS_QUERY', 'ROUTE_OPTIMIZATION', 'FAULT_NOTIFICATION'].includes(m.operationType.toUpperCase())
    ).length;
    const custom = mappings.filter(m => 
      !['PRE_ANNOUNCE', 'CREATE_ORDER', 'RESERVE_ORDER', 'OUTBOUND_RELEASE', 'LOAD_CONFIRMATION', 'PALLET_STATUS_QUERY', 'ROUTE_OPTIMIZATION', 'FAULT_NOTIFICATION'].includes(m.operationType.toUpperCase())
    ).length;

    return { total, inbound, outbound, tracking, custom };
  }, [mappings]);

  // Filter mappings by the active tab
  const tabFilteredMappings = useMemo(() => {
    if (activeTab === 'ALL') return mappings;
    return mappings.filter(m => {
      const op = m.operationType.toUpperCase();
      if (activeTab === 'INBOUND') return op === 'PRE_ANNOUNCE';
      if (activeTab === 'OUTBOUND') return ['CREATE_ORDER', 'RESERVE_ORDER', 'OUTBOUND_RELEASE', 'LOAD_CONFIRMATION'].includes(op);
      if (activeTab === 'TRACKING') return ['PALLET_STATUS_QUERY', 'ROUTE_OPTIMIZATION', 'FAULT_NOTIFICATION'].includes(op);
      if (activeTab === 'CUSTOM') {
        return !['PRE_ANNOUNCE', 'CREATE_ORDER', 'RESERVE_ORDER', 'OUTBOUND_RELEASE', 'LOAD_CONFIRMATION', 'PALLET_STATUS_QUERY', 'ROUTE_OPTIMIZATION', 'FAULT_NOTIFICATION'].includes(op);
      }
      return true;
    });
  }, [mappings, activeTab]);

  // Handlers for Modals
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingMapping(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mapping: ApiIntegrationMappingItem) => {
    setIsEditing(true);
    setEditingMapping(mapping);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete mapping '${code}'?`)) {
      return;
    }
    try {
      await dynamicMappingService.deleteMapping(id);
      setSuccessMessage(`Mapping '${code}' deleted successfully`);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete mapping: ${err.message}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px 20px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-page)'
    }}>
      {/* 1. Master Data Style Header Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexShrink: 0
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              API Integration Mappings
            </h1>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'monospace',
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-600)',
              padding: '2px 7px',
              borderRadius: '9999px',
              border: '1px solid var(--color-primary-200)',
              textTransform: 'uppercase'
            }}>
              WES Engine
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Configure dynamic payload templates, dynamic variables, and external system endpoints
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
            title="Reload all API mappings from backend"
          >
            Refresh All
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus size={13} />}
          >
            Add Mapping
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ marginBottom: '10px', flexShrink: 0 }}>
          <Alert variant="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}

      {errorMessage && (
        <div style={{ marginBottom: '10px', flexShrink: 0 }}>
          <Alert variant="danger" title="Backend Error" onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        </div>
      )}

      {/* 2. Top Tabs Strip */}
      <div style={{ marginBottom: '10px', flexShrink: 0 }}>
        <Tabs<TabKey>
          tabs={[
            {
              key: 'ALL',
              label: 'All Mappings',
              icon: <Layers size={14} style={{ marginRight: '6px' }} />,
              badge: stats.total
            },
            {
              key: 'INBOUND',
              label: 'Pre-Announce / Inbound',
              icon: <Send size={14} style={{ marginRight: '6px' }} />,
              badge: stats.inbound
            },
            {
              key: 'OUTBOUND',
              label: 'Orders & Release',
              icon: <Network size={14} style={{ marginRight: '6px' }} />,
              badge: stats.outbound
            },
            {
              key: 'TRACKING',
              label: 'Status & Tracking',
              icon: <Activity size={14} style={{ marginRight: '6px' }} />,
              badge: stats.tracking
            },
            {
              key: 'CUSTOM',
              label: 'Custom Endpoints',
              icon: <Code2 size={14} style={{ marginRight: '6px' }} />,
              badge: stats.custom
            }
          ]}
          activeKey={activeTab}
          onChange={key => setActiveTab(key)}
        />
      </div>

      {/* 3. Tab Grid Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <MappingTable
          mappings={tabFilteredMappings}
          isLoading={isLoading}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* MODAL */}
      <MappingEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditing={isEditing}
        initialMapping={editingMapping}
        resources={resources}
        dictionary={dictionary}
        onSuccess={(msg) => setSuccessMessage(msg)}
        onRefresh={loadData}
      />
    </div>
  );
};
