import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Layers, 
  Cpu, 
  Sliders, 
  Laptop, 
  HardDrive, 
  RefreshCw, 
  Plus,
  GitCommit
} from 'lucide-react';
import { 
  resourceService, 
  ResourceItem 
} from '../../services/resourceService';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Tabs } from '../../components/common/Tabs';

// Subcomponents
import { ResourceTable } from './components/ResourceTable';
import { ResourceStudioView } from './studio/ResourceStudioView';
import { TemplateStudioView } from './TemplateStudioView';
import { ResourceDetailsModal } from './components/ResourceDetailsModal';
import { ResourceMethodConfigModal } from './components/ResourceMethodConfigModal';
import { PlcTagControlModal } from './components/PlcTagControlModal';
import { ResourceRelationshipsTab } from './components/ResourceRelationshipsTab';
import { ResourceShapesTab } from './components/ResourceShapesTab';
import { ResourceRulesTab } from './components/ResourceRulesTab';
import { ResourceTelemetryTab } from './components/ResourceTelemetryTab';
import { ResourceTemplatesTab } from './components/ResourceTemplatesTab';
import { ResourceTemplateItem } from '../../services/resourceTemplateService';
import { Boxes, Zap, Activity, FileCode } from 'lucide-react';

type ViewMode = 'RESOURCES' | 'TEMPLATES' | 'SHAPES' | 'RULES' | 'TELEMETRY' | 'RELATIONSHIPS' | 'RESOURCE_STUDIO' | 'TEMPLATE_STUDIO';
type TabKey = 'ALL' | 'SOFTWARE' | 'PLC' | 'DEVICES' | 'HARDWARE';

export interface ResourceConfigViewProps {
  initialViewMode?: ViewMode;
}

