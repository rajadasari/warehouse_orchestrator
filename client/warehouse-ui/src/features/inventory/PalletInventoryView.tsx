import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  Warehouse,
  MapPin,
  Barcode,
  Sparkles,
  RotateCcw,
  Box,
  Check,
  History,
  Clock,
  PlusCircle,
  Trash2,
  Send,
  Tag,
  Columns
} from 'lucide-react';
import { 
  masterDataService, 
  PalletInventoryItem, 
  PalletHandlingStrategyItem,
  SkuMasterItem,
  PalletTypeItem,
  ItemMasterItem,
  PalletProcessLogItem,
  CustomAttributeItem
} from '../../services/masterDataService';

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

  // Global & Scope Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'STAGED' | 'IN_ASRS' | 'LOADED' | 'CREATED' | 'HOLD'>('ALL');

  // Column Filters
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Column Visibility & Required Columns Facility
  const [showColPicker, setShowColPicker] = useState(false);
  const [colPickerSearch, setColPickerSearch] = useState('');
  const colPickerRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('warehouse_pallet_visible_cols_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading visible columns:', e);
    }
    return {};
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inbound Pallet Modal State
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields for Full Pallet Entry in wes.pallet
  const [inboundLpn, setInboundLpn] = useState('');
  const [inboundPalletAlias, setInboundPalletAlias] = useState('');
  const [inboundLoadType, setInboundLoadType] = useState<'NO_LOAD' | 'MATERIAL' | 'MATERIAL_WITH_SKU' | 'PALLET_STACK'>('MATERIAL_WITH_SKU');
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [selectedPalletTypeId, setSelectedPalletTypeId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [inboundMaterialQty, setInboundMaterialQty] = useState<number>(500);
  const [inboundStatus, setInboundStatus] = useState('STAGED');
  const [inboundLocation, setInboundLocation] = useState('STAGING-LANE-01');
  const [inboundIsMixed, setInboundIsMixed] = useState(false);
  const [inboundPackageCount, setInboundPackageCount] = useState<number>(40);
  const [inboundPalletStackCount, setInboundPalletStackCount] = useState<number>(10);
  const [inboundActualWeight, setInboundActualWeight] = useState<number>(750);
  const [inboundLotNumber, setInboundLotNumber] = useState('');
  const [inboundExpiryDate, setInboundExpiryDate] = useState('');
  const [inboundRfidTag, setInboundRfidTag] = useState('');

  // Process Logs Timeline Modal State
  const [selectedPalletForLogs, setSelectedPalletForLogs] = useState<PalletInventoryItem | null>(null);
  const [processLogs, setProcessLogs] = useState<PalletProcessLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // New Checkpoint form states
  const [newLogStage, setNewLogStage] = useState<'SCALE' | 'ROUTED' | 'STORED' | 'DISPATCH' | 'CUSTOM'>('SCALE');
  const [customStageText, setCustomStageText] = useState('');
  const [newLogLocation, setNewLogLocation] = useState('SCALE-01');
  const [newLogStatus, setNewLogStatus] = useState('IN_TRANSIT');
  const [newLogNotes, setNewLogNotes] = useState('');
  const [newLogProperties, setNewLogProperties] = useState<{ key: string; value: string }[]>([]);

  // Load data strictly from Backend API (wes.pallet in PostgreSQL)
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

  const handleOpenProcessLogs = async (pallet: PalletInventoryItem) => {
    setSelectedPalletForLogs(pallet);
    setIsLoadingLogs(true);
    setNewLogStage('SCALE');
    setCustomStageText('');
    setNewLogLocation(pallet.currentLocation || 'SCALE-01');
    setNewLogStatus(pallet.status || 'IN_TRANSIT');
    setNewLogNotes('');
    setNewLogProperties([]);
    try {
      const logs = await masterDataService.getPalletProcessLogs(pallet.id);
      setProcessLogs(logs);
    } catch (err) {
      console.error('Failed to load process logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRecordProcessLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPalletForLogs) return;

    const resolvedStage = newLogStage === 'CUSTOM' ? customStageText.trim().toUpperCase() : newLogStage;
    if (!resolvedStage) {
      alert('Please specify a Process Stage.');
      return;
    }
    if (resolvedStage.length > 10) {
      alert('Process stage must be 10 characters or less (e.g. INBOUND, SCALE, ROUTED, STORED, DISPATCH).');
      return;
    }

    const propsObj: Record<string, any> = {};
    for (const p of newLogProperties) {
      const trimmedKey = p.key.trim();
      if (trimmedKey) {
        let val: any = p.value.trim();
        if (val.toLowerCase() === 'true') val = true;
        else if (val.toLowerCase() === 'false') val = false;
        else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        propsObj[trimmedKey] = val;
      }
    }

    setIsSubmittingLog(true);
    try {
      const created = await masterDataService.recordPalletProcessLog(selectedPalletForLogs.id, {
        processStage: resolvedStage,
        location: newLogLocation.trim() || undefined,
        status: newLogStatus.trim() || undefined,
        properties: Object.keys(propsObj).length > 0 ? propsObj : undefined,
        notes: newLogNotes.trim() || undefined
      });

      // Update local process logs list
      setProcessLogs(prev => [created, ...prev]);

      // Update selected pallet local snapshot
      const updatedPallet = {
        ...selectedPalletForLogs,
        status: newLogStatus.trim() || selectedPalletForLogs.status,
        currentLocation: newLogLocation.trim() || selectedPalletForLogs.currentLocation,
        customAttributes: {
          ...(selectedPalletForLogs.customAttributes || {}),
          ...propsObj
        }
      };
      setSelectedPalletForLogs(updatedPallet);

      // Refresh inventory table list
      loadData();

      // Clear dynamic inputs
      setNewLogProperties([]);
      setNewLogNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to record process checkpoint');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Helper to populate all full pallet defaults for wes.pallet record entry
  const populateFullPalletDefaults = (
    loadTypeParam?: 'NO_LOAD' | 'MATERIAL' | 'MATERIAL_WITH_SKU' | 'PALLET_STACK',
    stratId?: string, 
    overridePalletTypeId?: string, 
    overrideSkuId?: string,
    overrideItemId?: string,
    overrideStackCount?: number,
    overrideMaterialQty?: number
  ) => {
    const activeLoadType = loadTypeParam || inboundLoadType;
    setInboundLoadType(activeLoadType);

    const seq = Math.floor(100000 + Math.random() * 900000);
    const newLpn = `PLT-2026-${seq}`;
    const newLot = `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newRfid = `3034257BF400${String(seq).padStart(12, '0')}`;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newExpiry = nextYear.toISOString().split('T')[0];

    const targetStratId = stratId !== undefined ? stratId : selectedStrategyId;
    const activeStrat = strategies.find(s => s.id === targetStratId) || (strategies.length > 0 ? strategies[0] : null);
    
    const targetTypeId = overridePalletTypeId || activeStrat?.palletTypeId || selectedPalletTypeId || (palletTypes.length > 0 ? palletTypes[0].id : '');
    const activeType = palletTypes.find(t => t.id === targetTypeId) || (palletTypes.length > 0 ? palletTypes[0] : null);

    const targetSkuId = overrideSkuId || activeStrat?.skuId || selectedSkuId || (skus.length > 0 ? skus[0].id : '');
    const activeSku = skus.find(k => k.id === targetSkuId) || (skus.length > 0 ? skus[0] : null);

    const targetItemId = overrideItemId || activeStrat?.itemId || activeSku?.itemId || selectedItemId || (items.length > 0 ? items[0].id : '');
    const activeItem = items.find(i => i.id === targetItemId) || (items.length > 0 ? items[0] : null);

    const tare = activeType?.tareWeightKg || 25.0;
    const pkgs = activeStrat?.standardPackageCount || 40;
    const unitWt = activeSku?.unitsPerPackage || 18.0;

    let calcWeight = 25.0;

    if (activeLoadType === 'NO_LOAD') {
      calcWeight = Number(tare.toFixed(1));
      setInboundPackageCount(0);
    } else if (activeLoadType === 'PALLET_STACK') {
      const stackCount = overrideStackCount !== undefined ? overrideStackCount : 10;
      setInboundPalletStackCount(stackCount);
      calcWeight = Number((tare * stackCount).toFixed(1));
      setInboundPackageCount(0);
    } else if (activeLoadType === 'MATERIAL') {
      const matQty = overrideMaterialQty !== undefined ? overrideMaterialQty : (inboundMaterialQty || 500);
      setInboundMaterialQty(matQty);
      calcWeight = Number((tare + matQty + (Math.random() * 2.0 - 1.0)).toFixed(1));
      setInboundPackageCount(1);
    } else {
      // MATERIAL_WITH_SKU
      calcWeight = Number((tare + pkgs * unitWt + (Math.random() * 2.0 - 1.0)).toFixed(1));
      setInboundPackageCount(pkgs);
    }

    setInboundLpn(newLpn);
    setInboundPalletAlias('');
    setInboundLotNumber(newLot);
    setInboundRfidTag(newRfid);
    setInboundExpiryDate(newExpiry);
    setInboundLocation('STAGING-LANE-01');
    setInboundStatus('STAGED');
    setInboundIsMixed(false);
    setInboundActualWeight(calcWeight);

    if (activeStrat) setSelectedStrategyId(activeStrat.id);
    if (activeType) setSelectedPalletTypeId(activeType.id);
    if (activeSku) setSelectedSkuId(activeSku.id);
    if (activeItem) setSelectedItemId(activeItem.id);
  };

  // Helper to open modal and prefill all full pallet values
  const handleOpenInboundModal = () => {
    populateFullPalletDefaults();
    setFormError(null);
    setIsInboundModalOpen(true);
  };

  // Instant 1-Click Pallet Creation directly commits all full pallet values to wes.pallet
  const handleQuickInstantAdd = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const seq = Math.floor(100000 + Math.random() * 900000);
      const activeStrat = strategies.length > 0 ? strategies[0] : null;
      const activeType = palletTypes.find(t => t.id === activeStrat?.palletTypeId) || (palletTypes.length > 0 ? palletTypes[0] : null);
      const activeSku = skus.find(k => k.id === activeStrat?.skuId) || (skus.length > 0 ? skus[0] : null);
      const pkgs = activeStrat?.standardPackageCount || 40;
      const tare = activeType?.tareWeightKg || 25.0;
      const unitWt = activeSku?.unitsPerPackage || 18.0;
      const calcWeight = Number((tare + pkgs * unitWt + (Math.random() * 2.0 - 1.0)).toFixed(1));
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const createdPallet = await masterDataService.createPalletFromStrategy({
        palletLpn: `PLT-2026-${seq}`,
        palletAlias: `ALIAS-${String(seq).slice(-4)}`,
        strategyId: activeStrat?.id,
        palletTypeId: activeType?.id,
        skuId: activeSku?.id,
        status: 'STAGED',
        location: `STAGING-LANE-0${1 + Math.floor(Math.random() * 4)}`,
        isMixedPallet: false,
        actualWeightKg: calcWeight,
        packageCount: pkgs,
        lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
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

  // Known WMS Pre-Announce & Container Attributes
  const KNOWN_PALLET_CUSTOM_ATTRIBUTES: { code: string; label: string }[] = useMemo(() => [
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
  ], []);

  // Dynamically Discover All Custom Property Keys
  const palletCustomAttrKeys = useMemo(() => {
    const keysMap = new Map<string, { code: string; label: string }>();

    // 1. Known WMS / Pallet standard custom attributes
    KNOWN_PALLET_CUSTOM_ATTRIBUTES.forEach(attr => {
      keysMap.set(attr.code, { code: attr.code, label: attr.label });
    });

    // 2. Custom attributes defined in database for PALLET entity
    customAttrDefs
      .filter(def => def.targetEntity === 'PALLET' && def.isActive !== false && def.attributeCode !== 'pallet_alias' && def.attributeCode !== 'palletAlias')
      .forEach(def => {
        keysMap.set(def.attributeCode, { code: def.attributeCode, label: def.label || def.attributeCode });
      });

    // 3. Dynamically discovered across all loaded pallets in state
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
  }, [KNOWN_PALLET_CUSTOM_ATTRIBUTES, customAttrDefs, pallets]);

  interface ColumnDefinition {
    key: string;
    label: string;
    group: 'Standard' | 'Custom Property';
    required?: boolean;
  }

  // Master Column Definition List
  const allColumnsList = useMemo<ColumnDefinition[]>(() => {
    const standard: ColumnDefinition[] = [
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

    const custom: ColumnDefinition[] = palletCustomAttrKeys.map(attr => ({
      key: `attr_${attr.code}`,
      label: attr.label,
      group: 'Custom Property',
      required: false
    }));

    const actions: ColumnDefinition[] = [
      { key: 'actions', label: 'Process Journey', group: 'Standard', required: false }
    ];

    return [...standard, ...custom, ...actions];
  }, [palletCustomAttrKeys]);

  // Check column visibility (Default: all true so all columns and custom properties are visible out-of-the-box)
  const isColVisible = (key: string): boolean => {
    if (visibleColumns[key] !== undefined) {
      return visibleColumns[key];
    }
    return true;
  };

  const activeVisibleCount = useMemo(() => {
    return allColumnsList.filter(c => isColVisible(c.key)).length;
  }, [allColumnsList, visibleColumns]);

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
      if (col.required) {
        updated[col.key] = true;
      } else {
        updated[col.key] = visible;
      }
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
      if (col.key === 'palletLpn' || col.key === 'pallet_alias' || col.key === 'status' || col.key === 'actions' || col.key.startsWith('attr_')) {
        updated[col.key] = true;
      } else {
        updated[col.key] = false;
      }
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

  // Close Column Picker on Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(event.target as Node)) {
        setShowColPicker(false);
      }
    };
    if (showColPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColPicker]);

  // Filtered lists for the column picker search
  const filteredStandardCols = useMemo(() => {
    return allColumnsList
      .filter(c => c.group === 'Standard')
      .filter(c => !colPickerSearch || c.label.toLowerCase().includes(colPickerSearch.toLowerCase()));
  }, [allColumnsList, colPickerSearch]);

  const filteredCustomCols = useMemo(() => {
    return allColumnsList
      .filter(c => c.group === 'Custom Property')
      .filter(c => !colPickerSearch || c.label.toLowerCase().includes(colPickerSearch.toLowerCase()));
  }, [allColumnsList, colPickerSearch]);

  // Sorting helper
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
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

  // Column filter change
  const handleColFilterChange = (colKey: string, value: string) => {
    setColFilters(prev => ({ ...prev, [colKey]: value }));
    setCurrentPage(1);
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

  // Filter Cell Component
  const ColumnFilterCell = ({
    colKey,
    placeholder = 'Search...',
    style
  }: {
    colKey: string;
    placeholder?: string;
    style?: React.CSSProperties;
  }) => {
    const val = colFilters[colKey] || '';
    return (
      <th style={{
        padding: '3px 6px',
        backgroundColor: 'var(--bg-surface-subtle)',
        borderBottom: '1px solid var(--border-default)',
        fontWeight: 'normal',
        ...style
      }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder={placeholder}
            value={val}
            onChange={e => handleColFilterChange(colKey, e.target.value)}
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
          {val ? (
            <button
              onClick={() => handleColFilterChange(colKey, '')}
              title="Clear column search"
              style={{
                position: 'absolute',
                right: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={10} />
            </button>
          ) : null}
        </div>
      </th>
    );
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

      // Status pill filter
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
          if (val !== 'mixed' && val !== 'single' && val !== 'pure') {
            const str = isMixed ? 'mixed' : 'single';
            if (!str.includes(val)) return false;
          }
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

    // Sorting
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
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [pallets, searchQuery, statusFilter, colFilters, sortConfig]);

  // Pagination Calculations
  const totalRecords = processedPallets.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedPallets = processedPallets.slice(startIndex, endIndex);
  const recordsLeftToView = Math.max(0, totalRecords - endIndex);

  // Inbound Pallet Handler (persists directly to wes.pallet via API with all fields)
  const handleCreateInboundPallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const createdPallet = await masterDataService.createPalletFromStrategy({
        palletLpn: inboundLpn.trim() || undefined,
        palletAlias: inboundPalletAlias.trim() || undefined,
        loadType: inboundLoadType,
        strategyId: (inboundLoadType === 'NO_LOAD' || inboundLoadType === 'PALLET_STACK') ? undefined : (selectedStrategyId || undefined),
        palletTypeId: selectedPalletTypeId || undefined,
        itemId: (inboundLoadType === 'MATERIAL' || inboundLoadType === 'MATERIAL_WITH_SKU') ? (selectedItemId || undefined) : undefined,
        skuId: inboundLoadType === 'MATERIAL_WITH_SKU' ? (selectedSkuId || undefined) : undefined,
        materialQuantity: inboundLoadType === 'MATERIAL' ? Number(inboundMaterialQty) : undefined,
        status: inboundStatus,
        location: inboundLocation.trim() || 'STAGING-LANE-01',
        isMixedPallet: inboundLoadType === 'MATERIAL_WITH_SKU' ? inboundIsMixed : false,
        actualWeightKg: inboundActualWeight ? Number(inboundActualWeight) : undefined,
        packageCount: inboundLoadType === 'MATERIAL_WITH_SKU' ? (inboundPackageCount ? Number(inboundPackageCount) : undefined) : (inboundLoadType === 'MATERIAL' ? 1 : 0),
        lotNumber: inboundLotNumber.trim() || undefined,
        expiryDate: inboundExpiryDate || undefined,
        rfidTag: inboundRfidTag.trim() || undefined,
        customAttributes: {
          ...(inboundLoadType === 'PALLET_STACK' ? { pallet_stack_count: inboundPalletStackCount } : {}),
          ...(inboundPalletAlias.trim() ? { pallet_alias: inboundPalletAlias.trim() } : {})
        }
      });

      setPallets(prev => [createdPallet, ...prev]);
      setIsInboundModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create inbound pallet:', err);
      setFormError(err.message || 'Failed to create pallet in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_ASRS':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)', label: 'IN ASRS' };
      case 'STAGED':
        return { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563EB', border: 'rgba(37, 99, 235, 0.25)', label: 'STAGED' };
      case 'LOADED':
        return { bg: 'rgba(139, 92, 246, 0.12)', text: '#7C3AED', border: 'rgba(139, 92, 246, 0.25)', label: 'LOADED' };
      case 'CREATED':
        return { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569', border: 'rgba(100, 116, 139, 0.25)', label: 'CREATED' };
      case 'SHIPPED':
        return { bg: 'rgba(59, 130, 246, 0.12)', text: '#1D4ED8', border: 'rgba(59, 130, 246, 0.25)', label: 'SHIPPED' };
      default:
        return { bg: 'var(--bg-surface-subtle)', text: 'var(--text-secondary)', border: 'var(--border-default)', label: status };
    }
  };


  // Load Type Badge Helper
  const getLoadTypeBadge = (loadType?: string) => {
    switch (loadType) {
      case 'NO_LOAD':
        return { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569', border: 'rgba(100, 116, 139, 0.25)', label: 'EMPTY CARRIER' };
      case 'PALLET_STACK':
        return { bg: 'rgba(139, 92, 246, 0.12)', text: '#7C3AED', border: 'rgba(139, 92, 246, 0.25)', label: 'PALLET STACK' };
      case 'MATERIAL':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', border: 'rgba(245, 158, 11, 0.25)', label: 'MATERIAL' };
      case 'MATERIAL_WITH_SKU':
      default:
        return { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563EB', border: 'rgba(37, 99, 235, 0.25)', label: 'SKU LOAD' };
    }
  };

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
      {/* 1. Header Section (Title, wes.pallet tag, Refresh & Inbound buttons) */}
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
          <p style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Physical LPN Container Tracking, Blueprint Hierarchy, Contour Scans, Staging Lanes &amp; ASRS Racks
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Reload pallet inventory from PostgreSQL wes database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: isLoading ? 'wait' : 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh DB</span>
          </button>

          <button
            onClick={handleOpenInboundModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
          >
            <Plus size={15} />
            <span>1-Click Inbound Pallet</span>
          </button>

          <button
            onClick={handleQuickInstantAdd}
            disabled={isSubmitting}
            title="Immediately generate and insert a complete full pallet record into wes.pallet in 1 click"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 13px',
              backgroundColor: 'var(--color-primary-600)',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              transition: 'all var(--transition-fast)',
              cursor: isSubmitting ? 'wait' : 'pointer',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'}
          >
            <Sparkles size={14} />
            <span>⚡ Instant Pallet (1-Click)</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner (if any) */}
      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger-text)',
          fontSize: '11.5px',
          fontWeight: 500,
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadData}
            style={{
              textDecoration: 'underline',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: 'inherit'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Controls Bar (Global search, status filter pills, column filters toggle, clear filters, page size) */}
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
        {/* Left Side: Search + Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px' }}>
          {/* Search Box */}
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

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { id: 'ALL', label: 'All Pallets' },
              { id: 'STAGED', label: 'Staged' },
              { id: 'IN_ASRS', label: 'In ASRS' },
              { id: 'LOADED', label: 'Loaded' },
              { id: 'HOLD', label: 'QA Hold' }
            ].map(pill => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setStatusFilter(pill.id as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    border: active ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                    backgroundColor: active ? 'var(--color-primary-50)' : 'transparent',
                    color: active ? 'var(--color-primary-600)' : 'var(--text-secondary)'
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Column Filter Toggle, Column Visibility Dropdown, Clear Filters, Rows Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowColFilters(!showColFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: showColFilters ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
              backgroundColor: showColFilters ? 'var(--color-primary-50)' : 'transparent',
              color: showColFilters ? 'var(--color-primary-600)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal size={12} />
            <span>Col Filters</span>
            {activeColFilterCount > 0 && (
              <span style={{
                backgroundColor: 'var(--color-primary-500)',
                color: '#FFFFFF',
                borderRadius: '9999px',
                fontSize: '9px',
                padding: '0 4px',
                fontWeight: 700
              }}>
                {activeColFilterCount}
              </span>
            )}
          </button>

          {/* Required Columns & Visibility Dropdown Facility */}
          <div ref={colPickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              title="Select which standard and custom property columns to display in grid"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: showColPicker ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                backgroundColor: showColPicker ? 'var(--color-primary-50)' : 'transparent',
                color: showColPicker ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Columns size={12} />
              <span>Columns</span>
              <span style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '9999px',
                fontSize: '9px',
                padding: '0 5px',
                fontWeight: 700
              }}>
                {activeVisibleCount}/{allColumnsList.length}
              </span>
            </button>

            {/* Dropdown Popover */}
            {showColPicker && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '330px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 6px 12px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Popover Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderBottom: '1px solid var(--border-default)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Columns size={13} color="var(--color-primary-600)" />
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                      Grid Columns
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--color-primary-600)',
                      backgroundColor: 'var(--color-primary-50)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {activeVisibleCount} active
                    </span>
                  </div>
                  <button
                    onClick={() => setShowColPicker(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)' }}
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Presets Bar */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-default)',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setAllColumnsVisibility(true)}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    All ({allColumnsList.length})
                  </button>
                  <button
                    onClick={showCoreOnly}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Core Only
                  </button>
                  <button
                    onClick={showCustomOnly}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '4px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#B45309'
                    }}
                  >
                    Custom Props ({palletCustomAttrKeys.length})
                  </button>
                  <button
                    onClick={resetDefaultColumns}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'transparent',
                      fontSize: '10px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      marginLeft: 'auto'
                    }}
                  >
                    Reset
                  </button>
                </div>

                {/* Search in picker */}
                <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-default)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    border: '1px solid var(--border-default)'
                  }}>
                    <Search size={11} color="var(--text-disabled)" />
                    <input
                      type="text"
                      placeholder="Find column..."
                      value={colPickerSearch}
                      onChange={e => setColPickerSearch(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        width: '100%'
                      }}
                    />
                    {colPickerSearch && (
                      <button onClick={() => setColPickerSearch('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Column Checkbox List */}
                <div style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '6px'
                }}>
                  {/* Standard Columns Section */}
                  {filteredStandardCols.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                        padding: '4px 6px',
                        letterSpacing: '0.04em'
                      }}>
                        Standard Columns ({filteredStandardCols.length})
                      </div>
                      {filteredStandardCols.map(col => {
                        const checked = isColVisible(col.key);
                        return (
                          <div
                            key={col.key}
                            onClick={() => !col.required && toggleColVisible(col.key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: col.required ? 'default' : 'pointer',
                              backgroundColor: checked ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                              transition: 'background-color var(--transition-fast)'
                            }}
                            onMouseEnter={e => {
                              if (!col.required) e.currentTarget.style.backgroundColor = checked ? 'rgba(37, 99, 235, 0.09)' : 'var(--bg-surface-subtle)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = checked ? 'rgba(37, 99, 235, 0.05)' : 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={col.required}
                                onChange={() => {}}
                                style={{
                                  accentColor: 'var(--color-primary-600)',
                                  cursor: col.required ? 'default' : 'pointer',
                                  width: '13px',
                                  height: '13px'
                                }}
                              />
                              <span style={{
                                fontSize: '11px',
                                fontWeight: checked ? 600 : 400,
                                color: checked ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}>
                                {col.label}
                              </span>
                            </div>
                            {col.required && (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 4px',
                                borderRadius: '3px',
                                backgroundColor: 'var(--color-primary-100)',
                                color: 'var(--color-primary-700)'
                              }}>
                                REQUIRED
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Custom Properties Section */}
                  {filteredCustomCols.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#B45309',
                        padding: '4px 6px',
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Tag size={10} />
                        <span>Custom Properties ({filteredCustomCols.length})</span>
                      </div>
                      {filteredCustomCols.map(col => {
                        const checked = isColVisible(col.key);
                        return (
                          <div
                            key={col.key}
                            onClick={() => toggleColVisible(col.key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              backgroundColor: checked ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                              transition: 'background-color var(--transition-fast)'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = checked ? 'rgba(245, 158, 11, 0.14)' : 'var(--bg-surface-subtle)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = checked ? 'rgba(245, 158, 11, 0.08)' : 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {}}
                                style={{
                                  accentColor: '#D97706',
                                  cursor: 'pointer',
                                  width: '13px',
                                  height: '13px'
                                }}
                              />
                              <span style={{
                                fontSize: '11px',
                                fontWeight: checked ? 600 : 400,
                                color: checked ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}>
                                {col.label}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 600,
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              color: '#B45309',
                              fontFamily: 'monospace'
                            }}>
                              CUSTOM
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredStandardCols.length === 0 && filteredCustomCols.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      No columns match &quot;{colPickerSearch}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {(activeColFilterCount > 0 || searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={handleClearAllFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#EF4444',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <X size={12} />
              <span>Clear Filters ({activeColFilterCount + (searchQuery ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0)})</span>
            </button>
          )}

          {/* Rows Per Page Selector */}
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

      {/* 3. Data Table (Strictly mapped to wes.pallet) */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 0 10px 10px',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          textAlign: 'left'
        }}>
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
              {/* Dynamic Custom Property Columns */}
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
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#B45309',
                        fontWeight: 700
                      }}>
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

            {/* Optional Column Search Row */}
            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                {isColVisible('palletLpn') && (
                  <ColumnFilterCell
                    colKey="palletLpn"
                    placeholder="Filter LPN..."
                    style={{ position: 'sticky', left: 0, zIndex: 12, backgroundColor: 'var(--bg-surface-subtle)', borderRight: '1px solid var(--border-default)' }}
                  />
                )}
                {isColVisible('pallet_alias') && <ColumnFilterCell colKey="pallet_alias" placeholder="Filter alias..." />}
                {isColVisible('loadType') && <ColumnFilterCell colKey="loadType" placeholder="Filter load..." />}
                {isColVisible('strategy') && <ColumnFilterCell colKey="strategy" placeholder="Filter strategy..." />}
                {isColVisible('palletType') && <ColumnFilterCell colKey="palletType" placeholder="Filter pallet type..." />}
                {isColVisible('itemCode') && <ColumnFilterCell colKey="itemCode" placeholder="Filter item code..." />}
                {isColVisible('itemName') && <ColumnFilterCell colKey="itemName" placeholder="Filter item name..." />}
                {isColVisible('skuCode') && <ColumnFilterCell colKey="skuCode" placeholder="Filter SKU..." />}
                {isColVisible('packageCount') && <ColumnFilterCell colKey="packageCount" placeholder="Filter pkgs..." />}
                {isColVisible('quantity') && <ColumnFilterCell colKey="quantity" placeholder="Filter qty..." />}
                {isColVisible('baseUom') && <ColumnFilterCell colKey="baseUom" placeholder="Filter UOM..." />}
                {isColVisible('lotNumber') && <ColumnFilterCell colKey="lotNumber" placeholder="Filter lot..." />}
                {isColVisible('expiryDate') && <ColumnFilterCell colKey="expiryDate" placeholder="Filter expiry..." />}
                {isColVisible('currentLocation') && <ColumnFilterCell colKey="currentLocation" placeholder="Filter location..." />}
                {isColVisible('status') && <ColumnFilterCell colKey="status" placeholder="Filter status..." />}
                {isColVisible('actualWeight') && <ColumnFilterCell colKey="actualWeight" placeholder="Filter weight..." />}
                {isColVisible('mixStatus') && <ColumnFilterCell colKey="mixStatus" placeholder="Filter mix..." />}
                {palletCustomAttrKeys.map(attr => {
                  const colKey = `attr_${attr.code}`;
                  if (!isColVisible(colKey)) return null;
                  return (
                    <ColumnFilterCell
                      key={colKey}
                      colKey={colKey}
                      placeholder={`Filter ${attr.label}...`}
                    />
                  );
                })}
                {isColVisible('actions') && (
                  <th style={{ padding: '3px 6px', backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }} />
                )}
              </tr>
            )}
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={activeVisibleCount} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Loader2 size={16} className="spin" />
                    <span>Loading pallet inventory from wes.pallet...</span>
                  </div>
                </td>
              </tr>
            ) : pagedPallets.length === 0 ? (
              <tr>
                <td colSpan={activeVisibleCount} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
              pagedPallets.map((plt) => {
                const statusBadge = getStatusBadge(plt.status);
                const firstItem = plt.items && plt.items.length > 0 ? plt.items[0] : null;

                return (
                  <tr
                    key={plt.id}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* 1. Pallet LPN (Sticky Column) */}
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
                          onClick={() => handleOpenProcessLogs(plt)}
                          title="Click to view full Process Journey & Timeline"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <Barcode size={13} color="var(--color-primary-600)" />
                          <span style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: 'var(--color-primary-600)',
                            fontSize: '12px',
                            textDecoration: 'underline',
                            textDecorationColor: 'transparent',
                            transition: 'text-decoration-color var(--transition-fast)'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--color-primary-600)')}
                          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                          >
                            {plt.palletLpn}
                          </span>
                          {Boolean(plt.isMixedPallet ?? plt.mixedPallet) && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              color: '#D97706',
                              border: '1px solid rgba(245, 158, 11, 0.25)'
                            }}>
                              MIXED
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 2. Pallet Alias */}
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

                    {/* 2. Load Type */}
                    {isColVisible('loadType') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const badge = getLoadTypeBadge(plt.loadType);
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`
                            }}>
                              {badge.label}
                              {plt.loadType === 'PALLET_STACK' && (plt.customAttributes?.pallet_stack_count || 10) > 0 ? ` (x${plt.customAttributes?.pallet_stack_count || 10})` : ''}
                            </span>
                          );
                        })()}
                      </td>
                    )}

                    {/* 3. Handling Strategy */}
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

                    {/* 4. Pallet Type */}
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

                    {/* 5. Item Code */}
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

                    {/* 6. Item Name */}
                    {isColVisible('itemName') && (
                      <td style={{ padding: '8px 12px', minWidth: '130px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {plt.itemName || firstItem?.itemName || (plt.loadType === 'NO_LOAD' ? 'Empty Carrier' : plt.loadType === 'PALLET_STACK' ? 'Carrier Stack' : '—')}
                        </span>
                      </td>
                    )}

                    {/* 7. SKU Code */}
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

                    {/* 8. Package Count */}
                    {isColVisible('packageCount') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {firstItem?.packageCount !== undefined ? `${firstItem.packageCount} ${firstItem.packageType || 'pkgs'}` : (plt.loadType === 'PALLET_STACK' ? `${plt.customAttributes?.pallet_stack_count || 10} units` : (plt.loadType === 'MATERIAL' ? '1 bulk load' : '—'))}
                        </span>
                      </td>
                    )}

                    {/* 9. Total Qty */}
                    {isColVisible('quantity') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {firstItem?.totalQuantity !== undefined 
                            ? firstItem.totalQuantity 
                            : (plt.loadType === 'MATERIAL' && plt.actualWeightKg ? plt.actualWeightKg : '—')}
                        </span>
                      </td>
                    )}

                    {/* 10. Base UOM */}
                    {isColVisible('baseUom') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {plt.materialBaseUom || firstItem?.baseUom || (plt.loadType === 'MATERIAL' ? 'KG' : (plt.loadType === 'PALLET_STACK' ? 'PLT' : '—'))}
                        </span>
                      </td>
                    )}

                    {/* 11. Lot Number */}
                    {isColVisible('lotNumber') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {firstItem?.lotNumber ? (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-primary-600)'
                          }}>
                            {firstItem.lotNumber}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    )}

                    {/* 12. Expiry Date */}
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

                    {/* 13. Location */}
                    {isColVisible('currentLocation') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <MapPin size={11} color="var(--color-primary-500)" />
                          <span>{plt.currentLocation || 'UNASSIGNED'}</span>
                        </div>
                      </td>
                    )}

                    {/* 14. Status */}
                    {isColVisible('status') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.text,
                          border: `1px solid ${statusBadge.border}`
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: statusBadge.text }} />
                          {statusBadge.label}
                        </span>
                      </td>
                    )}

                    {/* 15. Actual Weight */}
                    {isColVisible('actualWeight') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                          <span style={{ fontWeight: 600 }}>{plt.actualWeightKg != null ? `${plt.actualWeightKg.toFixed(1)} kg` : '—'}</span>
                        </div>
                      </td>
                    )}

                    {/* 16. Mix Status */}
                    {isColVisible('mixStatus') && (
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {Boolean(plt.isMixedPallet ?? plt.mixedPallet) ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#D97706',
                            border: '1px solid rgba(245, 158, 11, 0.25)'
                          }}>
                            MIXED
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(59, 130, 246, 0.10)',
                            color: 'var(--color-primary-600)',
                            border: '1px solid rgba(59, 130, 246, 0.20)'
                          }}>
                            SINGLE
                          </span>
                        )}
                      </td>
                    )}



                    {/* Dynamic Custom Property Cells */}
                    {palletCustomAttrKeys.map(attr => {
                      const colKey = `attr_${attr.code}`;
                      if (!isColVisible(colKey)) return null;
                      const val = plt.customAttributes?.[attr.code];
                      return (
                        <td key={colKey} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          {val !== undefined && val !== null && val !== '' ? (
                            typeof val === 'boolean' || val === 'true' || val === 'false' ? (
                              <span style={{
                                display: 'inline-flex',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: (val === true || val === 'true') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                color: (val === true || val === 'true') ? '#059669' : '#475569',
                                border: (val === true || val === 'true') ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(100, 116, 139, 0.25)'
                              }}>
                                {val === true || val === 'true' ? 'YES' : 'NO'}
                              </span>
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

                    {/* Actions / Process Journey */}
                    {isColVisible('actions') && (
                      <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenProcessLogs(plt)}
                          title="View Process Log Timeline & Record Checkpoint"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--color-primary-600)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                            e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.06)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                          }}
                        >
                          <History size={12} />
                          <span>Process Logs</span>
                        </button>
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
              {recordsLeftToView > 0 && (
                <span style={{ marginLeft: '6px', color: 'var(--text-disabled)' }}>
                  ({recordsLeftToView} remaining to view)
                </span>
              )}
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

      {/* 5. Full Inbound Pallet Modal (All wes.pallet fields) */}
      {isInboundModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(3px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '680px',
            maxWidth: '95vw',
            maxHeight: '92vh',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(22, 163, 74, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A'
                }}>
                  <Box size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      1-Click Inbound Pallet Entry
                    </h3>
                    <span style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--color-primary-600)',
                      fontWeight: 600,
                      border: '1px solid rgba(37, 99, 235, 0.2)'
                    }}>
                      wes.pallet schema
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                    All physical container, operational, and sensor attributes ready for immediate record entry
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => populateFullPalletDefaults()}
                  title="Randomize and regenerate full pallet defaults"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '5px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={11} />
                  <span>Re-roll</span>
                </button>
                <button
                  onClick={() => setIsInboundModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateInboundPallet} style={{
              padding: '16px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {formError && (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={13} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Top Load Type Mode Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Load Type (Carrier Payload)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)'
                }}>
                  {[
                    { id: 'MATERIAL_WITH_SKU', label: 'Material with SKU', desc: 'Packaged SKU load' },
                    { id: 'MATERIAL', label: 'Material Only', desc: 'Direct raw/bulk load' },
                    { id: 'PALLET_STACK', label: 'Pallet Stack', desc: 'Empty pallet stack' },
                    { id: 'NO_LOAD', label: 'No Load (Empty)', desc: 'Tare payload only' },
                  ].map(tab => {
                    const active = inboundLoadType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => populateFullPalletDefaults(tab.id as any)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          border: active ? '1.5px solid var(--color-primary-500)' : '1px solid transparent',
                          backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                          color: active ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          boxShadow: active ? 'var(--shadow-sm)' : 'none',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: active ? 700 : 600 }}>{tab.label}</span>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-disabled)', marginTop: '2px' }}>{tab.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panel 1: Pallet Identity & Carrier Blueprint */}
              <div style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  1. Pallet Identity &amp; Carrier Type
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: (inboundLoadType === 'NO_LOAD' || inboundLoadType === 'PALLET_STACK') ? '1fr 1fr' : '1fr 1fr', gap: '10px' }}>
                  {/* Pallet LPN */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Pallet LPN (Barcode / SSCC) *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        required
                        value={inboundLpn}
                        onChange={e => setInboundLpn(e.target.value)}
                        placeholder="e.g. PLT-2026-442062"
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const seq = Math.floor(100000 + Math.random() * 900000);
                          setInboundLpn(`PLT-2026-${seq}`);
                          setInboundPalletAlias(`ALIAS-${String(seq).slice(-4)}`);
                          setInboundRfidTag(`3034257BF400${String(seq).padStart(12, '0')}`);
                        }}
                        title="Generate fresh LPN barcode & RFID tag"
                        style={{
                          padding: '0 8px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Pallet Alias */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Pallet Alias (Secondary Identifier)
                    </label>
                    <input
                      type="text"
                      value={inboundPalletAlias}
                      onChange={e => setInboundPalletAlias(e.target.value)}
                      placeholder="e.g. ALIAS-4420"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Handling Strategy (Only for MATERIAL and MATERIAL_WITH_SKU) */}
                  {(inboundLoadType === 'MATERIAL' || inboundLoadType === 'MATERIAL_WITH_SKU') && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Handling Strategy
                      </label>
                      <select
                        value={selectedStrategyId}
                        onChange={e => {
                          const stratId = e.target.value;
                          setSelectedStrategyId(stratId);
                          const strat = strategies.find(s => s.id === stratId);
                          if (strat) {
                            if (strat.palletTypeId) setSelectedPalletTypeId(strat.palletTypeId);
                            if (strat.skuId) setSelectedSkuId(strat.skuId);
                            if (strat.itemId) setSelectedItemId(strat.itemId);
                            if (strat.standardPackageCount) {
                              setInboundPackageCount(strat.standardPackageCount);
                              const t = palletTypes.find(p => p.id === (strat.palletTypeId || selectedPalletTypeId));
                              const k = skus.find(item => item.id === (strat.skuId || selectedSkuId));
                              const wt = (t?.tareWeightKg || 25.0) + (strat.standardPackageCount * (k?.unitsPerPackage || 18.0));
                              setInboundActualWeight(Number(wt.toFixed(1)));
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">-- Direct Manual Entry --</option>
                        {strategies.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.strategyCode} — {s.name} ({s.standardPackageCount} pkgs)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Pallet Type */}
                  <div style={{ gridColumn: (inboundLoadType === 'NO_LOAD' || inboundLoadType === 'PALLET_STACK') ? 'auto' : 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Pallet Type (Carrier Master) *
                    </label>
                    <select
                      required
                      value={selectedPalletTypeId}
                      onChange={e => {
                        const typeId = e.target.value;
                        setSelectedPalletTypeId(typeId);
                        const pType = palletTypes.find(p => p.id === typeId);
                        if (pType) {
                          const tare = pType.tareWeightKg;
                          if (inboundLoadType === 'NO_LOAD') {
                            setInboundActualWeight(Number(tare.toFixed(1)));
                          } else if (inboundLoadType === 'PALLET_STACK') {
                            const count = inboundPalletStackCount || 10;
                            setInboundActualWeight(Number((tare * count).toFixed(1)));
                          } else if (inboundLoadType === 'MATERIAL') {
                            setInboundActualWeight(Number((tare + (inboundMaterialQty || 500)).toFixed(1)));
                          } else {
                            const k = skus.find(item => item.id === selectedSkuId);
                            const wt = tare + (inboundPackageCount * (k?.unitsPerPackage || 18.0));
                            setInboundActualWeight(Number(wt.toFixed(1)));
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {palletTypes.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.name} (Tare: {t.tareWeightKg}kg, Payload: {t.maxPayloadKg}kg, {t.material})
                        </option>
                      ))}
                      {palletTypes.length === 0 && (
                        <option value="">Default Standard Pallet</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Panel 2: Dynamic Loaded Inventory & Cargo */}
              <div style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  2. {inboundLoadType === 'NO_LOAD' ? 'Cargo Status' : inboundLoadType === 'PALLET_STACK' ? 'Stack Configuration' : inboundLoadType === 'MATERIAL' ? 'Material Load Details' : 'Loaded SKU Inventory'}
                </div>

                {/* Mode 1: NO_LOAD */}
                {inboundLoadType === 'NO_LOAD' && (
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px dashed var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <Box size={24} color="var(--text-secondary)" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Empty Carrier Pallet (No Payload)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        This pallet carrier is circulating without material or packaged SKU cargo. Recorded weight matches empty carrier tare ({inboundActualWeight} kg).
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 2: PALLET_STACK */}
                {inboundLoadType === 'PALLET_STACK' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Pallet Stack Count (units) *
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        required
                        value={inboundPalletStackCount}
                        onChange={e => {
                          const count = parseInt(e.target.value, 10) || 2;
                          setInboundPalletStackCount(count);
                          const pType = palletTypes.find(p => p.id === selectedPalletTypeId);
                          const tare = pType?.tareWeightKg || 25.0;
                          setInboundActualWeight(Number((tare * count).toFixed(1)));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                        Stack Configuration
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        {inboundPalletStackCount} nested carriers • Total tare: {inboundActualWeight} kg
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 3: MATERIAL */}
                {inboundLoadType === 'MATERIAL' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Material / Bulk Item Master *
                      </label>
                      <select
                        required
                        value={selectedItemId}
                        onChange={e => setSelectedItemId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id}>
                            {it.itemCode} — {it.name} (Base UOM: {it.baseUom}, Type: {it.itemType})
                          </option>
                        ))}
                        {items.length === 0 && (
                          <option value="">Default Material Item</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Material Quantity ({items.find(i => i.id === selectedItemId)?.baseUom || 'KG'}) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0.1}
                        required
                        value={inboundMaterialQty}
                        onChange={e => {
                          const qty = parseFloat(e.target.value) || 0;
                          setInboundMaterialQty(qty);
                          const pType = palletTypes.find(p => p.id === selectedPalletTypeId);
                          const tare = pType?.tareWeightKg || 25.0;
                          setInboundActualWeight(Number((tare + qty).toFixed(1)));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Batch / Lot Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={inboundLotNumber}
                        onChange={e => setInboundLotNumber(e.target.value)}
                        placeholder="e.g. LOT-2026-491"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Material Expiration / Shelf Date
                      </label>
                      <input
                        type="date"
                        value={inboundExpiryDate}
                        onChange={e => setInboundExpiryDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Mode 4: MATERIAL_WITH_SKU */}
                {inboundLoadType === 'MATERIAL_WITH_SKU' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        SKU Item *
                      </label>
                      <select
                        required
                        value={selectedSkuId}
                        onChange={e => {
                          const skuId = e.target.value;
                          setSelectedSkuId(skuId);
                          const k = skus.find(item => item.id === skuId);
                          const t = palletTypes.find(p => p.id === selectedPalletTypeId);
                          const wt = (t?.tareWeightKg || 25.0) + (inboundPackageCount * (k?.unitsPerPackage || 18.0));
                          setInboundActualWeight(Number(wt.toFixed(1)));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {skus.map(k => (
                          <option key={k.id} value={k.id}>
                            {k.skuCode} — {k.itemName} ({k.packageType || 'PKG'}, {k.unitsPerPackage} units/pkg)
                          </option>
                        ))}
                        {skus.length === 0 && (
                          <option value="">Standard Demo SKU</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Package Count (pkgs) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={inboundPackageCount}
                        onChange={e => {
                          const count = parseInt(e.target.value, 10) || 1;
                          setInboundPackageCount(count);
                          const k = skus.find(item => item.id === selectedSkuId);
                          const t = palletTypes.find(p => p.id === selectedPalletTypeId);
                          const wt = (t?.tareWeightKg || 25.0) + (count * (k?.unitsPerPackage || 18.0));
                          setInboundActualWeight(Number(wt.toFixed(1)));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Batch / Lot Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={inboundLotNumber}
                        onChange={e => setInboundLotNumber(e.target.value)}
                        placeholder="e.g. LOT-2026-491"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Lot Expiration Date
                      </label>
                      <input
                        type="date"
                        value={inboundExpiryDate}
                        onChange={e => setInboundExpiryDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Panel 3: Operational State & Location */}
              <div style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  3. Operational State &amp; Location
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {/* Current Location */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Current Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={inboundLocation}
                      onChange={e => setInboundLocation(e.target.value)}
                      placeholder="e.g. STAGING-LANE-01"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Operational Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Operational Status
                    </label>
                    <select
                      value={inboundStatus}
                      onChange={e => setInboundStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="STAGED">STAGED</option>
                      <option value="CREATED">CREATED</option>
                      <option value="IN_ASRS">IN_ASRS</option>
                      <option value="LOADED">LOADED</option>
                      <option value="SHIPPED">SHIPPED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Panel 4: Physical Sensor Readings & Quality Validations */}
              <div style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  4. Sensor Telemetry &amp; Quality Checks
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Actual Weight (kg) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Actual Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={inboundActualWeight}
                      onChange={e => setInboundActualWeight(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Mix Status Toggle (Boolean) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    opacity: inboundLoadType === 'MATERIAL_WITH_SKU' ? 1 : 0.55
                  }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Mix Status
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {inboundLoadType === 'MATERIAL_WITH_SKU' ? 'Single vs multi-SKU load' : 'Single / Not applicable'}
                      </span>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: inboundLoadType === 'MATERIAL_WITH_SKU' ? 'pointer' : 'not-allowed' }}>
                      <input
                        type="checkbox"
                        disabled={inboundLoadType !== 'MATERIAL_WITH_SKU'}
                        checked={inboundLoadType === 'MATERIAL_WITH_SKU' ? inboundIsMixed : false}
                        onChange={e => setInboundIsMixed(e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: inboundLoadType === 'MATERIAL_WITH_SKU' ? 'pointer' : 'not-allowed', accentColor: 'var(--color-primary-600)' }}
                      />
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: (inboundLoadType === 'MATERIAL_WITH_SKU' && inboundIsMixed) ? '#D97706' : 'var(--color-primary-600)'
                      }}>
                        {(inboundLoadType === 'MATERIAL_WITH_SKU' && inboundIsMixed) ? 'MIXED' : 'SINGLE'}
                      </span>
                    </label>
                  </div>

                  {/* RFID EPC Tag */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      IoT Telemetry (RFID EPC Tag)
                    </label>
                    <input
                      type="text"
                      value={inboundRfidTag}
                      onChange={e => setInboundRfidTag(e.target.value)}
                      placeholder="e.g. 3034257BF400000000442062"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => populateFullPalletDefaults()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Randomize Defaults</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsInboundModalOpen(false)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                    }}
                  >
                    {isSubmitting ? <Loader2 size={13} className="spin" /> : <Check size={14} />}
                    <span>Register Pallet in wes.pallet</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Pallet Process Logs & Properties Timeline Modal */}
      {selectedPalletForLogs && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '14px',
            width: '840px',
            maxWidth: '96vw',
            maxHeight: '92vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary-600)'
                }}>
                  <History size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Pallet Process Journey &amp; Properties
                    </h3>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      backgroundColor: 'var(--color-primary-600)',
                      color: '#FFFFFF'
                    }}>
                      {selectedPalletForLogs.palletLpn}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Track milestones, location changes, and point-in-time custom properties from <code style={{ fontSize: '10.5px' }}>wes.pallet_process_log</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPalletForLogs(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '18px 22px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Active Pallet Overview Card */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--border-default)'
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Current Status
                  </span>
                  <div style={{ marginTop: '3px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: getStatusBadge(selectedPalletForLogs.status).bg,
                      color: getStatusBadge(selectedPalletForLogs.status).text,
                      border: `1px solid ${getStatusBadge(selectedPalletForLogs.status).border}`
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: getStatusBadge(selectedPalletForLogs.status).text }} />
                      {selectedPalletForLogs.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Current Location
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                    <MapPin size={12} color="var(--color-primary-600)" />
                    <span>{selectedPalletForLogs.currentLocation || 'UNASSIGNED'}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Load Type / Cargo
                  </span>
                  <div style={{ marginTop: '3px', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                    {selectedPalletForLogs.loadType || 'MATERIAL_WITH_SKU'}
                    {selectedPalletForLogs.itemName && ` (${selectedPalletForLogs.itemName})`}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Gross Weight
                  </span>
                  <div style={{ marginTop: '3px', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                    {selectedPalletForLogs.actualWeightKg != null ? `${selectedPalletForLogs.actualWeightKg} kg` : '—'}
                  </div>
                </div>
              </div>

              {/* Accumulated Active Properties Snapshot */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.04)',
                border: '1px solid rgba(245, 158, 11, 0.20)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={13} color="#D97706" />
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B45309' }}>
                      Active Pallet Properties Snapshot (from wes.pallet.custom_attributes)
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Accumulated latest state across all journey steps
                  </span>
                </div>

                {selectedPalletForLogs.customAttributes && Object.keys(selectedPalletForLogs.customAttributes).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(selectedPalletForLogs.customAttributes).map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#B45309' }}>{k}</span>
                        <span style={{ color: 'var(--border-default)' }}>=</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No custom properties accumulated yet. Log a checkpoint below to add properties like scale_weight, inspection notes, seal numbers, etc.
                  </div>
                )}
              </div>

              {/* Two-column or split: Timeline on Left, Checkpoint Logger on Right */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                {/* Process Journey Timeline */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: 'var(--bg-page)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} color="var(--color-primary-600)" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Journey Milestones ({processLogs.length})
                      </span>
                    </div>
                    {isLoadingLogs && <Loader2 size={13} className="spin" style={{ color: 'var(--color-primary-600)' }} />}
                  </div>

                  {isLoadingLogs ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      <Loader2 size={16} className="spin" style={{ margin: '0 auto 6px auto' }} />
                      Loading process logs...
                    </div>
                  ) : processLogs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      No process milestones recorded for this pallet yet.
                    </div>
                  ) : (
                    <div style={{
                      position: 'relative',
                      paddingLeft: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {/* Vertical timeline track line */}
                      <div style={{
                        position: 'absolute',
                        left: '5px',
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        backgroundColor: 'var(--border-default)'
                      }} />

                      {processLogs.map((log, idx) => {
                        const stageColors: Record<string, { bg: string; text: string; border: string }> = {
                          INBOUND: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563EB', border: 'rgba(59, 130, 246, 0.3)' },
                          SCALE: { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', border: 'rgba(245, 158, 11, 0.3)' },
                          ROUTED: { bg: 'rgba(139, 92, 246, 0.12)', text: '#7C3AED', border: 'rgba(139, 92, 246, 0.3)' },
                          STORED: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' },
                          DISPATCH: { bg: 'rgba(14, 165, 233, 0.12)', text: '#0284C7', border: 'rgba(14, 165, 233, 0.3)' }
                        };
                        const color = stageColors[log.processStage] || {
                          bg: 'var(--bg-surface-subtle)',
                          text: 'var(--text-primary)',
                          border: 'var(--border-default)'
                        };

                        return (
                          <div key={log.id || idx} style={{ position: 'relative' }}>
                            {/* Bullet node on timeline */}
                            <div style={{
                              position: 'absolute',
                              left: '-16px',
                              top: '4px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: color.text,
                              border: '2px solid var(--bg-surface)',
                              boxShadow: '0 0 0 1px var(--border-default)'
                            }} />

                            <div style={{
                              padding: '8px 10px',
                              borderRadius: '7px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-default)',
                              fontSize: '11px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '10.5px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: color.bg,
                                  color: color.text,
                                  border: `1px solid ${color.border}`
                                }}>
                                  {log.processStage}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                {log.location && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <MapPin size={10} />
                                    {log.location}
                                  </span>
                                )}
                                {log.status && (
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 600,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    color: 'var(--text-primary)'
                                  }}>
                                    {log.status}
                                  </span>
                                )}
                              </div>

                              {log.notes && (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-primary)', fontStyle: 'italic', marginTop: '2px' }}>
                                  &quot;{log.notes}&quot;
                                </div>
                              )}

                              {/* Checkpoint Properties Snapshot */}
                              {log.propertiesSnapshot && Object.keys(log.propertiesSnapshot).length > 0 && (
                                <div style={{
                                  marginTop: '4px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-surface-subtle)',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px'
                                }}>
                                  {Object.entries(log.propertiesSnapshot).map(([k, v]) => (
                                    <span key={k} style={{
                                      fontSize: '9.5px',
                                      fontFamily: 'monospace',
                                      color: 'var(--text-primary)'
                                    }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>{' '}
                                      <b>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</b>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* + Log Stage Checkpoint Form */}
                <div style={{
                  backgroundColor: 'var(--bg-page)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <PlusCircle size={14} color="#16A34A" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Log Next Process Checkpoint
                    </span>
                  </div>

                  <form onSubmit={handleRecordProcessLog} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Process Stage */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Process Stage (VARCHAR(10)) *
                      </label>
                      <select
                        value={newLogStage}
                        onChange={e => setNewLogStage(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none'
                        }}
                      >
                        <option value="SCALE">SCALE (Dimension &amp; Weight Check)</option>
                        <option value="ROUTED">ROUTED (Conveyor Junction)</option>
                        <option value="STORED">STORED (ASRS Rack Location)</option>
                        <option value="DISPATCH">DISPATCH (Outbound Staging)</option>
                        <option value="CUSTOM">Custom Code (&lt;=10 chars)</option>
                      </select>

                      {newLogStage === 'CUSTOM' && (
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="e.g. AUDIT, WRAP"
                          value={customStageText}
                          onChange={e => setCustomStageText(e.target.value.toUpperCase())}
                          style={{
                            width: '100%',
                            marginTop: '4px',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '11.5px',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box'
                          }}
                        />
                      )}
                    </div>

                    {/* Location & Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Location
                        </label>
                        <input
                          type="text"
                          value={newLogLocation}
                          onChange={e => setNewLogLocation(e.target.value)}
                          placeholder="e.g. SCALE-01"
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Status
                        </label>
                        <input
                          type="text"
                          value={newLogStatus}
                          onChange={e => setNewLogStatus(e.target.value)}
                          placeholder="e.g. IN_TRANSIT"
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* Milestone Notes */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Milestone Notes
                      </label>
                      <input
                        type="text"
                        value={newLogNotes}
                        onChange={e => setNewLogNotes(e.target.value)}
                        placeholder="e.g. Scale reading verified; within tolerance"
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Checkpoint Properties (Dynamic Key-Values) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Add Stage Properties (JSONB)
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewLogProperties(prev => [...prev, { key: '', value: '' }])}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10.5px',
                            color: 'var(--color-primary-600)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: '2px 4px'
                          }}
                        >
                          <Plus size={11} />
                          <span>Add Property</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {newLogProperties.map((prop, pIdx) => (
                          <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Property (e.g. scale_kg)"
                              value={prop.key}
                              onChange={e => {
                                const val = e.target.value;
                                setNewLogProperties(prev => prev.map((item, i) => i === pIdx ? { ...item, key: val } : item));
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                fontSize: '10.5px',
                                fontFamily: 'monospace'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Value (e.g. 1045.2)"
                              value={prop.value}
                              onChange={e => {
                                const val = e.target.value;
                                setNewLogProperties(prev => prev.map((item, i) => i === pIdx ? { ...item, value: val } : item));
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                fontSize: '10.5px',
                                fontFamily: 'monospace'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setNewLogProperties(prev => prev.filter((_, i) => i !== pIdx))}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '2px'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}

                        {newLogProperties.length === 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                            Optional: Click &quot;+ Add Property&quot; to append stage-specific properties (e.g. scanner_result, scale_kg, bay_id).
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLog}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isSubmittingLog ? 'wait' : 'pointer',
                        marginTop: '4px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                      }}
                    >
                      {isSubmittingLog ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                      <span>Record Checkpoint &amp; Merge Properties</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '10px 20px',
              borderTop: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <button
                type="button"
                onClick={() => setSelectedPalletForLogs(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
