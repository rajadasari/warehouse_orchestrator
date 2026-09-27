import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  FileCode, 
  RefreshCw,
  Search,
  Plus,
  Edit2
} from 'lucide-react';
import { 
  ResourceTemplateItem, 
  fetchResourceTemplatesApi, 
  deleteResourceTemplateApi,
  exportTemplatePackageApi,
  importTemplatePackageApi,
  TemplatePackageItem
} from '../../../services/resourceTemplateService';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';

export interface ResourceTemplatesTabProps {
  onOpenCreate?: () => void;
  onOpenEdit?: (template: ResourceTemplateItem) => void;
}

export const ResourceTemplatesTab: React.FC<ResourceTemplatesTabProps> = ({
  onOpenCreate,
  onOpenEdit
}) => {
  const [templates, setTemplates] = useState<ResourceTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchResourceTemplatesApi();
      setTemplates(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load templates';
      setStatusMessage({ text: msg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (templateCode: string) => {
    if (!window.confirm(`Delete template '${templateCode}' from database?`)) return;
    try {
      await deleteResourceTemplateApi(templateCode);
      setStatusMessage({ text: `Template '${templateCode}' deleted successfully`, type: 'success' });
      await loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setStatusMessage({ text: msg, type: 'error' });
    }
  };

  const handleExportSingle = async (templateCode: string) => {
    try {
      const pkg = await exportTemplatePackageApi(templateCode);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${templateCode.toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setStatusMessage({ text: msg, type: 'error' });
    }
  };

  const handleExportAll = async () => {
    try {
      const pkg = await exportTemplatePackageApi();
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_templates_package.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setStatusMessage({ text: msg, type: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const json = JSON.parse(event.target?.result as string) as TemplatePackageItem;
        const imported = await importTemplatePackageApi(json, true);
        setStatusMessage({ 
          text: `Successfully imported ${imported.length} template(s) from package!`, 
          type: 'success' 
        });
        await loadTemplates();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Import failed';
        setStatusMessage({ text: `Import failed: ${msg}`, type: 'error' });
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredTemplates = templates.filter(t => 
    !searchQuery.trim() ||
    t.templateCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '14px' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search template blueprint..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Create Template Primary Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenCreate && onOpenCreate()}
            leftIcon={<Plus size={14} />}
          >
            Create Template
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTemplates}
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>

          {/* Export All Package */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={templates.length === 0}
            leftIcon={<Download size={13} />}
            title="Export all database templates to portable JSON bundle"
          >
            Export All (.json)
          </Button>

          {/* Import Package */}
          <label style={{ display: 'inline-block' }}>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <span
              className="btn btn-secondary"
              style={{
                minHeight: '38px',
                padding: '0 14px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Upload size={13} />
              {isImporting ? 'Importing...' : 'Import Package (.json)'}
            </span>
          </label>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${statusMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
          fontSize: '12px',
          color: statusMessage.type === 'success' ? '#10B981' : '#EF4444',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '11px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Templates Table Container */}
      <div style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        overflow: 'auto'
      }}>
        {filteredTemplates.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 20px',
            color: 'var(--text-secondary)'
          }}>
            <FileCode size={36} style={{ opacity: 0.35, marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Templates in Database
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', maxWidth: '420px', textAlign: 'center' }}>
              The platform is in a 100% clean slate state. Click <strong>Import Package (.json)</strong> to promote templates from your Dev environment, or create new resources in Standalone mode.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: '8px 12px' }}>Template Code</th>
                <th style={{ padding: '8px 12px' }}>Name & Application</th>
                <th style={{ padding: '8px 12px' }}>Category</th>
                <th style={{ padding: '8px 12px' }}>Type / Protocol</th>
                <th style={{ padding: '8px 12px' }}>Schema Count</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(t => (
                <tr
                  key={t.templateCode}
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                >
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{t.templateCode}</span>
                      {t.systemTemplate && (
                        <span style={{
                          fontSize: '9px',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38BDF8',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}>
                          STANDARD
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.templateName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.application || 'Generic'}</div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant="neutral">{t.category}</Badge>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div>{t.resourceType}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.communicationProtocol}</div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {(t.propertySchema || []).length} properties, {(t.methodsSchema || []).length} methods
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onOpenEdit && onOpenEdit(t)}
                        title="Edit Template"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3B82F6',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportSingle(t.templateCode)}
                        title="Export Template Package (.json)"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38BDF8',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Download size={14} />
                      </button>
                      {!t.systemTemplate && (
                        <button
                          type="button"
                          onClick={() => handleDelete(t.templateCode)}
                          title="Delete Template"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
