import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileCode, 
  Cpu, 
  HardDrive, 
  Laptop, 
  RefreshCw, 
  Eye
} from 'lucide-react';
import { 
  fetchResourceTemplatesApi, 
  ResourceTemplateItem, 
  PropertySchemaItem 
} from '../../../services/resourceTemplateService';
import { Button } from '../../../components/common/Button';
import { Badge, BadgeVariant } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';
import { Alert } from '../../../components/common/Alert';
import { JsonViewer } from '../../../components/common/JsonViewer';

export const ResourceTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<ResourceTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HARDWARE' | 'DEVICE' | 'SOFTWARE'>('ALL');
  const [inspectTemplate, setInspectTemplate] = useState<ResourceTemplateItem | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchResourceTemplatesApi(
        categoryFilter === 'ALL' ? undefined : categoryFilter
      );
      setTemplates(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load resource templates';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'ALL') return templates;
    return templates.filter(t => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  const stats = useMemo(() => {
    const total = templates.length;
    const hardware = templates.filter(t => t.category === 'HARDWARE').length;
    const device = templates.filter(t => t.category === 'DEVICE').length;
    const software = templates.filter(t => t.category === 'SOFTWARE').length;
    return { total, hardware, device, software };
  }, [templates]);

  const getCategoryBadgeVariant = (cat: string): BadgeVariant => {
    switch (cat) {
      case 'HARDWARE': return 'info';
      case 'DEVICE': return 'warning';
      case 'SOFTWARE': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {errorMessage && (
        <Alert variant="danger" title="Error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Filter Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn ${categoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('ALL')}
          >
            All Templates ({stats.total})
          </button>
          <button
            type="button"
            className={`btn ${categoryFilter === 'HARDWARE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('HARDWARE')}
          >
            <HardDrive size={16} style={{ marginRight: '6px' }} />
            Hardware ({stats.hardware})
          </button>
          <button
            type="button"
            className={`btn ${categoryFilter === 'DEVICE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('DEVICE')}
          >
            <Cpu size={16} style={{ marginRight: '6px' }} />
            Device ({stats.device})
          </button>
          <button
            type="button"
            className={`btn ${categoryFilter === 'SOFTWARE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('SOFTWARE')}
          >
            <Laptop size={16} style={{ marginRight: '6px' }} />
            Software ({stats.software})
          </button>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCw size={16} className={isLoading ? 'spin' : ''} />}
          onClick={loadTemplates}
          disabled={isLoading}
          style={{ minHeight: '48px', minWidth: '48px' }}
        >
          Refresh
        </Button>
      </div>

      {/* Templates Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Template Code</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Template Name</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Resource Type</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Protocol</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Supported Commands</th>
              <th style={{ textAlign: 'center', padding: '12px 16px' }}>Schema Props</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && templates.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                  <RefreshCw size={24} className="spin text-primary" style={{ margin: '0 auto 8px' }} />
                  <div>Loading archetype templates...</div>
                </td>
              </tr>
            ) : filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                  <FileCode size={32} className="text-muted" style={{ margin: '0 auto 8px' }} />
                  <div style={{ color: 'var(--text-secondary)' }}>No templates found for selected category.</div>
                </td>
              </tr>
            ) : (
              filteredTemplates.map((tpl) => (
                <tr key={tpl.templateCode}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    <span className="font-mono text-cyan">{tpl.templateCode}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    {tpl.templateName}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={getCategoryBadgeVariant(tpl.category)}>
                      {tpl.category}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant="neutral">{tpl.resourceType}</Badge>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="font-mono" style={{ fontSize: '0.85rem' }}>{tpl.communicationProtocol}</span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {tpl.supportedCommands && tpl.supportedCommands.length > 0 ? (
                        tpl.supportedCommands.map((cmd) => (
                          <span 
                            key={cmd} 
                            className="badge badge-default" 
                            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          >
                            {cmd}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className="badge badge-info" style={{ fontWeight: 600 }}>
                      {tpl.propertySchema ? tpl.propertySchema.length : 0} fields
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Eye size={14} />}
                      onClick={() => setInspectTemplate(tpl)}
                      style={{ minHeight: '48px', minWidth: '48px' }}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect Template Modal */}
      {inspectTemplate && (
        <Modal
          isOpen={Boolean(inspectTemplate)}
          onClose={() => setInspectTemplate(null)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={20} className="text-primary" />
              <span>{inspectTemplate.templateName}</span>
              <Badge variant={getCategoryBadgeVariant(inspectTemplate.category)}>
                {inspectTemplate.category}
              </Badge>
            </div>
          }
          subtitle={`Archetype Code: ${inspectTemplate.templateCode} | Protocol: ${inspectTemplate.communicationProtocol}`}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                PROPERTY SCHEMA DEFINITION
              </h4>
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Field Key</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Label</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Type</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Required</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectTemplate.propertySchema && inspectTemplate.propertySchema.length > 0 ? (
                      inspectTemplate.propertySchema.map((f: PropertySchemaItem) => (
                        <tr key={f.key}>
                          <td className="font-mono text-cyan" style={{ padding: '8px 12px' }}>{f.key}</td>
                          <td style={{ padding: '8px 12px' }}>{f.label}</td>
                          <td style={{ padding: '8px 12px' }}><Badge variant="neutral">{f.type}</Badge></td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {f.required ? <Badge variant="warning">Yes</Badge> : <span className="text-muted">No</span>}
                          </td>
                          <td className="font-mono text-emerald" style={{ padding: '8px 12px' }}>
                            {f.defaultValue !== undefined ? String(f.defaultValue) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '16px' }}>No schema properties declared.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                DEFAULT JSON PROPERTIES
              </h4>
              <JsonViewer data={inspectTemplate.defaultProperties} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setInspectTemplate(null)}
                style={{ minHeight: '48px' }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
