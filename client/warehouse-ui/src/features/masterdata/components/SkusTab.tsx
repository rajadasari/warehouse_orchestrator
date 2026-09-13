import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Edit2, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Boxes 
} from 'lucide-react';
import { 
  masterDataService, 
  SkuMaster, 
  ItemMaster, 
  CustomAttributeDef 
} from '../../../services/masterDataService';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';

export interface SkusTabProps {
  skus: SkuMaster[];
  items: ItemMaster[];
  customAttrs: CustomAttributeDef[];
  onRefresh: () => void;
}

export const SkusTab: React.FC<SkusTabProps> = ({
  skus,
  items,
  customAttrs,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'skuCode',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add SKU Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSkuCode, setNewSkuCode] = useState('');
  const [newSkuItemId, setNewSkuItemId] = useState('');
  const [newPackageType, setNewPackageType] = useState<'CAN' | 'BAG' | 'CARTON' | 'DRUM' | 'LOOSE'>('BAG');
  const [newUnitsPerPack, setNewUnitsPerPack] = useState(25);
  const [newBarcode, setNewBarcode] = useState('');
  const [newSkuDims, setNewSkuDims] = useState('');
  const [newIsFragile, setNewIsFragile] = useState(false);
  const [newSkuDynAttrs, setNewSkuDynAttrs] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit SKU Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSkuId, setEditingSkuId] = useState('');
  const [editSkuCode, setEditSkuCode] = useState('');
  const [editSkuItemId, setEditSkuItemId] = useState('');
  const [editPackageType, setEditPackageType] = useState<'CAN' | 'BAG' | 'CARTON' | 'DRUM' | 'LOOSE'>('BAG');
  const [editUnitsPerPack, setEditUnitsPerPack] = useState(25);
  const [editBarcode, setEditBarcode] = useState('');
  const [editSkuIsActive, setEditSkuIsActive] = useState(true);
  const [editSkuDynAttrs, setEditSkuDynAttrs] = useState<Record<string, any>>({});

  // Dynamic Custom Attribute Columns for SKU entity
  const skuCustomAttrs = useMemo(() => {
    const definedMap = new Map<string, { code: string; label: string; uom?: string }>();
    customAttrs
      .filter(a => a.targetEntity === 'SKU' && a.isActive)
      .forEach(a => {
        definedMap.set(a.attributeCode, {
          code: a.attributeCode,
          label: a.label,
          uom: a.unitOfMeasure
        });
      });

    skus.forEach(sku => {
      if (sku.customAttributes && typeof sku.customAttributes === 'object') {
        Object.keys(sku.customAttributes).forEach(k => {
          if (!definedMap.has(k)) {
            const formattedLabel = k
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
            definedMap.set(k, { code: k, label: formattedLabel });
          }
        });
      }
    });

    return Array.from(definedMap.values());
  }, [customAttrs, skus]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={11} color="var(--text-disabled)" style={{ opacity: 0.5 }} />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={11} color="var(--color-primary-500)" /> 
      : <ChevronDown size={11} color="var(--color-primary-500)" />;
  };

  const openAdd = () => {
    setNewSkuCode('');
    setNewSkuItemId(items.length > 0 ? items[0].id : '');
    setNewPackageType('BAG');
    setNewUnitsPerPack(25);
    setNewBarcode('');
    setNewSkuDims('');
    setNewIsFragile(false);
    setNewSkuDynAttrs({});
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkuCode || !newSkuItemId) return;
    setIsSubmitting(true);
    try {
      await masterDataService.createSku({
        skuCode: newSkuCode.trim(),
        itemId: newSkuItemId,
        packageType: newPackageType,
        unitsPerPackage: Number(newUnitsPerPack),
        barcode: newBarcode.trim() || undefined,
        isActive: true,
        customAttributes: {
          sku_dimensions_mm: newSkuDims.trim() || undefined,
          is_fragile: newIsFragile,
          ...newSkuDynAttrs
        }
      });
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (sku: SkuMaster) => {
    setEditingSkuId(sku.id);
    setEditSkuCode(sku.skuCode);
    setEditSkuItemId(sku.itemId);
    setEditPackageType((sku.packageType as any) || 'BAG');
    setEditUnitsPerPack(sku.unitsPerPackage || 1);
    setEditBarcode(sku.barcode || '');
    setEditSkuIsActive(sku.isActive);
    setEditSkuDynAttrs({ ...(sku.customAttributes || {}) });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkuId || !editSkuCode || !editSkuItemId) return;
    setIsSubmitting(true);
    try {
      await masterDataService.updateSku(editingSkuId, {
        skuCode: editSkuCode.trim(),
        itemId: editSkuItemId,
        packageType: editPackageType,
        unitsPerPackage: Number(editUnitsPerPack),
        barcode: editBarcode.trim() || undefined,
        isActive: editSkuIsActive,
        customAttributes: editSkuDynAttrs
      });
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sku: SkuMaster) => {
    if (!window.confirm(`Are you sure you want to delete SKU "${sku.skuCode}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await masterDataService.deleteSku(sku.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete SKU');
    }
  };

  const filteredSkus = useMemo(() => {
    return skus.filter(sku => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = 
          sku.skuCode.toLowerCase().includes(q) ||
          (sku.itemName && sku.itemName.toLowerCase().includes(q)) ||
          (sku.packageType && sku.packageType.toLowerCase().includes(q)) ||
          (sku.barcode && sku.barcode.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'skuCode' && !sku.skuCode.toLowerCase().includes(val)) return false;
        if (key === 'itemName' && !(sku.itemName || '').toLowerCase().includes(val)) return false;
        if (key === 'packageType' && !(sku.packageType || '').toLowerCase().includes(val)) return false;
        if (key === 'unitsPerPackage' && !String(sku.unitsPerPackage || '').includes(val)) return false;
        if (key === 'barcode' && !(sku.barcode || '').toLowerCase().includes(val)) return false;
        if (key.startsWith('attr_')) {
          const attrCode = key.replace('attr_', '');
          const propVal = sku.customAttributes?.[attrCode];
          if (propVal === undefined || propVal === null) return false;
          if (!String(propVal).toLowerCase().includes(val)) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA: any = (a as any)[sortConfig.key] ?? '';
      let valB: any = (b as any)[sortConfig.key] ?? '';
      if (sortConfig.key.startsWith('attr_')) {
        const attrCode = sortConfig.key.replace('attr_', '');
        valA = a.customAttributes?.[attrCode] ?? '';
        valB = b.customAttributes?.[attrCode] ?? '';
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [skus, searchQuery, colFilters, sortConfig]);

  const totalRecords = filteredSkus.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedSkus = filteredSkus.slice(startIndex, endIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Controls Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '4px 10px',
            width: '260px'
          }}>
            <Search size={13} color="var(--text-disabled)" />
            <input
              type="text"
              placeholder="Search SKUs by code, packaging..."
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
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}>
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
            onClick={openAdd}
          >
            Add Packaging SKU
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 0 10px 10px',
        flex: 1,
        minHeight: 0,
        overflow: 'auto'
      }}>
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
              <th onClick={() => handleSort('skuCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  SKU Code {getSortIcon('skuCode')}
                </div>
              </th>
              <th onClick={() => handleSort('itemName')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Parent Material {getSortIcon('itemName')}
                </div>
              </th>
              <th onClick={() => handleSort('packageType')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Package Type {getSortIcon('packageType')}
                </div>
              </th>
              <th onClick={() => handleSort('unitsPerPackage')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Units / Pack {getSortIcon('unitsPerPackage')}
                </div>
              </th>
              <th onClick={() => handleSort('barcode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Barcode {getSortIcon('barcode')}
                </div>
              </th>
              <th onClick={() => handleSort('isActive')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status {getSortIcon('isActive')}
                </div>
              </th>
              {skuCustomAttrs.map(attr => (
                <th key={attr.code} onClick={() => handleSort(`attr_${attr.code}`)} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#B45309' }}>
                    {attr.label} {getSortIcon(`attr_${attr.code}`)}
                  </div>
                </th>
              ))}
              <th style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>

            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                {['skuCode', 'itemName', 'packageType', 'unitsPerPackage', 'barcode', 'isActive'].map(key => (
                  <th key={key} style={{ padding: '3px 6px' }}>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={colFilters[key] || ''}
                      onChange={e => {
                        setColFilters(prev => ({ ...prev, [key]: e.target.value }));
                        setCurrentPage(1);
                      }}
                      style={{
                        width: '100%',
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </th>
                ))}
                {skuCustomAttrs.map(attr => (
                  <th key={attr.code} style={{ padding: '3px 6px' }}>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={colFilters[`attr_${attr.code}`] || ''}
                      onChange={e => {
                        setColFilters(prev => ({ ...prev, [`attr_${attr.code}`]: e.target.value }));
                        setCurrentPage(1);
                      }}
                      style={{
                        width: '100%',
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </th>
                ))}
                <th style={{ padding: '3px 6px' }} />
              </tr>
            )}
          </thead>

          <tbody>
            {pagedSkus.length === 0 ? (
              <tr>
                <td colSpan={7 + skuCustomAttrs.length} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Boxes size={28} style={{ opacity: 0.35, margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No SKUs found matching criteria.</div>
                </td>
              </tr>
            ) : (
              pagedSkus.map(sku => (
                <tr
                  key={sku.id}
                  style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {sku.skuCode}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sku.itemName || '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant="info">
                      {sku.packageType}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    {sku.unitsPerPackage}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {sku.barcode || '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={sku.isActive ? 'success' : 'neutral'}>
                      {sku.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </td>
                  {skuCustomAttrs.map(attr => (
                    <td key={attr.code} style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {sku.customAttributes?.[attr.code] != null ? String(sku.customAttributes[attr.code]) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(sku)}
                        title="Edit SKU"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-primary-600)',
                          padding: '3px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sku)}
                        title="Delete SKU"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: '3px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
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
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} packaging SKUs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setCurrentPage(1)} disabled={safePage <= 1} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronsLeft size={13} />
          </button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Page {safePage} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={safePage >= totalPages} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>

      {/* Add SKU Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Packaging SKU Master"
        subtitle="Create SKU container record in wes.sku_master"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                SKU Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SKU-CF-BAG-25"
                value={newSkuCode}
                onChange={e => setNewSkuCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Parent Material Item *
              </label>
              <select
                required
                value={newSkuItemId}
                onChange={e => setNewSkuItemId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.itemCode} — {it.name} ({it.baseUom})
                  </option>
                ))}
                {items.length === 0 && (
                  <option value="">No materials available</option>
                )}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Package Container Type
              </label>
              <select
                value={newPackageType}
                onChange={e => setNewPackageType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="BAG">Bag / Sack (BAG)</option>
                <option value="CARTON">Carton / Box (CARTON)</option>
                <option value="CAN">Can / Tin (CAN)</option>
                <option value="DRUM">Drum / Barrel (DRUM)</option>
                <option value="LOOSE">Loose Bulk (LOOSE)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Units / Weight Per Package *
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={newUnitsPerPack}
                onChange={e => setNewUnitsPerPack(parseFloat(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Barcode / GTIN
              </label>
              <input
                type="text"
                placeholder="e.g. 8901234567890"
                value={newBarcode}
                onChange={e => setNewBarcode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Package Dimensions (L x W x H mm)
              </label>
              <input
                type="text"
                placeholder="e.g. 400x300x200"
                value={newSkuDims}
                onChange={e => setNewSkuDims(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Dynamic SKU Attributes */}
          {customAttrs.filter(a => a.targetEntity === 'SKU' && a.isActive).length > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', marginBottom: '8px' }}>
                Custom Field Attributes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {customAttrs.filter(a => a.targetEntity === 'SKU' && a.isActive).map(attr => (
                  <div key={attr.id}>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px' }}>
                      {attr.label} {attr.unitOfMeasure ? `(${attr.unitOfMeasure})` : ''}
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter ${attr.label}...`}
                      value={newSkuDynAttrs[attr.attributeCode] || ''}
                      onChange={e => setNewSkuDynAttrs(prev => ({ ...prev, [attr.attributeCode]: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Packaging SKU
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit SKU Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Packaging SKU"
        subtitle={`Updating ${editSkuCode}`}
      >
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                SKU Code *
              </label>
              <input
                type="text"
                required
                value={editSkuCode}
                onChange={e => setEditSkuCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Parent Material Item *
              </label>
              <select
                required
                value={editSkuItemId}
                onChange={e => setEditSkuItemId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.itemCode} — {it.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Package Container Type
              </label>
              <select
                value={editPackageType}
                onChange={e => setEditPackageType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="BAG">Bag / Sack (BAG)</option>
                <option value="CARTON">Carton / Box (CARTON)</option>
                <option value="CAN">Can / Tin (CAN)</option>
                <option value="DRUM">Drum / Barrel (DRUM)</option>
                <option value="LOOSE">Loose Bulk (LOOSE)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Units / Weight Per Package
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={editUnitsPerPack}
                onChange={e => setEditUnitsPerPack(parseFloat(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Barcode
              </label>
              <input
                type="text"
                value={editBarcode}
                onChange={e => setEditBarcode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
              <input
                type="checkbox"
                id="editSkuActiveCheck"
                checked={editSkuIsActive}
                onChange={e => setEditSkuIsActive(e.target.checked)}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <label htmlFor="editSkuActiveCheck" style={{ fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                Active SKU Status
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
