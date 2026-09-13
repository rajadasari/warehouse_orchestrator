import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Plus, 
  RefreshCw, 
  Loader2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Warehouse, 
  MapPin, 
  Barcode, 
  Sparkles, 
  History, 
  Tag 
} from 'lucide-react';
import { 
  masterDataService, 
  PalletInventoryItem, 
  PalletHandlingStrategyItem,
  SkuMasterItem,
  PalletTypeItem,
  ItemMasterItem,
  CustomAttributeItem
} from '../../services/masterDataService';
import { Button } from '../../components/common/Button';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Tabs } from '../../components/common/Tabs';
import { PalletColumnPicker, PalletColumnDefinition } from './components/PalletColumnPicker';
import { InboundPalletModal } from './components/InboundPalletModal';
import { PalletProcessLogsModal } from './components/PalletProcessLogsModal';

const KNOWN_PALLET_CUSTOM_ATTRIBUTES = [
  { code: 'benchCode', label: 'Bench Code' },
  { code: 'palletCategory', label: 'Pallet Category' },
  { code: 'distributionSpecClass', label: 'Distribution Spec' },
  { code: 'qualityAssuranceStatus', label: 'QA Status' },
  { code: 'transitDestination', label: 'Transit Dest' },
  { code: 'vendorPalletId', label: 'Vendor Pallet ID' },
  { code: 'allergen', label: 'Allergen' },
  { code: 'batchID', label: 'Batch ID' },
  { code: 'batchExpiry', label: 'Batch Expiry' },
  { code: 'pallet_stack_count', label: 'Stack Count' }
];

