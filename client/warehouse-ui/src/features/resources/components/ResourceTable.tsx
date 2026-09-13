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
  Globe, 
  Copy, 
  Check, 
  Key, 
  Edit2, 
  Trash2, 
  Loader2, 
  Server, 
  Eye, 
  Plus 
} from 'lucide-react';
import { ResourceItem } from '../../../services/resourceService';
import { Badge, getStatusBadgeVariant } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';

export interface ResourceTableProps {
  resources: ResourceItem[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onOpenDetails: (res: ResourceItem) => void;
  onOpenMethods: (res: ResourceItem) => void;
  onOpenEdit: (res: ResourceItem) => void;
  onDelete: (resourceId: string) => Promise<void>;
  copiedIp: string | null;
  onCopyIp: (ip: string) => void;
}

export const ResourceTable: React.FC<ResourceTableProps> = ({
  resources,
  isLoading,
  onOpenCreate,
  onOpenDetails,
  onOpenMethods,
  onOpenEdit,
  onDelete,
  copiedIp,
  onCopyIp
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'resourceId',
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

  const getTypeBadgeVariant = (type: string): 'info' | 'success' | 'warning' | 'neutral' => {
    const t = type.toUpperCase();
    if (t === 'SOFTWARE' || t === 'WMS') return 'info';
    if (t === 'PLC' || t === 'EQUIPMENT' || t === 'DEVICE' || t === 'DEVICES') return 'info';
    if (t === 'HARDWARE') return 'warning';
    return 'neutral';
  };

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesGlobal = 
          res.resourceId.toLowerCase().includes(q) ||
          res.name.toLowerCase().includes(q) ||
          res.type.toLowerCase().includes(q) ||
          res.status.toLowerCase().includes(q) ||
          (res.ip && res.ip.toLowerCase().includes(q)) ||
          (res.customProperties && Object.entries(res.customProperties).some(
            ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
          ));
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();

        if (key === 'resourceId' && !res.resourceId.toLowerCase().includes(val)) return false;
        if (key === 'name' && !res.name.toLowerCase().includes(val)) return false;
        if (key === 'type' && !res.type.toLowerCase().includes(val)) return false;
        if (key === 'status' && !res.status.toLowerCase().includes(val)) return false;
        if (key === 'ip' && !(res.ip || '').toLowerCase().includes(val)) return false;
        if (key === 'customProperties') {
          const hasProp = res.customProperties && Object.entries(res.customProperties).some(
            ([k, v]) => k.toLowerCase().includes(val) || String(v).toLowerCase().includes(val)
          );
          if (!hasProp) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA: any = (a as any)[sortConfig.key] ?? '';
      let valB: any = (b as any)[sortConfig.key] ?? '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [resources, searchQuery, colFilters, sortConfig]);

  // Pagination calculation
  const totalRecords = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedResources = filteredResources.slice(startIndex, endIndex);

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
        {/* Left Side: Search & Filter Toggles */}
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
              placeholder="Search by ID, name, IP, or type..."
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

        {/* Right Side: Rows per page & Add Action */}
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
            Add Resource
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
              Loading resources from database...
            </p>
          </div>
        ) : filteredResources.length === 0 ? (
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
            <Server size={32} style={{ opacity: 0.35, marginBottom: '10px' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Resources Found
            </h3>
            <p style={{ margin: '4px 0 14px 0', fontSize: '12px' }}>
              {searchQuery || Object.keys(colFilters).length > 0
                ? 'No resources match your active filter criteria.'
                : 'No resources have been configured in this category yet.'}
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
                <th onClick={() => handleSort('resourceId')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Resource ID {getSortIcon('resourceId')}
                  </div>
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Name {getSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('type')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Type {getSortIcon('type')}
                  </div>
                </th>
                <th onClick={() => handleSort('status')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Status {getSortIcon('status')}
                  </div>
                </th>
                <th onClick={() => handleSort('ip')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    IP Address {getSortIcon('ip')}
                  </div>
                </th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  Custom Properties
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  Actions
                </th>
              </tr>

              {/* Column Filter Row */}
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter ID..."
                      value={colFilters.resourceId || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, resourceId: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter Name..."
                      value={colFilters.name || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, name: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter Type..."
                      value={colFilters.type || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, type: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter Status..."
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
                      placeholder="Filter IP..."
                      value={colFilters.ip || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, ip: e.target.value });
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input
                      type="text"
                      placeholder="Filter props..."
                      value={colFilters.customProperties || ''}
                      onChange={e => {
                        setColFilters({ ...colFilters, customProperties: e.target.value });
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
              {pagedResources.map(res => {
                const isCopied = copiedIp === res.ip;

                return (
                  <tr
                    key={res.id || res.resourceId}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Resource ID */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, fontFamily: 'monospace' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-default)',
                        fontSize: '11.5px',
                        color: 'var(--color-primary-600)'
                      }}>
                        {res.resourceId}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {res.name}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '8px 12px' }}>
                      <Badge variant={getTypeBadgeVariant(res.type)}>
                        {res.type}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '8px 12px' }}>
                      <Badge variant={getStatusBadgeVariant(res.status)}>
                        {res.status || 'ACTIVE'}
                      </Badge>
                    </td>

                    {/* IP Address */}
                    <td style={{ padding: '8px 12px' }}>
                      {res.ip ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={13} color="var(--text-secondary)" />
                          <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-primary)' }}>
                            {res.ip}
                          </span>
                          <button
                            type="button"
                            onClick={() => onCopyIp(res.ip!)}
                            title="Copy IP"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: '2px',
                              color: isCopied ? '#10B981' : 'var(--text-secondary)'
                            }}
                          >
                            {isCopied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic', fontSize: '11px' }}>
                          None configured
                        </span>
                      )}
                    </td>

                    {/* Custom Properties */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {res.customProperties && Object.keys(res.customProperties).length > 0 ? (
                          <>
                            {Object.entries(res.customProperties)
                              .slice(0, 2)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  style={{
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '10.5px',
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  <strong style={{ color: 'var(--text-primary)' }}>{k}:</strong>{' '}
                                  {typeof v === 'object' ? '{...}' : String(v)}
                                </span>
                              ))}
                            {Object.keys(res.customProperties).length > 2 && (
                              <button
                                type="button"
                                onClick={() => onOpenDetails(res)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: '10.5px',
                                  color: 'var(--color-primary-600)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  padding: 0
                                }}
                              >
                                +{Object.keys(res.customProperties).length - 2} more
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => onOpenMethods(res)}
                          title="Configure Methods & Auth"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#D97706',
                            padding: '3px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          <Key size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDetails(res)}
                          title="View Details"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '3px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(res)}
                          title="Edit Resource"
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
                          onClick={() => onDelete(res.resourceId)}
                          title="Delete Resource"
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
                );
              })}
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
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} resources</div>
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
