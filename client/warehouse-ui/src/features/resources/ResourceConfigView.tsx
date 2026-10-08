import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Layers, 
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

// Subcomponents
import { ResourceMasterDetailView } from './components/masterDetail/ResourceMasterDetailView';
import { ResourceStudioView } from './studio/ResourceStudioView';
import { TemplateStudioView } from './TemplateStudioView';
import { ResourceDetailsModal } from './components/ResourceDetailsModal';
import { ResourceMethodConfigModal } from './components/ResourceMethodConfigModal';
import { ResourceCodeMethodModal } from './components/ResourceCodeMethodModal';
import { PlcTagControlModal } from './components/PlcTagControlModal';
import { ResourceRelationshipsTab } from './components/ResourceRelationshipsTab';
import { ResourceShapesTab } from './components/ResourceShapesTab';
import { ResourceRulesTab } from './components/ResourceRulesTab';
import { ResourceTelemetryTab } from './components/ResourceTelemetryTab';
import { ResourceTemplatesTab } from './components/ResourceTemplatesTab';
import { ResourceTemplateItem } from '../../services/resourceTemplateService';
import { Boxes, Zap, Activity, FileCode, Shield } from 'lucide-react';

type ViewMode = 'SYSTEM_TEMPLATES' | 'CUSTOM_TEMPLATES' | 'TEMPLATES' | 'RESOURCES' | 'SHAPES' | 'RULES' | 'TELEMETRY' | 'RELATIONSHIPS' | 'RESOURCE_STUDIO' | 'TEMPLATE_STUDIO';

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
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode === 'TEMPLATES' ? 'SYSTEM_TEMPLATES' : initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode === 'TEMPLATES' ? 'SYSTEM_TEMPLATES' : initialViewMode);
    }
  }, [initialViewMode]);

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

  const handleCloneTemplate = (tpl: ResourceTemplateItem) => {
    const cloned: ResourceTemplateItem = {
      ...tpl,
      templateCode: `CUSTOM_${tpl.templateCode}`,
      templateName: `${tpl.templateName} (Custom)`,
      systemTemplate: false
    };
    setEditingTemplate(cloned);
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
          key={editingResource?.resourceId || 'new'}
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
          key={editingTemplate?.templateCode || 'new'}
          editingTemplate={editingTemplate}
          onSaveSuccess={(saved) => {
            setSuccessMessage(`Template '${saved.templateCode}' (${saved.templateName}) saved successfully.`);
            setViewMode(saved.systemTemplate ? 'SYSTEM_TEMPLATES' : 'CUSTOM_TEMPLATES');
            setEditingTemplate(null);
          }}
          onCancel={() => {
            setViewMode(editingTemplate?.systemTemplate ? 'SYSTEM_TEMPLATES' : 'CUSTOM_TEMPLATES');
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
              {viewMode === 'SYSTEM_TEMPLATES' 
                ? 'Resource Manager: System Template Definer' 
                : viewMode === 'CUSTOM_TEMPLATES'
                ? 'Resource Manager: Custom Template Definer'
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
              {viewMode === 'SYSTEM_TEMPLATES' ? 'System Templates' : viewMode === 'CUSTOM_TEMPLATES' ? 'Custom Templates' : 'Live Assets'}
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
            {viewMode === 'SYSTEM_TEMPLATES'
              ? 'Standard platform digital twins, core operational states, and industrial protocols'
              : viewMode === 'CUSTOM_TEMPLATES'
              ? 'User-defined custom resource blueprints, specialized property matrices, and services'
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

          {viewMode === 'CUSTOM_TEMPLATES' || viewMode === 'SYSTEM_TEMPLATES' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateTemplate}
              leftIcon={<Plus size={13} />}
            >
              Add Custom Template
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

      {/* Main Workspace Navigation (3 Primary Sections + Auxiliary Tools) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexShrink: 0, overflowX: 'auto', alignItems: 'center' }}>
        <button
          type="button"
          className={`btn ${viewMode === 'SYSTEM_TEMPLATES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('SYSTEM_TEMPLATES')}
        >
          <Shield size={18} />
          <span>1. System Templates</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'CUSTOM_TEMPLATES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('CUSTOM_TEMPLATES')}
        >
          <FileCode size={18} />
          <span>2. Custom Templates</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'RESOURCES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('RESOURCES')}
        >
          <Layers size={18} />
          <span>3. Resources ({stats.total})</span>
        </button>

        <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-default)', margin: '0 4px' }} />

        <button
          type="button"
          className={`btn ${viewMode === 'SHAPES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('SHAPES')}
        >
          <Boxes size={18} />
          <span>Shapes</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'RULES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('RULES')}
        >
          <Zap size={18} />
          <span>Rules</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'TELEMETRY' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('TELEMETRY')}
        >
          <Activity size={18} />
          <span>Telemetry</span>
        </button>

        <button
          type="button"
          className={`btn ${viewMode === 'RELATIONSHIPS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setViewMode('RELATIONSHIPS')}
        >
          <GitCommit size={18} />
          <span>Topology</span>
        </button>
      </div>

      {/* View Content Body */}
      {viewMode === 'RESOURCES' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceMasterDetailView
            resources={resources}
            isLoading={isLoading}
            onOpenCreate={handleOpenCreateModal}
            onOpenEdit={handleOpenEditModal}
            onOpenDetails={handleOpenDetailsModal}
            onOpenMethods={handleOpenMethodModal}
            onOpenPlcControl={handleOpenPlcModal}
            onDelete={handleDeleteResource}
            onRefreshAll={loadResources}
            copiedIp={copiedIp}
            onCopyIp={handleCopyIp}
            onResourceUpdated={(updated) => {
              setResources(prev => prev.map(r => r.resourceId === updated.resourceId ? updated : r));
            }}
          />
        </div>
      )}

      {viewMode === 'SYSTEM_TEMPLATES' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceTemplatesTab
            mode="SYSTEM"
            onOpenCreate={handleOpenCreateTemplate}
            onOpenEdit={handleOpenEditTemplate}
            onCloneAsCustom={handleCloneTemplate}
          />
        </div>
      )}

      {viewMode === 'CUSTOM_TEMPLATES' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResourceTemplatesTab
            mode="CUSTOM"
            onOpenCreate={handleOpenCreateTemplate}
            onOpenEdit={handleOpenEditTemplate}
            onCloneAsCustom={handleCloneTemplate}
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

      {methodModalResource?.category?.toUpperCase() === 'SOFTWARE' ? (
        <ResourceMethodConfigModal
          key={methodModalResource?.resourceId || 'software-method-modal'}
          isOpen={methodModalOpen}
          onClose={() => setMethodModalOpen(false)}
          resource={methodModalResource}
          onSuccess={(msg) => setSuccessMessage(msg)}
          onRefresh={loadResources}
        />
      ) : (
        <ResourceCodeMethodModal
          key={methodModalResource?.resourceId || 'code-method-modal'}
          isOpen={methodModalOpen}
          onClose={() => setMethodModalOpen(false)}
          resource={methodModalResource}
          onSuccess={(msg) => setSuccessMessage(msg)}
          onRefresh={loadResources}
        />
      )}

      <PlcTagControlModal
        isOpen={plcModalOpen}
        onClose={() => setPlcModalOpen(false)}
        resource={plcModalResource}
        onSuccess={(msg) => setSuccessMessage(msg)}
      />
    </div>
  );
};
