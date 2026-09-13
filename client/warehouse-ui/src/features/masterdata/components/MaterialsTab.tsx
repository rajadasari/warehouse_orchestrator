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
  Package 
} from 'lucide-react';
import { 
  masterDataService, 
  ItemMaster, 
  CustomAttributeDef 
} from '../../../services/masterDataService';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';

export interface MaterialsTabProps {
  items: ItemMaster[];
  customAttrs: CustomAttributeDef[];
  onRefresh: () => void;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
  items,
  customAttrs,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'itemCode',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'RAW_MATERIAL' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [newBaseUom, setNewBaseUom] = useState<'KG' | 'LITER' | 'EA'>('KG');
  const [newAllowMixed, setNewAllowMixed] = useState(true);
  const [newMixedGroup, setNewMixedGroup] = useState('GENERAL');
  const [newItemDynAttrs, setNewItemDynAttrs] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Item Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [editItemCode, setEditItemCode] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editItemType, setEditItemType] = useState<'RAW_MATERIAL' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [editBaseUom, setEditBaseUom] = useState<'KG' | 'LITER' | 'EA'>('KG');
  const [editAllowMixed, setEditAllowMixed] = useState(true);
  const [editMixedGroup, setEditMixedGroup] = useState('GENERAL');
  const [editItemStatus, setEditItemStatus] = useState('ACTIVE');
  const [editItemDynAttrs, setEditItemDynAttrs] = useState<Record<string, any>>({});

  // Dynamic Custom Attribute Columns for ITEM entity
  const itemCustomAttrs = useMemo(() => {
    const definedMap = new Map<string, { code: string; label: string; uom?: string }>();
    customAttrs
      .filter(a => a.targetEntity === 'ITEM' && a.isActive)
      .forEach(a => {
        definedMap.set(a.attributeCode, {
          code: a.attributeCode,
          label: a.label,
          uom: a.unitOfMeasure
        });
      });

    items.forEach(item => {
      if (item.customAttributes && typeof item.customAttributes === 'object') {
        Object.keys(item.customAttributes).forEach(k => {
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
  }, [customAttrs, items]);

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

  // Create Item Handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newItemName) return;
    setIsSubmitting(true);
    try {
      await masterDataService.createItem({
        itemCode: newItemCode.trim(),
        name: newItemName.trim(),
        itemType: newItemType,
        baseUom: newBaseUom,
        allowMixedPallet: newAllowMixed,
        mixedPalletGroup: newMixedGroup.trim() || 'GENERAL',
        status: 'ACTIVE',
        customAttributes: newItemDynAttrs
      });
      setIsAddModalOpen(false);
      setNewItemCode('');
      setNewItemName('');
      setNewItemDynAttrs({});
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEdit = (item: ItemMaster) => {
    setEditingItemId(item.id);
    setEditItemCode(item.itemCode);
    setEditItemName(item.name);
    setEditItemType((item.itemType as any) || 'RAW_MATERIAL');
    setEditBaseUom((item.baseUom as any) || 'KG');
    setEditAllowMixed(item.allowMixedPallet);
    setEditMixedGroup(item.mixedPalletGroup || 'GENERAL');
    setEditItemStatus(item.status || 'ACTIVE');
    setEditItemDynAttrs({ ...(item.customAttributes || {}) });
    setIsEditModalOpen(true);
  };

  // Update Item Handler
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId || !editItemCode || !editItemName) return;
    setIsSubmitting(true);
    try {
      await masterDataService.updateItem(editingItemId, {
        itemCode: editItemCode.trim(),
        name: editItemName.trim(),
        itemType: editItemType,
        baseUom: editBaseUom,
        allowMixedPallet: editAllowMixed,
        mixedPalletGroup: editMixedGroup.trim() || 'GENERAL',
        status: editItemStatus,
        customAttributes: editItemDynAttrs
      });
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Item Handler
  const handleDelete = async (item: ItemMaster) => {
    if (!window.confirm(`Are you sure you want to delete material "${item.itemCode} - ${item.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await masterDataService.deleteItem(item.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  // Filtering & Sorting Pipeline
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = 
          item.itemCode.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.itemType.toLowerCase().includes(q) ||
          item.baseUom.toLowerCase().includes(q) ||
          (item.mixedPalletGroup && item.mixedPalletGroup.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'itemCode' && !item.itemCode.toLowerCase().includes(val)) return false;
        if (key === 'name' && !item.name.toLowerCase().includes(val)) return false;
        if (key === 'itemType' && !item.itemType.toLowerCase().includes(val)) return false;
        if (key === 'baseUom' && !item.baseUom.toLowerCase().includes(val)) return false;
        if (key === 'mixedPalletGroup' && !(item.mixedPalletGroup || '').toLowerCase().includes(val)) return false;
        if (key === 'status' && !(item.status || '').toLowerCase().includes(val)) return false;
        if (key.startsWith('attr_')) {
          const attrCode = key.replace('attr_', '');
          const propVal = item.customAttributes?.[attrCode];
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
  }, [items, searchQuery, colFilters, sortConfig]);

  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedItems = filteredItems.slice(startIndex, endIndex);

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
              placeholder="Search materials by code, name..."
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
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Material
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
              <th onClick={() => handleSort('itemCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Material Code {getSortIcon('itemCode')}
                </div>
              </th>
              <th onClick={() => handleSort('name')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Material Name {getSortIcon('name')}
                </div>
              </th>
              <th onClick={() => handleSort('itemType')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Item Type {getSortIcon('itemType')}
                </div>
              </th>
              <th onClick={() => handleSort('baseUom')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Base UOM {getSortIcon('baseUom')}
                </div>
              </th>
              <th onClick={() => handleSort('allowMixedPallet')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Allow Mixed {getSortIcon('allowMixedPallet')}
                </div>
              </th>
              <th onClick={() => handleSort('mixedPalletGroup')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Mixed Group {getSortIcon('mixedPalletGroup')}
                </div>
              </th>
              <th onClick={() => handleSort('status')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status {getSortIcon('status')}
                </div>
              </th>
              {itemCustomAttrs.map(attr => (
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
                {['itemCode', 'name', 'itemType', 'baseUom', 'allowMixedPallet', 'mixedPalletGroup', 'status'].map(key => (
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
                {itemCustomAttrs.map(attr => (
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
            {pagedItems.length === 0 ? (
              <tr>
                <td colSpan={8 + itemCustomAttrs.length} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Package size={28} style={{ opacity: 0.35, margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No materials found matching criteria.</div>
                </td>
              </tr>
            ) : (
              pagedItems.map(item => (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {item.itemCode}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={item.itemType === 'FINISHED_GOOD' ? 'success' : 'info'}>
                      {item.itemType}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                    {item.baseUom}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={item.allowMixedPallet ? 'success' : 'neutral'}>
                      {item.allowMixedPallet ? 'YES' : 'NO'}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {item.mixedPalletGroup || '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {item.status || 'ACTIVE'}
                    </Badge>
                  </td>
                  {itemCustomAttrs.map(attr => (
                    <td key={attr.code} style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {item.customAttributes?.[attr.code] != null ? String(item.customAttributes[attr.code]) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        title="Edit Material"
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
                        onClick={() => handleDelete(item)}
                        title="Delete Material"
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
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} materials</div>
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

      {/* Add Material Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Material Item"
        subtitle="Create material record in wes.item_master"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Item Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ITM-COFFEE-01"
                value={newItemCode}
                onChange={e => setNewItemCode(e.target.value.toUpperCase())}
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
                Item Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Organic Arabica Beans"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
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
                Item Type
              </label>
              <select
                value={newItemType}
                onChange={e => setNewItemType(e.target.value as any)}
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
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="FINISHED_GOOD">Finished Good</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Base UOM
              </label>
              <select
                value={newBaseUom}
                onChange={e => setNewBaseUom(e.target.value as any)}
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
                <option value="KG">Kilogram (KG)</option>
                <option value="LITER">Liter (LITER)</option>
                <option value="EA">Each (EA)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Mixed Pallet Group
              </label>
              <input
                type="text"
                placeholder="e.g. GENERAL, COLD_CHAIN"
                value={newMixedGroup}
                onChange={e => setNewMixedGroup(e.target.value.toUpperCase())}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
              <input
                type="checkbox"
                id="newItemMixedCheck"
                checked={newAllowMixed}
                onChange={e => setNewAllowMixed(e.target.checked)}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <label htmlFor="newItemMixedCheck" style={{ fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                Allow Mixed Pallet Stacking
              </label>
            </div>
          </div>

          {/* Dynamic Item Attributes */}
          {customAttrs.filter(a => a.targetEntity === 'ITEM' && a.isActive).length > 0 && (
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
                {customAttrs.filter(a => a.targetEntity === 'ITEM' && a.isActive).map(attr => (
                  <div key={attr.id}>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px' }}>
                      {attr.label} {attr.unitOfMeasure ? `(${attr.unitOfMeasure})` : ''}
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter ${attr.label}...`}
                      value={newItemDynAttrs[attr.attributeCode] || ''}
                      onChange={e => setNewItemDynAttrs(prev => ({ ...prev, [attr.attributeCode]: e.target.value }))}
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
              Create Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Material Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Material Item"
        subtitle={`Updating ${editItemCode}`}
      >
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Item Code *
              </label>
              <input
                type="text"
                required
                value={editItemCode}
                onChange={e => setEditItemCode(e.target.value.toUpperCase())}
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
                Item Name *
              </label>
              <input
                type="text"
                required
                value={editItemName}
                onChange={e => setEditItemName(e.target.value)}
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
                Item Type
              </label>
              <select
                value={editItemType}
                onChange={e => setEditItemType(e.target.value as any)}
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
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="FINISHED_GOOD">Finished Good</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Status
              </label>
              <select
                value={editItemStatus}
                onChange={e => setEditItemStatus(e.target.value)}
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
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="PHASE_OUT">PHASE_OUT</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Mixed Pallet Group
              </label>
              <input
                type="text"
                value={editMixedGroup}
                onChange={e => setEditMixedGroup(e.target.value.toUpperCase())}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
              <input
                type="checkbox"
                id="editItemMixedCheck"
                checked={editAllowMixed}
                onChange={e => setEditAllowMixed(e.target.checked)}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <label htmlFor="editItemMixedCheck" style={{ fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                Allow Mixed Pallet Stacking
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