export const ResourceConfigView: React.FC<ResourceConfigViewProps> = ({
  initialViewMode = 'RESOURCES'
}) => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Top Section Mode (Unified Workspace)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Active Category Tab for Resources
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Resource Studio / Edit States
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);

  // Template Studio / Edit States
  const [editingTemplate, setEditingTemplate] = useState<ResourceTemplateItem | null>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedResourceDetails, setSelectedResourceDetails] = useState<ResourceItem | null>(null);

  const [methodModalOpen, setMethodModalOpen] = useState<boolean>(false);
  const [methodModalResource, setMethodModalResource] = useState<ResourceItem | null>(null);

  const [plcModalOpen, setPlcModalOpen] = useState<boolean>(false);
  const [plcModalResource, setPlcModalResource] = useState<ResourceItem | null>(null);

  // Load Resources from Backend
  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await resourceService.getResources();
      setResources(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load resources from WES backend';
      console.error('Failed to load resources:', err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Compute category stats for tab badges
  const stats = useMemo(() => {
    const total = resources.length;
    const software = resources.filter(r => ['SOFTWARE', 'WMS'].includes(r.type.toUpperCase())).length;
    const plc = resources.filter(r => r.type.toUpperCase() === 'PLC').length;
    const devices = resources.filter(r => ['DEVICE', 'DEVICES', 'EQUIPMENT'].includes(r.type.toUpperCase())).length;
    const hardware = resources.filter(r => r.type.toUpperCase() === 'HARDWARE').length;
    return { total, software, plc, devices, hardware };
  }, [resources]);

  // Filter resources by the active tab
  const tabFilteredResources = useMemo(() => {
    if (activeTab === 'ALL') return resources;
    return resources.filter(res => {
      const t = res.type.toUpperCase();
      if (activeTab === 'SOFTWARE') return t === 'SOFTWARE' || t === 'WMS';
      if (activeTab === 'PLC') return t === 'PLC';
      if (activeTab === 'DEVICES') return t === 'DEVICE' || t === 'DEVICES' || t === 'EQUIPMENT';
      if (activeTab === 'HARDWARE') return t === 'HARDWARE';
      return true;
    });
  }, [resources, activeTab]);

  // Action Handlers
  const handleOpenCreateModal = () => {
    setEditingResource(null);
    setViewMode('RESOURCE_STUDIO');
  };

  const handleOpenEditModal = (res: ResourceItem) => {
    setEditingResource(res);
    setViewMode('RESOURCE_STUDIO');
  };

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setViewMode('TEMPLATE_STUDIO');
  };

  const handleOpenEditTemplate = (tpl: ResourceTemplateItem) => {
    setEditingTemplate(tpl);
    setViewMode('TEMPLATE_STUDIO');
  };

  const handleOpenDetailsModal = (res: ResourceItem) => {
    setSelectedResourceDetails(res);
    setDetailsModalOpen(true);
  };

  const handleOpenMethodModal = (res: ResourceItem) => {
    setMethodModalResource(res);
    setMethodModalOpen(true);
  };

  const handleOpenPlcModal = (res: ResourceItem) => {
    setPlcModalResource(res);
    setPlcModalOpen(true);
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm(`Are you sure you want to delete resource '${resourceId}'?`)) {
      return;
    }
    try {
      await resourceService.deleteResource(resourceId);
      setSuccessMessage(`Resource '${resourceId}' deleted successfully`);
      await loadResources();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resource';
      alert(`Failed to delete resource: ${msg}`);
    }
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  if (viewMode === 'RESOURCE_STUDIO') {
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
        <ResourceStudioView
          editingResource={editingResource}
          onSaveSuccess={(saved) => {
            setSuccessMessage(`Resource '${saved.resourceId}' (${saved.name}) saved and activated.`);
            setViewMode('RESOURCES');
            setEditingResource(null);
            loadResources();
          }}
          onCancel={() => {
            setViewMode('RESOURCES');
            setEditingResource(null);
          }}
        />
      </div>
    );
  }

  if (viewMode === 'TEMPLATE_STUDIO') {
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
        <TemplateStudioView
          editingTemplate={editingTemplate}
          onSaveSuccess={(saved) => {
            setSuccessMessage(`Template '${saved.templateCode}' (${saved.templateName}) saved successfully.`);
            setViewMode('TEMPLATES');
            setEditingTemplate(null);
          }}
          onCancel={() => {
            setViewMode('TEMPLATES');
            setEditingTemplate(null);
          }}
        />
      </div>
    );
  }

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
              {viewMode === 'TEMPLATES' 
                ? 'Resource Manager: Template Definer' 
                : viewMode === 'RESOURCES' 
                  ? 'Resource Manager: Resource Composer' 
                  : 'Resource Manager & Topology Workspace'}
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
              {viewMode === 'TEMPLATES' ? 'Class Templates' : 'Live Assets'}
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
            {viewMode === 'TEMPLATES'
              ? 'Author, inspect, and manage reusable industrial equipment templates, properties, and methods'
              : 'Compose, configure, and supervise runtime physical and software resource instances'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={loadResources}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
            title="Reload all resources from WES backend"
          >
            Refresh
          </Button>

          {viewMode === 'TEMPLATES' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateTemplate}
              leftIcon={<Plus size={13} />}
            >
              Add Template
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              leftIcon={<Plus size={13} />}
            >
              Add Resource
            </Button>
          )}
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

      {/* Main Workspace Navigation (Mode Switcher) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexShrink: 0, overflowX: 'auto' }}>
        <button
          type="button"
          className={`btn ${viewMode === 'RESOURCES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('RESOURCES')}
        >
          <Layers size={18} />
          <span>Resource Composer ({stats.total})</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'TEMPLATES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('TEMPLATES')}
        >
          <FileCode size={18} />
          <span>Template Definer</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'SHAPES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('SHAPES')}
        >
          <Boxes size={18} />
          <span>Resource Shapes (Mixins)</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'RULES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('RULES')}
        >
          <Zap size={18} />
          <span>Reactive Rules</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'TELEMETRY' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('TELEMETRY')}
        >
          <Activity size={18} />
          <span>Telemetry Historian</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'RELATIONSHIPS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('RELATIONSHIPS')}
        >
          <GitCommit size={18} />
          <span>Topology & Links</span>
        </button>
      </div>

      {/* View Content Body */}
      {viewMode === 'RESOURCES' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Subcategory Filter Strip */}
          <div style={{ marginBottom: '10px', flexShrink: 0 }}>
            <Tabs<TabKey>
              tabs={[
                {
                  key: 'ALL',
                  label: 'All Resources',
                  icon: <Layers size={14} style={{ marginRight: '6px' }} />,
                  badge: stats.total
                },
                {
                  key: 'SOFTWARE',
                  label: 'Software & WMS',
                  icon: <Cpu size={14} style={{ marginRight: '6px' }} />,
                  badge: stats.software
                },
                {
                  key: 'PLC',
                  label: 'PLC Nodes',
                  icon: <Sliders size={14} style={{ marginRight: '6px' }} />,
                  badge: stats.plc
                },
                {
                  key: 'DEVICES',
                  label: 'Devices / Equipment',
                  icon: <Laptop size={14} style={{ marginRight: '6px' }} />,
                  badge: stats.devices
                },
                {
                  key: 'HARDWARE',
                  label: 'Hardware Resources',
                  icon: <HardDrive size={14} style={{ marginRight: '6px' }} />,
                  badge: stats.hardware
                }
              ]}
              activeKey={activeTab}
              onChange={key => setActiveTab(key)}
            />
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <ResourceTable
              resources={tabFilteredResources}
              isLoading={isLoading}
              onOpenCreate={handleOpenCreateModal}
              onOpenDetails={handleOpenDetailsModal}
              onOpenMethods={handleOpenMethodModal}
              onOpenPlcControl={handleOpenPlcModal}
              onOpenEdit={handleOpenEditModal}
              onDelete={handleDeleteResource}
              copiedIp={copiedIp}
              onCopyIp={handleCopyIp}
            />
          </div>
        </div>
      )}

      {viewMode === 'TEMPLATES' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceTemplatesTab
            onOpenCreate={handleOpenCreateTemplate}
            onOpenEdit={handleOpenEditTemplate}
          />
        </div>
      )}

      {viewMode === 'SHAPES' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceShapesTab />
        </div>
      )}

      {viewMode === 'RULES' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceRulesTab />
        </div>
      )}

      {viewMode === 'TELEMETRY' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceTelemetryTab />
        </div>
      )}

      {viewMode === 'RELATIONSHIPS' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <ResourceRelationshipsTab resources={resources} />
        </div>
      )}

      {/* MODALS */}
      <ResourceDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        resource={selectedResourceDetails}
      />

      <ResourceMethodConfigModal
        isOpen={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        resource={methodModalResource}
        onSuccess={(msg) => setSuccessMessage(msg)}
        onRefresh={loadResources}
      />

      <PlcTagControlModal
        isOpen={plcModalOpen}
        onClose={() => setPlcModalOpen(false)}
        resource={plcModalResource}
        onSuccess={(msg) => setSuccessMessage(msg)}
      />
    </div>
  );
};
