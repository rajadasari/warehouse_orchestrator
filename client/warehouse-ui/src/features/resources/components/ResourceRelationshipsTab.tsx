import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  GitCommit, 
  ArrowRight, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Activity, 
  Radio
} from 'lucide-react';
import { 
  resourceRelationshipService, 
  ResourceRelationshipItem, 
  RelationCategory 
} from '../../../services/resourceRelationshipService';
import { ResourceItem } from '../../../services/resourceService';
import { Button } from '../../../components/common/Button';
import { Badge, BadgeVariant } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Alert } from '../../../components/common/Alert';
import { CreateRelationshipModal } from './CreateRelationshipModal';

export interface ResourceRelationshipsTabProps {
  resources: ResourceItem[];
}

export const ResourceRelationshipsTab: React.FC<ResourceRelationshipsTabProps> = ({ resources }) => {
  const [relationships, setRelationships] = useState<ResourceRelationshipItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | RelationCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRelationships = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await resourceRelationshipService.getRelationships(
        categoryFilter === 'ALL' ? undefined : categoryFilter
      );
      setRelationships(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load relationships';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to remove relationship: ${label}?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await resourceRelationshipService.deleteRelationship(id);
      setSuccessMessage(`Removed relationship: ${label}`);
      await loadRelationships();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete relationship';
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredList = useMemo(() => {
    let list = relationships;
    if (categoryFilter !== 'ALL') {
      list = list.filter(r => r.relationCategory === categoryFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(r => 
        r.sourceResourceId.toLowerCase().includes(q) ||
        r.targetResourceId.toLowerCase().includes(q) ||
        r.relationType.toLowerCase().includes(q)
      );
    }
    return list;
  }, [relationships, categoryFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = relationships.length;
    const material = relationships.filter(r => r.relationCategory === 'MATERIAL_FLOW').length;
    const info = relationships.filter(r => r.relationCategory === 'INFORMATION_FLOW').length;
    return { total, material, info };
  }, [relationships]);

  const getRelationBadgeVariant = (type: string): BadgeVariant => {
    switch (type) {
      case 'TRANSFERS_TO': return 'success';
      case 'DATA_SOURCE_FOR': return 'info';
      case 'CONTROLS': return 'warning';
      case 'ATTACHED_TO': return 'info';
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

      {successMessage && (
        <Alert variant="success" title="Success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Action Header & Statistics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn ${categoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('ALL')}
          >
            All Links ({stats.total})
          </button>
          <button
            type="button"
            className={`btn ${categoryFilter === 'MATERIAL_FLOW' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('MATERIAL_FLOW')}
          >
            <Activity size={16} style={{ marginRight: '6px' }} />
            Material Flow ({stats.material})
          </button>
          <button
            type="button"
            className={`btn ${categoryFilter === 'INFORMATION_FLOW' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '48px', minWidth: '48px' }}
            onClick={() => setCategoryFilter('INFORMATION_FLOW')}
          >
            <Radio size={16} style={{ marginRight: '6px' }} />
            Information Flow ({stats.info})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Input
            placeholder="Search topology by resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="search-input-wrap"
          />
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw size={16} className={isLoading ? 'spin' : ''} />}
            onClick={loadRelationships}
            disabled={isLoading}
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateModalOpen(true)}
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            Add Link
          </Button>
        </div>
      </div>

      {/* High-density Relationships Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Source Resource</th>
              <th style={{ textAlign: 'center', padding: '12px 16px' }}>Topology Connection</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Target Resource</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Configuration / Properties</th>
              <th style={{ textAlign: 'center', padding: '12px 16px' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && relationships.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                  <RefreshCw size={24} className="spin text-primary" style={{ margin: '0 auto 8px' }} />
                  <div>Loading topology relationships...</div>
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                  <GitCommit size={32} className="text-muted" style={{ margin: '0 auto 8px' }} />
                  <div style={{ color: 'var(--text-secondary)' }}>No relationships found for selected criteria.</div>
                </td>
              </tr>
            ) : (
              filteredList.map((rel) => {
                const propCount = rel.properties ? Object.keys(rel.properties).length : 0;
                const propSummary = rel.properties 
                  ? Object.entries(rel.properties).map(([k, v]) => `${k}: ${String(v)}`).join(', ')
                  : '';
                const displayLabel = `${rel.sourceResourceId} -> ${rel.targetResourceId}`;

                return (
                  <tr key={rel.id}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <span className="font-mono text-cyan">{rel.sourceResourceId}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowRight size={14} className="text-muted" />
                        <Badge variant={getRelationBadgeVariant(rel.relationType)}>
                          {rel.relationType}
                        </Badge>
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <span className="font-mono text-emerald">{rel.targetResourceId}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={rel.relationCategory === 'MATERIAL_FLOW' ? 'success' : 'info'}>
                        {rel.relationCategory === 'MATERIAL_FLOW' ? 'Material Flow' : 'Info Flow'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                      {propCount > 0 ? (
                        <div 
                          className="font-mono" 
                          style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={propSummary}
                        >
                          {propSummary}
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {rel.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Delete relationship"
                        onClick={() => handleDelete(rel.id, displayLabel)}
                        disabled={deletingId === rel.id}
                        style={{ minHeight: '48px', minWidth: '48px' }}
                      >
                        <Trash2 size={16} className="text-danger" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {createModalOpen && (
        <CreateRelationshipModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          resources={resources}
          onSuccess={(msg) => setSuccessMessage(msg)}
          onRefresh={loadRelationships}
        />
      )}
    </div>
  );
};