export const PalletInventoryView: React.FC = () => {
  const [pallets, setPallets] = useState<PalletInventoryItem[]>([]);
  const [strategies, setStrategies] = useState<PalletHandlingStrategyItem[]>([]);
  const [skus, setSkus] = useState<SkuMasterItem[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletTypeItem[]>([]);
  const [items, setItems] = useState<ItemMasterItem[]>([]);
  const [customAttrDefs, setCustomAttrDefs] = useState<CustomAttributeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('warehouse_pallet_visible_cols_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading visible columns:', e);
    }
    return {};
  });

  // Sorting & Pagination
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [selectedPalletForLogs, setSelectedPalletForLogs] = useState<PalletInventoryItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [palletData, stratData, skuData, typeData, itemData, customData] = await Promise.all([
        masterDataService.getPallets(),
        masterDataService.getStrategies().catch(() => []),
        masterDataService.getSkus().catch(() => []),
        masterDataService.getPalletTypes().catch(() => []),
        masterDataService.getItems().catch(() => []),
        masterDataService.getCustomAttributes().catch(() => [])
      ]);
      setPallets(palletData || []);
      setStrategies(stratData || []);
      setSkus(skuData || []);
      setPalletTypes(typeData || []);
      setItems(itemData || []);
      setCustomAttrDefs(customData || []);
    } catch (err: any) {
      console.error('Failed to load pallets from database:', err);
      setErrorMsg(err.message || 'Failed to load pallet inventory from wes.pallet.');
      setPallets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick 1-Click Pallet Creation with dynamic master data values
  const handleQuickInstantAdd = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const currentYear = new Date().getFullYear();
      const seq = Math.floor(100000 + Math.random() * 900000);
      const activeStrat = strategies.length > 0 ? strategies[0] : null;
      const activeType = palletTypes.find(t => t.id === activeStrat?.palletTypeId) || (palletTypes.length > 0 ? palletTypes[0] : null);
      const activeSku = skus.find(k => k.id === activeStrat?.skuId) || (skus.length > 0 ? skus[0] : null);
      const pkgs = activeStrat?.standardPackageCount || 40;
      const tare = activeType?.tareWeightKg || 25.0;
      const unitWt = activeSku?.unitsPerPackage || 18.0;
      const calcWeight = Number((tare + pkgs * unitWt).toFixed(1));
      
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const createdPallet = await masterDataService.createPalletFromStrategy({
        palletLpn: `PLT-${currentYear}-${seq}`,
        palletAlias: `ALIAS-${String(seq).slice(-4)}`,
        strategyId: activeStrat?.id,
        palletTypeId: activeType?.id,
        skuId: activeSku?.id,
        status: 'STAGED',
        location: `STAGING-LANE-0${1 + Math.floor(Math.random() * 4)}`,
        isMixedPallet: false,
        actualWeightKg: calcWeight,
        packageCount: pkgs,
        lotNumber: `LOT-${currentYear}-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: nextYear.toISOString().split('T')[0],
        rfidTag: `3034257BF400${String(seq).padStart(12, '0')}`
      });

      setPallets(prev => [createdPallet, ...prev]);
    } catch (err: any) {
      console.error('Instant pallet creation failed:', err);
      setErrorMsg(err.message || 'Failed to create instant pallet in wes.pallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discover Custom Property Keys
  const palletCustomAttrKeys = useMemo(() => {
    const keysMap = new Map<string, { code: string; label: string }>();

    KNOWN_PALLET_CUSTOM_ATTRIBUTES.forEach(attr => {
      keysMap.set(attr.code, { code: attr.code, label: attr.label });
    });

    customAttrDefs
      .filter(def => def.targetEntity === 'PALLET' && def.isActive !== false && def.attributeCode !== 'pallet_alias' && def.attributeCode !== 'palletAlias')
      .forEach(def => {
        keysMap.set(def.attributeCode, { code: def.attributeCode, label: def.label || def.attributeCode });
      });

    pallets.forEach(plt => {
      if (plt.customAttributes && typeof plt.customAttributes === 'object') {
        Object.keys(plt.customAttributes).forEach(k => {
          if (k === 'pallet_alias' || k === 'palletAlias') return;
          if (!keysMap.has(k)) {
            const humanLabel = k
              .replace(/_/g, ' ')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/\b\w/g, c => c.toUpperCase());
            keysMap.set(k, { code: k, label: humanLabel });
          }
        });
      }
    });

    return Array.from(keysMap.values());
  }, [customAttrDefs, pallets]);

  // Master Column Definition List
  const allColumnsList = useMemo<PalletColumnDefinition[]>(() => {
    const standard: PalletColumnDefinition[] = [
      { key: 'palletLpn', label: 'Pallet LPN', group: 'Standard', required: true },
      { key: 'pallet_alias', label: 'Pallet Alias', group: 'Standard', required: false },
      { key: 'loadType', label: 'Load Type', group: 'Standard', required: false },
      { key: 'strategy', label: 'Handling Strategy', group: 'Standard', required: false },
      { key: 'palletType', label: 'Pallet Type', group: 'Standard', required: false },
      { key: 'itemCode', label: 'Item Code', group: 'Standard', required: false },
      { key: 'itemName', label: 'Item Name', group: 'Standard', required: false },
      { key: 'skuCode', label: 'SKU Code', group: 'Standard', required: false },
      { key: 'packageCount', label: 'Package Count', group: 'Standard', required: false },
      { key: 'quantity', label: 'Total Qty', group: 'Standard', required: false },
      { key: 'baseUom', label: 'Base UOM', group: 'Standard', required: false },
      { key: 'lotNumber', label: 'Lot Number', group: 'Standard', required: false },
      { key: 'expiryDate', label: 'Expiry Date', group: 'Standard', required: false },
      { key: 'currentLocation', label: 'Location', group: 'Standard', required: false },
      { key: 'status', label: 'Status', group: 'Standard', required: false },
      { key: 'actualWeight', label: 'Actual Weight', group: 'Standard', required: false },
      { key: 'mixStatus', label: 'Mix Status', group: 'Standard', required: false },
    ];

    const custom: PalletColumnDefinition[] = palletCustomAttrKeys.map(attr => ({
      key: `attr_${attr.code}`,
      label: attr.label,
      group: 'Custom Property',
      required: false
    }));

    const actions: PalletColumnDefinition[] = [
      { key: 'actions', label: 'Process Journey', group: 'Standard', required: false }
    ];

    return [...standard, ...custom, ...actions];
  }, [palletCustomAttrKeys]);

  const isColVisible = (key: string): boolean => {
    if (visibleColumns[key] !== undefined) return visibleColumns[key];
    return true;
  };

  const toggleColVisible = (key: string) => {
    setVisibleColumns(prev => {
      const current = prev[key] !== undefined ? prev[key] : true;
      const updated = { ...prev, [key]: !current };
      try {
        localStorage.setItem('warehouse_pallet_visible_cols_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const setAllColumnsVisibility = (visible: boolean) => {
    const updated: Record<string, boolean> = {};
    allColumnsList.forEach(col => {
      updated[col.key] = col.required ? true : visible;
    });
    setVisibleColumns(updated);
    try {
      localStorage.setItem('warehouse_pallet_visible_cols_v2', JSON.stringify(updated));
    } catch (e) {}
  };

  const showCoreOnly = () => {
    const coreKeys = new Set(['palletLpn', 'pallet_alias', 'loadType', 'strategy', 'itemCode', 'skuCode', 'quantity', 'currentLocation', 'status', 'actions']);
    const updated: Record<string, boolean> = {};
    allColumnsList.forEach(col => {
      updated[col.key] = coreKeys.has(col.key);
    });
    setVisibleColumns(updated);
    try {
      localStorage.setItem('warehouse_pallet_visible_cols_v2', JSON.stringify(updated));
    } catch (e) {}
  };

  const showCustomOnly = () => {
    const updated: Record<string, boolean> = {};
    allColumnsList.forEach(col => {
      updated[col.key] = (col.key === 'palletLpn' || col.key === 'pallet_alias' || col.key === 'status' || col.key === 'actions' || col.key.startsWith('attr_'));
    });
    setVisibleColumns(updated);
    try {
      localStorage.setItem('warehouse_pallet_visible_cols_v2', JSON.stringify(updated));
    } catch (e) {}
  };

  const resetDefaultColumns = () => {
    try {
      localStorage.removeItem('warehouse_pallet_visible_cols_v2');
    } catch (e) {}
    const updated: Record<string, boolean> = {};
    allColumnsList.forEach(col => {
      updated[col.key] = true;
    });
    setVisibleColumns(updated);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={11} color="var(--text-disabled)" style={{ opacity: 0.6 }} />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={11} color="var(--color-primary-500)" />
    ) : (
      <ChevronDown size={11} color="var(--color-primary-500)" />
    );
  };

  const activeColFilterCount = useMemo(() => {
    return Object.values(colFilters).filter(v => v && v.trim() !== '').length;
  }, [colFilters]);

  const handleClearAllFilters = () => {
    setColFilters({});
    setSearchQuery('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Filter & Sort Pipeline
  const processedPallets = useMemo(() => {
    const filtered = pallets.filter(plt => {
      const firstItem = plt.items && plt.items.length > 0 ? plt.items[0] : null;

      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const itemsStr = (plt.items || []).map(i => `${i.skuCode || ''} ${i.itemName || ''} ${i.lotNumber || ''}`).join(' ').toLowerCase();
        const aliasStr = String((plt as any).pallet_alias || (plt as any).palletAlias || plt.customAttributes?.pallet_alias || plt.customAttributes?.palletAlias || '').toLowerCase();
        const customAttrsStr = JSON.stringify(plt.customAttributes || {}).toLowerCase();
        const matchesGlobal = 
          plt.palletLpn.toLowerCase().includes(q) ||
          aliasStr.includes(q) ||
          (plt.loadType && plt.loadType.toLowerCase().includes(q)) ||
          (plt.itemCode && plt.itemCode.toLowerCase().includes(q)) ||
          (firstItem?.itemCode && firstItem.itemCode.toLowerCase().includes(q)) ||
          (plt.itemName && plt.itemName.toLowerCase().includes(q)) ||
          (firstItem?.itemName && firstItem.itemName.toLowerCase().includes(q)) ||
          (firstItem?.skuCode && firstItem.skuCode.toLowerCase().includes(q)) ||
          (firstItem?.lotNumber && firstItem.lotNumber.toLowerCase().includes(q)) ||
          (plt.strategyCode && plt.strategyCode.toLowerCase().includes(q)) ||
          (plt.strategyName && plt.strategyName.toLowerCase().includes(q)) ||
          (plt.palletTypeCode && plt.palletTypeCode.toLowerCase().includes(q)) ||
          (plt.currentLocation && plt.currentLocation.toLowerCase().includes(q)) ||
          plt.status.toLowerCase().includes(q) ||
          itemsStr.includes(q) ||
          customAttrsStr.includes(q);
        if (!matchesGlobal) return false;
      }

      // Status filter
      if (statusFilter === 'HOLD') {
        if (plt.status !== 'HOLD') return false;
      } else if (statusFilter !== 'ALL' && plt.status !== statusFilter) {
        return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'palletLpn' && !plt.palletLpn.toLowerCase().includes(val)) return false;
        if (key === 'pallet_alias') {
          const aliasVal = String((plt as any).pallet_alias || (plt as any).palletAlias || plt.customAttributes?.pallet_alias || plt.customAttributes?.palletAlias || '').toLowerCase();
          if (!aliasVal.includes(val)) return false;
        }
        if (key === 'loadType' && !(plt.loadType || 'MATERIAL_WITH_SKU').toLowerCase().includes(val)) return false;
        if (key === 'strategy' && !(plt.strategyCode || '').toLowerCase().includes(val) && !(plt.strategyName || '').toLowerCase().includes(val)) return false;
        if (key === 'palletType' && !(plt.palletTypeCode || '').toLowerCase().includes(val) && !(plt.palletTypeName || '').toLowerCase().includes(val)) return false;
        if (key === 'itemCode' && !(plt.itemCode || firstItem?.itemCode || '').toLowerCase().includes(val)) return false;
        if (key === 'itemName' && !(plt.itemName || firstItem?.itemName || '').toLowerCase().includes(val)) return false;
        if (key === 'skuCode' && !(firstItem?.skuCode || '').toLowerCase().includes(val)) return false;
        if (key === 'packageCount' && !String(firstItem?.packageCount ?? (plt.loadType === 'PALLET_STACK' ? (plt.customAttributes?.pallet_stack_count || 10) : '')).toLowerCase().includes(val)) return false;
        if (key === 'quantity' && !String(firstItem?.totalQuantity ?? (plt.loadType === 'MATERIAL' ? plt.actualWeightKg : '')).toLowerCase().includes(val)) return false;
        if (key === 'baseUom' && !(plt.materialBaseUom || firstItem?.baseUom || '').toLowerCase().includes(val)) return false;
        if (key === 'lotNumber' && !(firstItem?.lotNumber || '').toLowerCase().includes(val)) return false;
        if (key === 'expiryDate' && !(firstItem?.expiryDate || '').toLowerCase().includes(val)) return false;
        if (key === 'currentLocation' && !(plt.currentLocation || '').toLowerCase().includes(val)) return false;
        if (key === 'status' && !plt.status.toLowerCase().includes(val)) return false;
        if (key === 'actualWeight' && !String(plt.actualWeightKg || '').includes(val)) return false;
        if (key === 'mixStatus') {
          const isMixed = Boolean(plt.isMixedPallet ?? plt.mixedPallet);
          if (val === 'mixed' && !isMixed) return false;
          if ((val === 'single' || val === 'pure') && isMixed) return false;
        }
        if (key.startsWith('attr_')) {
          const attrCode = key.replace('attr_', '');
          const propVal = plt.customAttributes?.[attrCode];
          if (propVal === undefined || propVal === null) return false;
          if (!String(propVal).toLowerCase().includes(val)) return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let valA: any;
      let valB: any;

      const firstItemA = a.items && a.items.length > 0 ? a.items[0] : null;
      const firstItemB = b.items && b.items.length > 0 ? b.items[0] : null;

      if (sortConfig.key.startsWith('attr_')) {
        const attrCode = sortConfig.key.replace('attr_', '');
        valA = a.customAttributes?.[attrCode] ?? '';
        valB = b.customAttributes?.[attrCode] ?? '';
      } else if (sortConfig.key === 'pallet_alias') {
        valA = (a as any).pallet_alias || (a as any).palletAlias || a.customAttributes?.pallet_alias || a.customAttributes?.palletAlias || '';
        valB = (b as any).pallet_alias || (b as any).palletAlias || b.customAttributes?.pallet_alias || b.customAttributes?.palletAlias || '';
      } else if (sortConfig.key === 'itemCode') {
        valA = a.itemCode || firstItemA?.itemCode || '';
        valB = b.itemCode || firstItemB?.itemCode || '';
      } else if (sortConfig.key === 'itemName') {
        valA = a.itemName || firstItemA?.itemName || '';
        valB = b.itemName || firstItemB?.itemName || '';
      } else if (sortConfig.key === 'skuCode') {
        valA = firstItemA?.skuCode || '';
        valB = firstItemB?.skuCode || '';
      } else if (sortConfig.key === 'packageCount') {
        valA = firstItemA?.packageCount ?? (a.loadType === 'PALLET_STACK' ? (a.customAttributes?.pallet_stack_count || 10) : 0);
        valB = firstItemB?.packageCount ?? (b.loadType === 'PALLET_STACK' ? (b.customAttributes?.pallet_stack_count || 10) : 0);
      } else if (sortConfig.key === 'quantity') {
        valA = firstItemA?.totalQuantity ?? (a.loadType === 'MATERIAL' ? a.actualWeightKg : 0) ?? 0;
        valB = firstItemB?.totalQuantity ?? (b.loadType === 'MATERIAL' ? b.actualWeightKg : 0) ?? 0;
      } else if (sortConfig.key === 'baseUom') {
        valA = a.materialBaseUom || firstItemA?.baseUom || '';
        valB = b.materialBaseUom || firstItemB?.baseUom || '';
      } else if (sortConfig.key === 'lotNumber') {
        valA = firstItemA?.lotNumber || '';
        valB = firstItemB?.lotNumber || '';
      } else if (sortConfig.key === 'expiryDate') {
        valA = firstItemA?.expiryDate || '';
        valB = firstItemB?.expiryDate || '';
      } else if (sortConfig.key === 'isMixedPallet') {
        valA = Boolean(a.isMixedPallet ?? a.mixedPallet) ? 1 : 0;
        valB = Boolean(b.isMixedPallet ?? b.mixedPallet) ? 1 : 0;
      } else {
        valA = (a as any)[sortConfig.key] ?? '';
        valB = (b as any)[sortConfig.key] ?? '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [pallets, searchQuery, statusFilter, colFilters, sortConfig]);

  const totalRecords = processedPallets.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedPallets = processedPallets.slice(startIndex, endIndex);

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
      {/* 1. Header Section */}
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
              Pallet Inventory
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
              wes.pallet
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Physical LPN Container Tracking, Blueprint Hierarchy, Contour Scans, Staging Lanes &amp; ASRS Racks
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
            title="Reload pallet inventory from PostgreSQL wes database"
          >
            Refresh DB
          </Button>

          <Button
            variant="success"
            size="sm"
            onClick={() => setIsInboundModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            1-Click Inbound Pallet
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleQuickInstantAdd}
            isLoading={isSubmitting}
            leftIcon={<Sparkles size={13} />}
            title="Immediately generate and insert a complete full pallet record into wes.pallet in 1 click"
          >
            ⚡ Instant Pallet (1-Click)
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div style={{ marginBottom: '10px', flexShrink: 0 }}>
          <Alert variant="danger" title="Database Error" onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        </div>
      )}

      {/* 2. Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        gap: '12px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {/* Search & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
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
              placeholder="Search LPN, recipe, location, lot..."
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
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-secondary)' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Tabs
            tabs={[
              { key: 'ALL', label: 'All Pallets' },
              { key: 'STAGED', label: 'Staged' },
              { key: 'IN_ASRS', label: 'In ASRS' },
              { key: 'LOADED', label: 'Loaded' },
              { key: 'HOLD', label: 'QA Hold' }
            ]}
            activeKey={statusFilter}
            onChange={key => {
              setStatusFilter(key);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant={showColFilters ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<SlidersHorizontal size={12} />}
            onClick={() => setShowColFilters(!showColFilters)}
          >
            <span>Col Filters</span>
            {activeColFilterCount > 0 && (
              <span style={{
                backgroundColor: 'var(--color-primary-500)',
                color: '#FFFFFF',
                borderRadius: '9999px',
                fontSize: '9px',
                padding: '0 4px',
                fontWeight: 700,
                marginLeft: '4px'
              }}>
                {activeColFilterCount}
              </span>
            )}
          </Button>

          <PalletColumnPicker
            columns={allColumnsList}
            visibleColumns={visibleColumns}
            isColVisible={isColVisible}
            toggleColVisible={toggleColVisible}
            setAllColumnsVisibility={setAllColumnsVisibility}
            showCoreOnly={showCoreOnly}
            showCustomOnly={showCustomOnly}
            resetDefaultColumns={resetDefaultColumns}
            customPropsCount={palletCustomAttrKeys.length}
          />

          {(activeColFilterCount > 0 || searchQuery || statusFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<X size={12} />}
              onClick={handleClearAllFilters}
              style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Clear Filters
            </Button>
          )}

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
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Table Component */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 0 10px 10px',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
            <tr style={{
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {isColVisible('palletLpn') && (
                <th onClick={() => handleSort('palletLpn')} style={{ position: 'sticky', left: 0, zIndex: 12, backgroundColor: 'var(--bg-surface-subtle)', padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Pallet LPN {getSortIcon('palletLpn')}
                  </div>
                </th>
              )}
              {isColVisible('pallet_alias') && (
                <th onClick={() => handleSort('pallet_alias')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Pallet Alias {getSortIcon('pallet_alias')}
                  </div>
                </th>
              )}
              {isColVisible('loadType') && (
                <th onClick={() => handleSort('loadType')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Load Type {getSortIcon('loadType')}
                  </div>
                </th>
              )}
              {isColVisible('strategy') && (
                <th onClick={() => handleSort('strategyCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Handling Strategy {getSortIcon('strategyCode')}
                  </div>
                </th>
              )}
              {isColVisible('palletType') && (
                <th onClick={() => handleSort('palletTypeCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Pallet Type {getSortIcon('palletTypeCode')}
                  </div>
                </th>
              )}
              {isColVisible('itemCode') && (
                <th onClick={() => handleSort('itemCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Item Code {getSortIcon('itemCode')}
                  </div>
                </th>
              )}
              {isColVisible('itemName') && (
                <th onClick={() => handleSort('itemName')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Item Name {getSortIcon('itemName')}
                  </div>
                </th>
              )}
              {isColVisible('skuCode') && (
                <th onClick={() => handleSort('skuCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    SKU Code {getSortIcon('skuCode')}
                  </div>
                </th>
              )}
              {isColVisible('packageCount') && (
                <th onClick={() => handleSort('packageCount')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Package Count {getSortIcon('packageCount')}
                  </div>
                </th>
              )}
              {isColVisible('quantity') && (
                <th onClick={() => handleSort('quantity')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Total Qty {getSortIcon('quantity')}
                  </div>
                </th>
              )}
              {isColVisible('baseUom') && (
                <th onClick={() => handleSort('baseUom')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    UOM {getSortIcon('baseUom')}
                  </div>
                </th>
              )}
              {isColVisible('lotNumber') && (
                <th onClick={() => handleSort('lotNumber')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Lot Number {getSortIcon('lotNumber')}
                  </div>
                </th>
              )}
              {isColVisible('expiryDate') && (
                <th onClick={() => handleSort('expiryDate')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Expiry Date {getSortIcon('expiryDate')}
                  </div>
                </th>
              )}
              {isColVisible('currentLocation') && (
                <th onClick={() => handleSort('currentLocation')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Location {getSortIcon('currentLocation')}
                  </div>
                </th>
              )}
              {isColVisible('status') && (
                <th onClick={() => handleSort('status')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Status {getSortIcon('status')}
                  </div>
                </th>
              )}
              {isColVisible('actualWeight') && (
                <th onClick={() => handleSort('actualWeightKg')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Actual Weight {getSortIcon('actualWeightKg')}
                  </div>
                </th>
              )}
              {isColVisible('mixStatus') && (
                <th onClick={() => handleSort('isMixedPallet')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Mix Status {getSortIcon('isMixedPallet')}
                  </div>
                </th>
              )}
              {palletCustomAttrKeys.map(attr => {
                const colKey = `attr_${attr.code}`;
                if (!isColVisible(colKey)) return null;
                return (
                  <th
                    key={colKey}
                    onClick={() => handleSort(colKey)}
                    style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#B45309', fontWeight: 700 }}>
                        <Tag size={10} />
                        {attr.label}
                      </span>
                      {getSortIcon(colKey)}
                    </div>
                  </th>
                );
              })}
              {isColVisible('actions') && (
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  Process Journey
                </th>
              )}
            </tr>

            {/* Column Filters Row */}
            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                {allColumnsList.filter(col => isColVisible(col.key)).map(col => {
                  if (col.key === 'actions') {
                    return <th key={col.key} style={{ padding: '3px 6px', backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }} />;
                  }
                  const val = colFilters[col.key] || '';
                  return (
                    <th
                      key={col.key}
                      style={{
                        padding: '3px 6px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderBottom: '1px solid var(--border-default)',
                        fontWeight: 'normal',
                        ...(col.key === 'palletLpn' ? { position: 'sticky', left: 0, zIndex: 12, borderRight: '1px solid var(--border-default)' } : {})
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                        <input
                          type="text"
                          placeholder={`Filter ${col.label}...`}
                          value={val}
                          onChange={e => {
                            setColFilters(prev => ({ ...prev, [col.key]: e.target.value }));
                            setCurrentPage(1);
                          }}
                          style={{
                            width: '100%',
                            height: '21px',
                            fontSize: '10px',
                            padding: '1px 16px 1px 5px',
                            backgroundColor: val ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface)',
                            border: val ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                            borderRadius: '3px',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        {val && (
                          <button
                            onClick={() => {
                              setColFilters(prev => ({ ...prev, [col.key]: '' }));
                              setCurrentPage(1);
                            }}
                            title="Clear search"
                            style={{ position: 'absolute', right: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-secondary)' }}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={allColumnsList.filter(c => isColVisible(c.key)).length} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading pallet inventory from wes.pallet...</span>
                  </div>
                </td>
              </tr>
            ) : pagedPallets.length === 0 ? (
              <tr>
                <td colSpan={allColumnsList.filter(c => isColVisible(c.key)).length} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {pallets.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Warehouse size={28} style={{ opacity: 0.35, color: 'var(--text-secondary)' }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        No records in wes.pallet
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                        The database table currently contains 0 records. Click &quot;1-Click Inbound Pallet&quot; above to register an inbound pallet into the warehouse.
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px' }}>
                      No pallets match your current search filters.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              pagedPallets.map(plt => {
                const firstItem = plt.items && plt.items.length > 0 ? plt.items[0] : null;

                return (
                  <tr
                    key={plt.id}
                    style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color var(--transition-fast)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {isColVisible('palletLpn') && (
                      <td style={{
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        backgroundColor: 'inherit',
                        borderRight: '1px solid var(--border-default)'
                      }}>
                        <div 
                          onClick={() => setSelectedPalletForLogs(plt)}
                          title="Click to view full Process Journey & Timeline"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <Barcode size={13} color="var(--color-primary-600)" />
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-600)', fontSize: '12px' }}>
                            {plt.palletLpn}
                          </span>
                          {Boolean(plt.isMixedPallet ?? plt.mixedPallet) && (
                            <Badge variant="warning">MIXED</Badge>
                          )}
                        </div>
                      </td>
                    )}

                    {isColVisible('pallet_alias') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const aliasVal = (plt as any).pallet_alias || (plt as any).palletAlias || plt.customAttributes?.pallet_alias || plt.customAttributes?.palletAlias;
                          return aliasVal ? (
                            <span style={{
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              color: 'var(--text-primary)',
                              fontSize: '11.5px',
                              backgroundColor: 'var(--bg-surface-subtle)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-default)'
                            }}>
                              {aliasVal}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                          );
                        })()}
                      </td>
                    )}

                    {isColVisible('loadType') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <Badge variant="info">
                          {plt.loadType || 'MATERIAL_WITH_SKU'}
                        </Badge>
                      </td>
                    )}

                    {isColVisible('strategy') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>
                            {plt.strategyCode || (plt.loadType === 'NO_LOAD' || plt.loadType === 'PALLET_STACK' ? 'Carrier Only' : 'Custom / Manual')}
                          </span>
                          {plt.strategyName && (
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {plt.strategyName}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {isColVisible('palletType') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-surface-subtle)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-default)',
                          fontFamily: 'monospace'
                        }}>
                          {plt.palletTypeCode || 'Standard'}
                        </span>
                      </td>
                    )}

                    {isColVisible('itemCode') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {(plt.itemCode || firstItem?.itemCode) ? (
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            fontSize: '11px',
                            color: 'var(--text-primary)',
                            backgroundColor: 'var(--bg-surface-subtle)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)'
                          }}>
                            {plt.itemCode || firstItem?.itemCode}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    )}

                    {isColVisible('itemName') && (
                      <td style={{ padding: '8px 12px', minWidth: '130px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {plt.itemName || firstItem?.itemName || (plt.loadType === 'NO_LOAD' ? 'Empty Carrier' : plt.loadType === 'PALLET_STACK' ? 'Carrier Stack' : '—')}
                        </span>
                      </td>
                    )}

                    {isColVisible('skuCode') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {firstItem?.skuCode ? (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: 'var(--color-primary-600)',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(37, 99, 235, 0.2)'
                          }}>
                            {firstItem.skuCode}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    )}

                    {isColVisible('packageCount') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {firstItem?.packageCount !== undefined ? `${firstItem.packageCount} ${firstItem.packageType || 'pkgs'}` : (plt.loadType === 'PALLET_STACK' ? `${plt.customAttributes?.pallet_stack_count || 10} units` : (plt.loadType === 'MATERIAL' ? '1 bulk load' : '—'))}
                        </span>
                      </td>
                    )}

                    {isColVisible('quantity') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {firstItem?.totalQuantity !== undefined 
                            ? firstItem.totalQuantity 
                            : (plt.loadType === 'MATERIAL' && plt.actualWeightKg ? plt.actualWeightKg : '—')}
                        </span>
                      </td>
                    )}

                    {isColVisible('baseUom') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {plt.materialBaseUom || firstItem?.baseUom || (plt.loadType === 'MATERIAL' ? 'KG' : (plt.loadType === 'PALLET_STACK' ? 'PLT' : '—'))}
                        </span>
                      </td>
                    )}

                    {isColVisible('lotNumber') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {firstItem?.lotNumber ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                            {firstItem.lotNumber}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    )}

                    {isColVisible('expiryDate') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {firstItem?.expiryDate ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {firstItem.expiryDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    )}

                    {isColVisible('currentLocation') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <MapPin size={11} color="var(--color-primary-500)" />
                          <span>{plt.currentLocation || 'UNASSIGNED'}</span>
                        </div>
                      </td>
                    )}

                    {isColVisible('status') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <Badge variant={getStatusBadgeVariant(plt.status)}>
                          {plt.status}
                        </Badge>
                      </td>
                    )}

                    {isColVisible('actualWeight') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-primary)' }}>
                          {plt.actualWeightKg != null ? `${plt.actualWeightKg.toFixed(1)} kg` : '—'}
                        </span>
                      </td>
                    )}

                    {isColVisible('mixStatus') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {Boolean(plt.isMixedPallet ?? plt.mixedPallet) ? (
                          <Badge variant="warning">MIXED</Badge>
                        ) : (
                          <Badge variant="info">SINGLE</Badge>
                        )}
                      </td>
                    )}

                    {/* Custom Properties */}
                    {palletCustomAttrKeys.map(attr => {
                      const colKey = `attr_${attr.code}`;
                      if (!isColVisible(colKey)) return null;
                      const val = plt.customAttributes?.[attr.code];
                      return (
                        <td key={colKey} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          {val !== undefined && val !== null && val !== '' ? (
                            typeof val === 'boolean' || val === 'true' || val === 'false' ? (
                              <Badge variant={(val === true || val === 'true') ? 'success' : 'neutral'}>
                                {val === true || val === 'true' ? 'YES' : 'NO'}
                              </Badge>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                color: '#B45309',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                fontFamily: 'monospace'
                              }}>
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    {isColVisible('actions') && (
                      <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<History size={12} />}
                          onClick={() => setSelectedPalletForLogs(plt)}
                          title="View Process Log Timeline & Record Checkpoint"
                        >
                          Process Logs
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Pagination Footer Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        fontSize: '11.5px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <div>
          {totalRecords === 0 ? (
            'Showing 0 of 0 records'
          ) : (
            <>
              Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalRecords}</strong> pallets
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage <= 1}
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safeCurrentPage <= 1}
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={13} />
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage >= totalPages}
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>

      {/* Subcomponent Modals */}
      <InboundPalletModal
        isOpen={isInboundModalOpen}
        onClose={() => setIsInboundModalOpen(false)}
        strategies={strategies}
        skus={skus}
        palletTypes={palletTypes}
        items={items}
        onPalletCreated={newPallet => setPallets(prev => [newPallet, ...prev])}
      />

      <PalletProcessLogsModal
        pallet={selectedPalletForLogs}
        isOpen={Boolean(selectedPalletForLogs)}
        onClose={() => setSelectedPalletForLogs(null)}
        onLogRecorded={loadData}
      />
    </div>
  );
};
