import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Server, 
  Edit2, 
  Trash2, 
  Loader2, 
  Plus, 
  Network 
} from 'lucide-react';
import { ApiIntegrationMappingItem } from '../../../services/dynamicMappingService';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';

export interface MappingTableProps {
  mappings: ApiIntegrationMappingItem[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (mapping: ApiIntegrationMappingItem) => void;
  onDelete: (id: string, code: string) => Promise<void>;
}

export const MappingTable: React.FC<MappingTableProps> = ({
  mappings,
  isLoading,
  onOpenCreate,
  onOpenEdit,
  onDelete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'mappingCode',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={11} color="var(--text-disabled)" style={{ opacity: 0.5 }} />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={11} color="var(--color-primary-500)" /> 
      : <ChevronDown size={11} color="var(--color-primary-500)" />;
  };

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return <Badge variant="success">{method}</Badge>;
      case 'POST': return <Badge variant="info">{method}</Badge>;
      case 'PUT': return <Badge variant="warning">{method}</Badge>;
      case 'PATCH': return <Badge variant="info">{method}</Badge>;
      case 'DELETE': return <Badge variant="danger">{method}</Badge>;
      default: return <Badge variant="neutral">{method}</Badge>;
    }
  };

  // Filter and sort mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesGlobal = 
          m.mappingCode.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          m.operationType.toLowerCase().includes(q) ||
          (m.targetResourceId && m.targetResourceId.toLowerCase().includes(q)) ||
          m.httpMethod.toLowerCase().includes(q) ||
          m.endpointUrl.toLowerCase().includes(q);
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();

        if (key === 'status') {
          const statusStr = m.active ? 'active' : 'inactive';
          if (!statusStr.includes(val)) return false;
        }
        if (key === 'codeOrName') {
          const matchesCode = m.mappingCode.toLowerCase().includes(val);
          const matchesName = m.name.toLowerCase().includes(val);
          if (!matchesCode && !matchesName) return false;
        }
        if (key === 'operationType' && !m.operationType.toLowerCase().includes(val)) return false;
        if (key === 'targetResourceId') {
          const resStr = (m.targetResourceId || 'default any').toLowerCase();
          if (!resStr.includes(val)) return false;
        }
        if (key === 'endpoint') {
          const matchesMethod = m.httpMethod.toLowerCase().includes(val);
          const matchesUrl = m.endpointUrl.toLowerCase().includes(val);
          if (!matchesMethod && !matchesUrl) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA: any = (a as any)[sortConfig.key] ?? '';
      let valB: any = (b as any)[sortConfig.key] ?? '';

      if (sortConfig.key === 'status') {
        valA = a.active ? 1 : 0;
        valB = b.active ? 1 : 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [mappings, searchQuery, colFilters, sortConfig]);

  // Pagination calculations
  const totalRecords = filteredMappings.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedMappings = filteredMappings.slice(startIndex, endIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. Master Data Style Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        gap: '12px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {/* Search & Filter Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '4px 10px',
            width: '280px'
          }}>
            <Search size={13} color="var(--text-disabled)" />
            <input
              type="text"
              placeholder="Search by code, name, endpoint..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Button
            variant={showColFilters ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<SlidersHorizontal size={12} />}
            onClick={() => setShowColFilters(!showColFilters)}
          >
            Filters
          </Button>

          {(searchQuery || Object.keys(colFilters).length > 0) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<X size={12} />}
              onClick={() => {
                setSearchQuery('');
                setColFilters({});
                setCurrentPage(1);
              }}
              style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Rows per page & Add Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '5px',
                padding: '2px 5px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                outline: 'none'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={13} />}
            onClick={onOpenCreate}
          >
            Add Mapping
          </Button>
        </div>
      </div>

      {/* 2. Grid Table Container */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderBottom: 'none',
        flex: 1,
        minHeight: 0,
        overflow: 'auto'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '220px',
            color: 'var(--text-secondary)'
          }}>
            <Loader2 size={24} className="animate-spin" color="var(--color-primary-600)" />
            <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 500 }}>
              Loading API mappings and schemas...
            </p>
          </div>
        ) : filteredMappings.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '220px',
            color: 'var(--text-secondary)',
            padding: '40px 20px'
          }}>
            <Network size={32} style={{ opacity: 0.35, marginBottom: '10px' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No API Mappings Found
            </h3>
            <p style={{ margin: '4px 0 14px 0', fontSize: '12px' }}>
              {searchQuery || Object.keys(colFilters).length > 0
                ? 'No mappings match your active filter criteria.'
                : 'No API mappings configured in this category yet.'}
            </p>
            {(searchQuery || Object.keys(colFilters).length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setColFilters({});
                  setCurrentPage(1);
                }}
              >
                Reset Search
              </Button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th onClick={() => handleSort('status')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap', width: '90px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Status {getSortIcon('status')}
                  </div>
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Code & Name {getSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('operationType')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Operation {getSortIcon('operationType')}
                  </div>
                </th>
                <th onClick={() => handleSort('targetResourceId')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Target Resource {getSortIcon('targetResourceId')}
                  </div>
                </th>
                <th onClick={() => handleSort('endpointUrl')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Method & Endpoint {getSortIcon('endpointUrl')}
                  </div>
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap', width: '80px' }}>
                  Actions
                </th>
              </tr>

              {/* Column Filter Row */}
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter status..."
                      value={colFilters.status || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, status: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter code or name..."
                      value={colFilters.codeOrName || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, codeOrName: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter operation..."
                      value={colFilters.operationType || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, operationType: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter resource..."
                      value={colFilters.targetResourceId || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, targetResourceId: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter endpoint..."
                      value={colFilters.endpoint || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, endpoint: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}></th>
                </tr>
              )}
            </thead>

            <tbody>
              {pagedMappings.map(m => (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Status */}
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={m.active ? 'success' : 'neutral'}>
                      {m.active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </td>

                  {/* Code & Name */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ display: 'inline-block', marginTop: '2px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--color-primary-600)'
                      }}>
                        {m.mappingCode}
                      </span>
                    </div>
                  </td>

                  {/* Operation */}
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant="info">
                      {m.operationType}
                    </Badge>
                  </td>

                  {/* Target Resource */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Server size={13} color="var(--text-secondary)" />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {m.targetResourceId || 'Default / Any'}
                      </span>
                    </div>
                  </td>

                  {/* Method & Endpoint */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getMethodBadge(m.httpMethod)}
                      <span style={{
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)'
                      }}>
                        {m.endpointUrl}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => onOpenEdit(m)}
                        title="Edit / Test Mapping"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-primary-600)',
                          padding: '3px 5px',
                          borderRadius: '4px'
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(m.id, m.mappingCode)}
                        title="Delete Mapping"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: '3px 5px',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Master Data Style Pagination Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        fontSize: '11.5px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} mappings</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            onClick={() => setCurrentPage(1)} 
            disabled={safePage <= 1} 
            style={{ 
              padding: '3px 6px', 
              border: '1px solid var(--border-default)', 
              borderRadius: '4px', 
              background: 'var(--bg-surface-subtle)', 
              cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
              color: safePage <= 1 ? 'var(--text-disabled)' : 'var(--text-primary)'
            }}
          >
            <ChevronsLeft size={13} />
          </button>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={safePage <= 1} 
            style={{ 
              padding: '3px 6px', 
              border: '1px solid var(--border-default)', 
              borderRadius: '4px', 
              background: 'var(--bg-surface-subtle)', 
              cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
              color: safePage <= 1 ? 'var(--text-disabled)' : 'var(--text-primary)'
            }}
          >
            <ChevronLeft size={13} />
          </button>
          <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Page {safePage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={safePage >= totalPages} 
            style={{ 
              padding: '3px 6px', 
              border: '1px solid var(--border-default)', 
              borderRadius: '4px', 
              background: 'var(--bg-surface-subtle)', 
              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              color: safePage >= totalPages ? 'var(--text-disabled)' : 'var(--text-primary)'
            }}
          >
            <ChevronRight size={13} />
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)} 
            disabled={safePage >= totalPages} 
            style={{ 
              padding: '3px 6px', 
              border: '1px solid var(--border-default)', 
              borderRadius: '4px', 
              background: 'var(--bg-surface-subtle)', 
              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              color: safePage >= totalPages ? 'var(--text-disabled)' : 'var(--text-primary)'
            }}
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
