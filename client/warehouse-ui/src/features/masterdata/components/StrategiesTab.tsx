import React, { useState, useMemo } from 'react';
import { 
  Plus, 
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
  Settings2 
} from 'lucide-react';
import { 
  masterDataService, 
  PalletHandlingStrategy, 
  ItemMaster, 
  SkuMaster, 
  PalletType, 
  CustomAttributeDef 
} from '../../../services/masterDataService';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';

export interface StrategiesTabProps {
  strategies: PalletHandlingStrategy[];
  items: ItemMaster[];
  skus: SkuMaster[];
  palletTypes: PalletType[];
  customAttrs: CustomAttributeDef[];
  onRefresh: () => void;
}

export const StrategiesTab: React.FC<StrategiesTabProps> = ({
  strategies,
  items,
  skus,
  palletTypes,
  customAttrs,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'strategyCode',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Strategy Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStratCode, setNewStratCode] = useState('');
  const [newStratName, setNewStratName] = useState('');
  const [newStratItemId, setNewStratItemId] = useState('');
  const [newStratSkuId, setNewStratSkuId] = useState('');
  const [newStratPalletTypeId, setNewStratPalletTypeId] = useState('');
  const [newFullLayerQty, setNewFullLayerQty] = useState(5);
  const [newMaxLayers, setNewMaxLayers] = useState(8);
  const [newExpectedWeight, setNewExpectedWeight] = useState(1025);
  const [newExpectedHeight, setNewExpectedHeight] = useState(1584);
  const [newLoadBearing, setNewLoadBearing] = useState('DOUBLE_STACKABLE');
  const [newStratDynAttrs, setNewStratDynAttrs] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Custom Attribute Columns for HANDLING_STRATEGY entity
  const strategyCustomAttrs = useMemo(() => {
    const definedMap = new Map<string, { code: string; label: string; uom?: string }>();
    customAttrs
      .filter(a => a.targetEntity === 'HANDLING_STRATEGY' && a.isActive)
      .forEach(a => {
        definedMap.set(a.attributeCode, {
          code: a.attributeCode,
          label: a.label,
          uom: a.unitOfMeasure
        });
      });

    strategies.forEach(st => {
      if (st.customAttributes && typeof st.customAttributes === 'object') {
        Object.keys(st.customAttributes).forEach(k => {
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
  }, [customAttrs, strategies]);

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
    const defaultItem = items.length > 0 ? items[0] : null;
    const defaultSku = skus.length > 0 ? skus[0] : null;
    const defaultPalletType = palletTypes.length > 0 ? palletTypes[0] : null;

    setNewStratCode('');
    setNewStratName('');
    setNewStratItemId(defaultItem ? defaultItem.id : '');
    setNewStratSkuId(defaultSku ? defaultSku.id : '');
    setNewStratPalletTypeId(defaultPalletType ? defaultPalletType.id : '');
    setNewFullLayerQty(5);
    setNewMaxLayers(8);

    const tare = defaultPalletType?.tareWeightKg || 25;
    const unitWt = defaultSku?.unitsPerPackage || 25;
    const totalWeight = tare + (5 * 8 * unitWt);
    setNewExpectedWeight(totalWeight);
    setNewExpectedHeight(1584);
    setNewLoadBearing('DOUBLE_STACKABLE');
    setNewStratDynAttrs({});
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStratCode || !newStratName || !newStratItemId || !newStratPalletTypeId) return;
    setIsSubmitting(true);
    try {
      await masterDataService.createStrategy({
        strategyCode: newStratCode.trim(),
        name: newStratName.trim(),
        itemId: newStratItemId,
        skuId: newStratSkuId || (skus.length > 0 ? skus[0].id : ''),
        palletTypeId: newStratPalletTypeId,
        fullLayerQty: Number(newFullLayerQty),
        maxLayers: Number(newMaxLayers),
        expectedTotalWeightKg: Number(newExpectedWeight),
        expectedHeightMm: Number(newExpectedHeight),
        customAttributes: {
          load_bearing_capability: newLoadBearing,
          ...newStratDynAttrs
        }
      });
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create strategy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStrategies = useMemo(() => {
    return strategies.filter(st => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = 
          st.strategyCode.toLowerCase().includes(q) ||
          st.name.toLowerCase().includes(q) ||
          (st.itemName && st.itemName.toLowerCase().includes(q)) ||
          (st.skuCode && st.skuCode.toLowerCase().includes(q)) ||
          (st.palletTypeCode && st.palletTypeCode.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'strategyCode' && !st.strategyCode.toLowerCase().includes(val)) return false;
        if (key === 'name' && !st.name.toLowerCase().includes(val)) return false;
        if (key === 'itemName' && !(st.itemName || '').toLowerCase().includes(val)) return false;
        if (key === 'skuCode' && !(st.skuCode || '').toLowerCase().includes(val)) return false;
        if (key === 'palletTypeCode' && !(st.palletTypeCode || '').toLowerCase().includes(val)) return false;
        if (key === 'standardPackageCount' && !String(st.standardPackageCount || '').includes(val)) return false;
        if (key.startsWith('attr_')) {
          const attrCode = key.replace('attr_', '');
          const propVal = st.customAttributes?.[attrCode];
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
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [strategies, searchQuery, colFilters, sortConfig]);

  const totalRecords = filteredStrategies.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedStrategies = filteredStrategies.slice(startIndex, endIndex);

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
              placeholder="Search strategies by code, item..."
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
            Add Strategy
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
              <th onClick={() => handleSort('strategyCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Strategy Code {getSortIcon('strategyCode')}
                </div>
              </th>
              <th onClick={() => handleSort('name')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Name {getSortIcon('name')}
                </div>
              </th>
              <th onClick={() => handleSort('itemName')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Material {getSortIcon('itemName')}
                </div>
              </th>
              <th onClick={() => handleSort('skuCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  SKU Recipe {getSortIcon('skuCode')}
                </div>
              </th>
              <th onClick={() => handleSort('palletTypeCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Pallet Type {getSortIcon('palletTypeCode')}
                </div>
              </th>
              <th onClick={() => handleSort('standardPackageCount')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Package Count {getSortIcon('standardPackageCount')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Expected Weight
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Stacking Capability
              </th>
              {strategyCustomAttrs.map(attr => (
                <th key={attr.code} onClick={() => handleSort(`attr_${attr.code}`)} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#B45309' }}>
                    {attr.label} {getSortIcon(`attr_${attr.code}`)}
                  </div>
                </th>
              ))}
              <th style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
            </tr>

            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                {['strategyCode', 'name', 'itemName', 'skuCode', 'palletTypeCode', 'standardPackageCount', 'weight', 'stacking'].map(key => (
                  <th key={key} style={{ padding: '3px 6px' }}>
                    {key !== 'weight' && key !== 'stacking' ? (
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
                    ) : null}
                  </th>
                ))}
                {strategyCustomAttrs.map(attr => (
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
            {pagedStrategies.length === 0 ? (
              <tr>
                <td colSpan={9 + strategyCustomAttrs.length} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Settings2 size={28} style={{ opacity: 0.35, margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No handling strategies found matching criteria.</div>
                </td>
              </tr>
            ) : (
              pagedStrategies.map(st => (
                <tr
                  key={st.id}
                  style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {st.strategyCode}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {st.name}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                    {st.itemName || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--color-primary-600)' }}>
                    {st.skuCode || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                    {st.palletTypeCode || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    {st.standardPackageCount} pkgs
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {st.expectedTotalWeightKg ? `${st.expectedTotalWeightKg} kg` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={String(st.customAttributes?.load_bearing_capability || '').includes('DOUBLE') ? 'success' : 'info'}>
                      {String(st.customAttributes?.load_bearing_capability || 'STANDARD')}
                    </Badge>
                  </td>
                  {strategyCustomAttrs.map(attr => (
                    <td key={attr.code} style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {st.customAttributes?.[attr.code] != null ? String(st.customAttributes[attr.code]) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Badge variant="success">ACTIVE</Badge>
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
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} strategies</div>
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

      {/* Add Strategy Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Pallet Handling Strategy"
        subtitle="Define layer patterns and packaging recipe for wes.pallet_handling_strategy"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Strategy Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. STRAT-CF-BAG-40"
                value={newStratCode}
                onChange={e => setNewStratCode(e.target.value.toUpperCase())}
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
                Strategy Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Standard 40-Bag Pallet Configuration"
                value={newStratName}
                onChange={e => setNewStratName(e.target.value)}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Material *
              </label>
              <select
                required
                value={newStratItemId}
                onChange={e => setNewStratItemId(e.target.value)}
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
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                SKU Recipe
              </label>
              <select
                value={newStratSkuId}
                onChange={e => setNewStratSkuId(e.target.value)}
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
                <option value="">-- None / Loose --</option>
                {skus.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.skuCode} ({k.packageType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Pallet Type *
              </label>
              <select
                required
                value={newStratPalletTypeId}
                onChange={e => setNewStratPalletTypeId(e.target.value)}
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
                {palletTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>
                    {pt.code} ({pt.tareWeightKg}kg)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Units / Layer
              </label>
              <input
                type="number"
                min={1}
                value={newFullLayerQty}
                onChange={e => setNewFullLayerQty(parseInt(e.target.value, 10) || 1)}
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
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Max Layers
              </label>
              <input
                type="number"
                min={1}
                value={newMaxLayers}
                onChange={e => setNewMaxLayers(parseInt(e.target.value, 10) || 1)}
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
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Stacking Capability
              </label>
              <select
                value={newLoadBearing}
                onChange={e => setNewLoadBearing(e.target.value)}
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
                <option value="DOUBLE_STACKABLE">Double Stackable</option>
                <option value="SINGLE_STACK_ONLY">Single Stack Only</option>
                <option value="TRIPLE_STACKABLE">Triple Stackable</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Total Expected Weight (kg)
              </label>
              <input
                type="number"
                min={1}
                value={newExpectedWeight}
                onChange={e => setNewExpectedWeight(parseFloat(e.target.value) || 0)}
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
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Total Height (mm)
              </label>
              <input
                type="number"
                min={1}
                value={newExpectedHeight}
                onChange={e => setNewExpectedHeight(parseInt(e.target.value, 10) || 0)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Strategy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
