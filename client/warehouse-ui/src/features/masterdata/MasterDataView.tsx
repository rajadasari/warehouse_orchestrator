import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Package, 
  Layers, 
  Settings2, 
  Warehouse, 
  Plus, 
  Search, 
  Filter,
  X, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Box
} from 'lucide-react';
import { 
  masterDataService, 
  ItemMaster, 
  SkuMaster, 
  PalletType, 
  PalletHandlingStrategy, 
  CustomAttributeDef 
} from '../../services/masterDataService';

type TabKey = 'materials' | 'skus' | 'pallet_types' | 'strategies' | 'custom_fields';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export const MasterDataView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('materials');
  const [isLoading, setIsLoading] = useState(true);

  // Datasets
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [skus, setSkus] = useState<SkuMaster[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [strategies, setStrategies] = useState<PalletHandlingStrategy[]>([]);
  const [customAttrs, setCustomAttrs] = useState<CustomAttributeDef[]>([]);

  // Dynamic Custom Attribute Column Definitions derived from active custom field definitions + existing record keys
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

  // Search & Global Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [attrEntityFilter, setAttrEntityFilter] = useState('ALL');

  // Column-Level Search & Filters
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showColFilters, setShowColFilters] = useState(true);

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'itemCode', direction: 'asc' });

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddSkuModalOpen, setIsAddSkuModalOpen] = useState(false);
  const [isAddPalletTypeModalOpen, setIsAddPalletTypeModalOpen] = useState(false);
  const [isAddStrategyModalOpen, setIsAddStrategyModalOpen] = useState(false);
  const [isAddAttrModalOpen, setIsAddAttrModalOpen] = useState(false);

  // Form states for Add Pallet Type
  const [newPtCode, setNewPtCode] = useState('');
  const [newPtName, setNewPtName] = useState('');
  const [newPtMaterial, setNewPtMaterial] = useState<'WOOD' | 'PLASTIC' | 'METAL' | 'COMPOSITE'>('WOOD');
  const [newPtTareWeight, setNewPtTareWeight] = useState(25);
  const [newPtLength, setNewPtLength] = useState(1200);
  const [newPtWidth, setNewPtWidth] = useState(800);
  const [newPtHeight, setNewPtHeight] = useState(144);
  const [newPtMaxPayload, setNewPtMaxPayload] = useState(1500);

  // Form states for Add Item
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'RAW_MATERIAL' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [newBaseUom, setNewBaseUom] = useState<'KG' | 'LITER' | 'EA'>('KG');
  const [newAllowMixed, setNewAllowMixed] = useState(true);
  const [newMixedGroup, setNewMixedGroup] = useState('GENERAL');
  const [newItemDynAttrs, setNewItemDynAttrs] = useState<Record<string, any>>({});

  // Form states for Add SKU
  const [newSkuCode, setNewSkuCode] = useState('');
  const [newSkuItemId, setNewSkuItemId] = useState('');
  const [newPackageType, setNewPackageType] = useState<'CAN' | 'BAG' | 'CARTON' | 'DRUM' | 'LOOSE'>('BAG');
  const [newUnitsPerPack, setNewUnitsPerPack] = useState(25);
  const [newBarcode, setNewBarcode] = useState('');
  const [newSkuDims, setNewSkuDims] = useState('');
  const [newIsFragile, setNewIsFragile] = useState(false);

  // Form states for Add Strategy
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

  // Form states for Add Custom Field
  const [newAttrEntity, setNewAttrEntity] = useState<'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET'>('ITEM');
  const [newAttrCode, setNewAttrCode] = useState('');
  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrType, setNewAttrType] = useState<'STRING' | 'NUMBER' | 'BOOLEAN' | 'SELECT_ONE'>('STRING');
  const [newAttrUom, setNewAttrUom] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');

  // Edit states for Material / Item Master
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [editItemCode, setEditItemCode] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editItemType, setEditItemType] = useState<'RAW_MATERIAL' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [editBaseUom, setEditBaseUom] = useState<'KG' | 'LITER' | 'EA'>('KG');
  const [editAllowMixed, setEditAllowMixed] = useState(true);
  const [editMixedGroup, setEditMixedGroup] = useState('GENERAL');
  const [editItemStatus, setEditItemStatus] = useState('ACTIVE');
  const [editItemDynAttrs, setEditItemDynAttrs] = useState<Record<string, any>>({});

  // Edit states for Packaging SKU Master
  const [isEditSkuModalOpen, setIsEditSkuModalOpen] = useState(false);
  const [editingSkuId, setEditingSkuId] = useState('');
  const [editSkuCode, setEditSkuCode] = useState('');
  const [editSkuItemId, setEditSkuItemId] = useState('');
  const [editPackageType, setEditPackageType] = useState<'CAN' | 'BAG' | 'CARTON' | 'DRUM' | 'LOOSE'>('BAG');
  const [editUnitsPerPack, setEditUnitsPerPack] = useState(25);
  const [editBarcode, setEditBarcode] = useState('');
  const [editSkuIsActive, setEditSkuIsActive] = useState(true);
  const [editSkuDynAttrs, setEditSkuDynAttrs] = useState<Record<string, any>>({});

  // Edit states for Pallet Type Master
  const [isEditPalletTypeModalOpen, setIsEditPalletTypeModalOpen] = useState(false);
  const [editingPtId, setEditingPtId] = useState('');
  const [editPtCode, setEditPtCode] = useState('');
  const [editPtName, setEditPtName] = useState('');
  const [editPtMaterial, setEditPtMaterial] = useState<'WOOD' | 'PLASTIC' | 'METAL' | 'COMPOSITE'>('WOOD');
  const [editPtTareWeight, setEditPtTareWeight] = useState(25);
  const [editPtLength, setEditPtLength] = useState(1200);
  const [editPtWidth, setEditPtWidth] = useState(800);
  const [editPtHeight, setEditPtHeight] = useState(144);
  const [editPtMaxPayload, setEditPtMaxPayload] = useState(1500);

  // Load all datasets
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itms, sk, pt, strat, attrs] = await Promise.all([
        masterDataService.getItems().catch(() => []),
        masterDataService.getSkus().catch(() => []),
        masterDataService.getPalletTypes().catch(() => []),
        masterDataService.getStrategies().catch(() => []),
        masterDataService.getCustomAttributes().catch(() => [])
      ]);
      setItems(itms);
      setSkus(sk);
      setPalletTypes(pt);
      setStrategies(strat);
      setCustomAttrs(attrs);

      if (itms.length > 0) {
        if (!newSkuItemId) setNewSkuItemId(itms[0].id);
        if (!newStratItemId) setNewStratItemId(itms[0].id);
      }
      if (sk.length > 0 && !newStratSkuId) {
        setNewStratSkuId(sk[0].id);
      }
      if (pt.length > 0 && (!newStratPalletTypeId || newStratPalletTypeId === 'pt-1')) {
        setNewStratPalletTypeId(pt[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset pagination & column filters when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
    setColFilters({});
    if (activeTab === 'materials') setSortConfig({ key: 'itemCode', direction: 'asc' });
    else if (activeTab === 'skus') setSortConfig({ key: 'skuCode', direction: 'asc' });
    else if (activeTab === 'pallet_types') setSortConfig({ key: 'code', direction: 'asc' });
    else if (activeTab === 'strategies') setSortConfig({ key: 'strategyCode', direction: 'asc' });
    else if (activeTab === 'custom_fields') setSortConfig({ key: 'targetEntity', direction: 'asc' });
  }, [activeTab]);

  const handleColFilterChange = (colKey: string, value: string) => {
    setColFilters(prev => {
      const next = { ...prev };
      if (!value) {
        delete next[colKey];
      } else {
        next[colKey] = value;
      }
      return next;
    });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setColFilters({});
    setSearchQuery('');
    setAttrEntityFilter('ALL');
    setCurrentPage(1);
  };

  const activeColFilterCount = useMemo(() => {
    return Object.values(colFilters).filter(v => v && v.trim() !== '').length;
  }, [colFilters]);

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
    if (sortConfig.key !== key) return <ArrowUpDown size={12} color="var(--text-disabled)" style={{ opacity: 0.5 }} />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} color="var(--color-primary-500)" /> 
      : <ArrowDown size={12} color="var(--color-primary-500)" />;
  };

  // Handlers for Creation
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newItemName) return;
    await masterDataService.createItem({
      itemCode: newItemCode,
      name: newItemName,
      itemType: newItemType,
      baseUom: newBaseUom,
      allowMixedPallet: newAllowMixed,
      mixedPalletGroup: newMixedGroup,
      status: 'ACTIVE',
      customAttributes: newItemDynAttrs
    });
    setIsAddItemModalOpen(false);
    setNewItemCode('');
    setNewItemName('');
    setNewItemDynAttrs({});
    loadData();
  };

  const handleCreateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkuCode || !newSkuItemId) return;
    await masterDataService.createSku({
      skuCode: newSkuCode,
      itemId: newSkuItemId,
      packageType: newPackageType,
      unitsPerPackage: Number(newUnitsPerPack),
      barcode: newBarcode,
      isActive: true,
      customAttributes: {
        sku_dimensions_mm: newSkuDims,
        is_fragile: newIsFragile
      }
    });
    setIsAddSkuModalOpen(false);
    setNewSkuCode('');
    setNewBarcode('');
    setNewSkuDims('');
    loadData();
  };

  // Handlers for Editing & Deleting Item Master
  const openEditItem = (item: ItemMaster) => {
    setEditingItemId(item.id);
    setEditItemCode(item.itemCode);
    setEditItemName(item.name);
    setEditItemType((item.itemType as any) || 'RAW_MATERIAL');
    setEditBaseUom((item.baseUom as any) || 'KG');
    setEditAllowMixed(item.allowMixedPallet);
    setEditMixedGroup(item.mixedPalletGroup || 'GENERAL');
    setEditItemStatus(item.status || 'ACTIVE');
    setEditItemDynAttrs({ ...(item.customAttributes || {}) });
    setIsEditItemModalOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId || !editItemCode || !editItemName) return;
    try {
      await masterDataService.updateItem(editingItemId, {
        itemCode: editItemCode,
        name: editItemName,
        itemType: editItemType,
        baseUom: editBaseUom,
        allowMixedPallet: editAllowMixed,
        mixedPalletGroup: editMixedGroup,
        status: editItemStatus,
        customAttributes: editItemDynAttrs
      });
      setIsEditItemModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (item: ItemMaster) => {
    if (!window.confirm(`Are you sure you want to delete material "${item.itemCode} - ${item.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await masterDataService.deleteItem(item.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  // Handlers for Editing & Deleting SKU Master
  const openEditSku = (sku: SkuMaster) => {
    setEditingSkuId(sku.id);
    setEditSkuCode(sku.skuCode);
    setEditSkuItemId(sku.itemId);
    setEditPackageType((sku.packageType as any) || 'BAG');
    setEditUnitsPerPack(sku.unitsPerPackage || 1);
    setEditBarcode(sku.barcode || '');
    setEditSkuIsActive(sku.isActive);
    setEditSkuDynAttrs({ ...(sku.customAttributes || {}) });
    setIsEditSkuModalOpen(true);
  };

  const handleUpdateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkuId || !editSkuCode || !editSkuItemId) return;
    try {
      await masterDataService.updateSku(editingSkuId, {
        skuCode: editSkuCode,
        itemId: editSkuItemId,
        packageType: editPackageType,
        unitsPerPackage: Number(editUnitsPerPack),
        barcode: editBarcode,
        isActive: editSkuIsActive,
        customAttributes: editSkuDynAttrs
      });
      setIsEditSkuModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update SKU');
    }
  };

  const handleDeleteSku = async (sku: SkuMaster) => {
    if (!window.confirm(`Are you sure you want to delete SKU "${sku.skuCode}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await masterDataService.deleteSku(sku.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete SKU');
    }
  };

  // Handlers for Pallet Type Master (wes.pallet_type_master)
  const handleCreatePalletType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtCode || !newPtName) return;
    try {
      await masterDataService.createPalletType({
        code: newPtCode.toUpperCase().trim(),
        name: newPtName.trim(),
        material: newPtMaterial,
        tareWeightKg: Number(newPtTareWeight),
        lengthMm: Number(newPtLength),
        widthMm: Number(newPtWidth),
        heightMm: Number(newPtHeight),
        maxPayloadKg: Number(newPtMaxPayload)
      });
      setIsAddPalletTypeModalOpen(false);
      setNewPtCode('');
      setNewPtName('');
      setNewPtMaterial('WOOD');
      setNewPtTareWeight(25);
      setNewPtLength(1200);
      setNewPtWidth(800);
      setNewPtHeight(144);
      setNewPtMaxPayload(1500);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create pallet type');
    }
  };

  const openEditPalletType = (pt: PalletType) => {
    setEditingPtId(pt.id);
    setEditPtCode(pt.code);
    setEditPtName(pt.name);
    setEditPtMaterial((pt.material as any) || 'WOOD');
    setEditPtTareWeight(pt.tareWeightKg);
    setEditPtLength(pt.lengthMm);
    setEditPtWidth(pt.widthMm);
    setEditPtHeight(pt.heightMm);
    setEditPtMaxPayload(pt.maxPayloadKg);
    setIsEditPalletTypeModalOpen(true);
  };

  const handleUpdatePalletType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPtId || !editPtCode || !editPtName) return;
    try {
      await masterDataService.updatePalletType(editingPtId, {
        code: editPtCode.toUpperCase().trim(),
        name: editPtName.trim(),
        material: editPtMaterial,
        tareWeightKg: Number(editPtTareWeight),
        lengthMm: Number(editPtLength),
        widthMm: Number(editPtWidth),
        heightMm: Number(editPtHeight),
        maxPayloadKg: Number(editPtMaxPayload)
      });
      setIsEditPalletTypeModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update pallet type');
    }
  };

  const handleDeletePalletType = async (pt: PalletType) => {
    if (!window.confirm(`Are you sure you want to delete pallet type "${pt.code} - ${pt.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await masterDataService.deletePalletType(pt.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete pallet type');
    }
  };

  const handleOpenAddStrategyModal = () => {
    if (items.length > 0 && (!newStratItemId || !items.some(i => i.id === newStratItemId))) {
      setNewStratItemId(items[0].id);
    }
    if (skus.length > 0 && (!newStratSkuId || !skus.some(s => s.id === newStratSkuId))) {
      setNewStratSkuId(skus[0].id);
    }
    if (palletTypes.length > 0 && (!newStratPalletTypeId || newStratPalletTypeId === 'pt-1' || !palletTypes.some(pt => pt.id === newStratPalletTypeId))) {
      setNewStratPalletTypeId(palletTypes[0].id);
    }
    setNewStratCode('');
    setNewStratName('');
    setIsAddStrategyModalOpen(true);
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newStratCode.trim();
    if (!code) {
      alert('Please enter a Strategy Code.');
      return;
    }
    const resolvedItemId = newStratItemId || items[0]?.id;
    if (!resolvedItemId) {
      alert('Please select or create a Material first.');
      return;
    }
    const resolvedSkuId = newStratSkuId || skus[0]?.id;
    if (!resolvedSkuId) {
      alert('Please select or create a Packaging SKU first.');
      return;
    }
    const resolvedPtId = (newStratPalletTypeId && newStratPalletTypeId !== 'pt-1') 
      ? newStratPalletTypeId 
      : palletTypes[0]?.id;
    if (!resolvedPtId) {
      alert('Please select or create a Pallet Type first.');
      return;
    }

    try {
      await masterDataService.createStrategy({
        strategyCode: code,
        name: newStratName.trim() || code,
        itemId: resolvedItemId,
        skuId: resolvedSkuId,
        palletTypeId: resolvedPtId,
        fullLayerQty: Number(newFullLayerQty) || 1,
        maxLayers: Number(newMaxLayers) || 1,
        expectedTotalWeightKg: Number(newExpectedWeight) || 0,
        expectedHeightMm: Number(newExpectedHeight) || 0,
        isDefault: true,
        customAttributes: {
          load_bearing: newLoadBearing
        }
      });
      setIsAddStrategyModalOpen(false);
      setNewStratCode('');
      setNewStratName('');
      await loadData();
    } catch (err: any) {
      console.error('Error creating strategy:', err);
      alert(err.message || 'Failed to create Pallet Blueprint Recipe');
    }
  };

  const handleCreateCustomAttr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrCode || !newAttrLabel) return;
    const options = newAttrOptions ? newAttrOptions.split(',').map(s => s.trim()) : undefined;
    await masterDataService.createCustomAttribute({
      targetEntity: newAttrEntity,
      attributeCode: newAttrCode,
      label: newAttrLabel,
      dataType: newAttrType,
      unitOfMeasure: newAttrUom || undefined,
      appliesToCategory: 'ALL',
      isRequired: false,
      allowedOptions: options,
      isActive: true,
      sortOrder: customAttrs.length + 1
    });
    setIsAddAttrModalOpen(false);
    setNewAttrCode('');
    setNewAttrLabel('');
    setNewAttrUom('');
    setNewAttrOptions('');
    loadData();
  };

  // Helper generic sorter
  const sortData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Check in customAttributes if undefined at root
      if (aVal === undefined && a.customAttributes) aVal = a.customAttributes[sortConfig.key];
      if (bVal === undefined && b.customAttributes) bVal = b.customAttributes[sortConfig.key];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(String(bVal));
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }
      if (typeof aVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
      }
      return 0;
    });
  };

  // Filtered & Sorted Datasets
  const processedItems = useMemo(() => {
    const filtered = items.filter(i => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCustom = i.customAttributes && Object.values(i.customAttributes).some(
          v => v !== undefined && v !== null && String(v).toLowerCase().includes(q)
        );
        const matchesGlobal = i.itemCode.toLowerCase().includes(q) || 
                              i.name.toLowerCase().includes(q) ||
                              i.baseUom.toLowerCase().includes(q) ||
                              (i.mixedPalletGroup || '').toLowerCase().includes(q) ||
                              matchesCustom;
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'itemCode' && !i.itemCode.toLowerCase().includes(val)) return false;
        if (key === 'name' && !i.name.toLowerCase().includes(val)) return false;
        if (key === 'baseUom' && !i.baseUom.toLowerCase().includes(val)) return false;
        if (key === 'mixedPalletGroup' && !(i.mixedPalletGroup || '').toLowerCase().includes(val)) return false;
        if (key === 'status' && !i.status.toLowerCase().includes(val)) return false;

        // Dynamic custom attribute filter
        if (itemCustomAttrs.some(a => a.code === key)) {
          const attrVal = i.customAttributes?.[key];
          if (attrVal === undefined || attrVal === null || !String(attrVal).toLowerCase().includes(val)) {
            return false;
          }
        }
      }
      return true;
    });
    return sortData(filtered);
  }, [items, searchQuery, colFilters, sortConfig, itemCustomAttrs]);

  const processedSkus = useMemo(() => {
    const filtered = skus.filter(s => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCustom = s.customAttributes && Object.values(s.customAttributes).some(
          v => v !== undefined && v !== null && String(v).toLowerCase().includes(q)
        );
        const matchesGlobal = s.skuCode.toLowerCase().includes(q) ||
               (s.itemName && s.itemName.toLowerCase().includes(q)) ||
               s.packageType.toLowerCase().includes(q) ||
               (s.barcode || '').toLowerCase().includes(q) ||
               matchesCustom;
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'skuCode' && !s.skuCode.toLowerCase().includes(val)) return false;
        if (key === 'itemName' && !(s.itemName || '').toLowerCase().includes(val)) return false;
        if (key === 'packageType' && s.packageType.toLowerCase() !== val && !s.packageType.toLowerCase().includes(val)) return false;
        if (key === 'unitsPerPackage' && !String(s.unitsPerPackage).includes(val)) return false;
        if (key === 'barcode' && !(s.barcode || '').toLowerCase().includes(val)) return false;
        if (key === 'status') {
          const statusStr = s.isActive ? 'active' : 'inactive';
          if (statusStr !== val && !statusStr.includes(val)) return false;
        }

        // Dynamic custom attribute filter
        if (skuCustomAttrs.some(a => a.code === key)) {
          const attrVal = s.customAttributes?.[key];
          if (attrVal === undefined || attrVal === null || !String(attrVal).toLowerCase().includes(val)) {
            return false;
          }
        }
      }
      return true;
    });
    return sortData(filtered);
  }, [skus, searchQuery, colFilters, sortConfig, skuCustomAttrs]);

  const processedPalletTypes = useMemo(() => {
    const filtered = palletTypes.filter(pt => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = pt.code.toLowerCase().includes(q) ||
          pt.name.toLowerCase().includes(q) ||
          pt.material.toLowerCase().includes(q) ||
          String(pt.tareWeightKg).includes(q) ||
          String(pt.lengthMm).includes(q) ||
          String(pt.widthMm).includes(q) ||
          String(pt.heightMm).includes(q) ||
          String(pt.maxPayloadKg).includes(q);
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'code' && !pt.code.toLowerCase().includes(val)) return false;
        if (key === 'name' && !pt.name.toLowerCase().includes(val)) return false;
        if (key === 'material' && pt.material.toLowerCase() !== val && !pt.material.toLowerCase().includes(val)) return false;
        if (key === 'tareWeightKg' && !String(pt.tareWeightKg).includes(val)) return false;
        if (key === 'lengthMm' && !String(pt.lengthMm).includes(val)) return false;
        if (key === 'widthMm' && !String(pt.widthMm).includes(val)) return false;
        if (key === 'heightMm' && !String(pt.heightMm).includes(val)) return false;
        if (key === 'maxPayloadKg' && !String(pt.maxPayloadKg).includes(val)) return false;
      }
      return true;
    });
    return sortData(filtered);
  }, [palletTypes, searchQuery, colFilters, sortConfig]);

  const processedStrategies = useMemo(() => {
    const filtered = strategies.filter(st => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCustom = st.customAttributes && Object.values(st.customAttributes).some(
          v => v !== undefined && v !== null && String(v).toLowerCase().includes(q)
        );
        const matchesGlobal = st.strategyCode.toLowerCase().includes(q) ||
               st.name.toLowerCase().includes(q) ||
               (st.itemName || '').toLowerCase().includes(q) ||
               (st.palletTypeCode || '').toLowerCase().includes(q) ||
               matchesCustom;
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'strategyCode' && !st.strategyCode.toLowerCase().includes(val)) return false;
        if (key === 'name' && !st.name.toLowerCase().includes(val)) return false;
        if (key === 'palletTypeCode' && !(st.palletTypeCode || '').toLowerCase().includes(val)) return false;
        if (key === 'fullLayerQty' && !String(st.fullLayerQty).includes(val)) return false;
        if (key === 'maxLayers' && !String(st.maxLayers).includes(val)) return false;
        if (key === 'standardPackageCount' && !String(st.standardPackageCount).includes(val)) return false;
        if (key === 'standardTotalQuantity' && !String(st.standardTotalQuantity).includes(val)) return false;
        if (key === 'expectedTotalWeightKg' && !String(st.expectedTotalWeightKg).includes(val)) return false;
        if (key === 'expectedHeightMm' && !String(st.expectedHeightMm).includes(val)) return false;

        // Dynamic custom attribute filter
        if (strategyCustomAttrs.some(a => a.code === key)) {
          const attrVal = st.customAttributes?.[key];
          if (attrVal === undefined || attrVal === null || !String(attrVal).toLowerCase().includes(val)) {
            return false;
          }
        }
      }
      return true;
    });
    return sortData(filtered);
  }, [strategies, searchQuery, colFilters, sortConfig, strategyCustomAttrs]);

  const processedCustomAttrs = useMemo(() => {
    const filtered = customAttrs.filter(a => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = a.attributeCode.toLowerCase().includes(q) || 
                              a.label.toLowerCase().includes(q) ||
                              a.dataType.toLowerCase().includes(q) ||
                              (a.unitOfMeasure || '').toLowerCase().includes(q);
        if (!matchesGlobal) return false;
      }
      if (attrEntityFilter !== 'ALL' && a.targetEntity !== attrEntityFilter) return false;

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'targetEntity' && a.targetEntity.toLowerCase() !== val && !a.targetEntity.toLowerCase().includes(val)) return false;
        if (key === 'attributeCode' && !a.attributeCode.toLowerCase().includes(val)) return false;
        if (key === 'label' && !a.label.toLowerCase().includes(val)) return false;
        if (key === 'dataType' && a.dataType.toLowerCase() !== val && !a.dataType.toLowerCase().includes(val)) return false;
        if (key === 'unitOfMeasure' && !(a.unitOfMeasure || '').toLowerCase().includes(val)) return false;
        if (key === 'options') {
          const opts = (a.allowedOptions ? a.allowedOptions.join(' ') : (a.description || '')).toLowerCase();
          if (!opts.includes(val)) return false;
        }
        if (key === 'isRequired') {
          const reqStr = a.isRequired ? 'yes' : 'optional';
          if (reqStr !== val && !reqStr.includes(val)) return false;
        }
      }
      return true;
    });
    return sortData(filtered);
  }, [customAttrs, searchQuery, attrEntityFilter, colFilters, sortConfig]);

  // Current active list & pagination calculations
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'materials': return processedItems;
      case 'skus': return processedSkus;
      case 'pallet_types': return processedPalletTypes;
      case 'strategies': return processedStrategies;
      case 'custom_fields': return processedCustomAttrs;
    }
  }, [activeTab, processedItems, processedSkus, processedPalletTypes, processedStrategies, processedCustomAttrs]);

  const totalRecords = activeDataset.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedRecords = activeDataset.slice(startIndex, endIndex);
  const recordsLeftToView = Math.max(0, totalRecords - endIndex);

  // Column filter header cell component (strictly search input, no dropdowns)
  const ColumnFilterCell = ({
    colKey,
    placeholder = 'Search...'
  }: {
    colKey: string;
    placeholder?: string;
  }) => {
    const val = colFilters[colKey] || '';
    return (
      <th style={{
        padding: '3px 6px',
        backgroundColor: 'var(--bg-surface-subtle)',
        borderBottom: '1px solid var(--border-default)',
        fontWeight: 'normal'
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
                padding: 0,
                cursor: 'pointer',
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

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '70vh',
        gap: '10px',
        color: 'var(--text-secondary)'
      }}>
        <Loader2 size={20} color="var(--color-primary-500)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Loading Master Data & Pallet Blueprint Grid...</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '8px 16px 4px 16px',
      width: '100%',
      height: '100%',
      maxHeight: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* 1. Header Banner with Overview Statistics (Compact 100% Zoom) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        flexWrap: 'wrap',
        gap: '8px',
        flexShrink: 0
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--color-primary-500)',
              fontSize: '10.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <Warehouse size={11} />
              WES Core Platform
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>•</span>
            <h1 style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              Configuration &amp; Master Data
            </h1>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Configurable Material Catalog, Packaging SKUs, Pallet Recipes &amp; Dynamic Custom Fields
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'materials' && (
            <button
              onClick={() => setIsAddItemModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary-600)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              New Material
            </button>
          )}

          {activeTab === 'skus' && (
            <button
              onClick={() => setIsAddSkuModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary-600)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              New Packaging SKU
            </button>
          )}

          {activeTab === 'pallet_types' && (
            <button
              onClick={() => setIsAddPalletTypeModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary-600)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              New Pallet Type
            </button>
          )}

          {activeTab === 'strategies' && (
            <button
              onClick={handleOpenAddStrategyModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary-600)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              New Handling Strategy
            </button>
          )}

          {activeTab === 'custom_fields' && (
            <button
              onClick={() => setIsAddAttrModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary-600)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              New Custom Field
            </button>
          )}
        </div>
      </div>

      {/* 2. Compact Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '6px',
        marginBottom: '6px',
        flexShrink: 0
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>Materials &amp; Items</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{items.length}</div>
          </div>
          <Boxes size={16} color="var(--color-primary-500)" />
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>Packaging SKUs</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{skus.length}</div>
          </div>
          <Package size={16} color="#10B981" />
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>Pallet Types</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{palletTypes.length}</div>
          </div>
          <Box size={16} color="#06B6D4" />
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>Pallet Handling Strategy</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{strategies.length}</div>
          </div>
          <Layers size={16} color="#8B5CF6" />
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>Custom Fields</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{customAttrs.length}</div>
          </div>
          <Settings2 size={16} color="#F59E0B" />
        </div>
      </div>

      {/* 3. Navigation Tabs (High-Density) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        marginBottom: '6px',
        gap: '4px',
        flexShrink: 0
      }}>
        {[
          { key: 'materials', label: '1. Materials & Items', icon: Boxes, count: items.length },
          { key: 'skus', label: '2. Packaging & SKUs', icon: Package, count: skus.length },
          { key: 'pallet_types', label: '3. Pallet Types', icon: Box, count: palletTypes.length },
          { key: 'strategies', label: '4. Pallet handling strategy', icon: Layers, count: strategies.length },
          { key: 'custom_fields', label: '5. Dynamic Custom Fields', icon: Settings2, count: customAttrs.length }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as TabKey)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--color-primary-500)' : '2px solid transparent',
              color: activeTab === t.key ? 'var(--color-primary-500)' : 'var(--text-secondary)',
              fontWeight: activeTab === t.key ? 600 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.1s ease'
            }}
          >
            <t.icon size={13} />
            {t.label}
            <span style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '8px',
              backgroundColor: activeTab === t.key ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-surface-subtle)',
              color: activeTab === t.key ? 'var(--color-primary-500)' : 'var(--text-disabled)'
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Controls Bar: Search, Category Filters, Records Per Page */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        gap: '8px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '5px 10px',
            width: '260px'
          }}>
            <Search size={13} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={12} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {activeTab === 'custom_fields' && (
            <select
              value={attrEntityFilter}
              onChange={e => setAttrEntityFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '5px 8px',
                color: 'var(--text-primary)',
                fontSize: '11.5px',
                outline: 'none'
              }}
            >
              <option value="ALL">All Entity Scopes</option>
              <option value="ITEM">Item Level</option>
              <option value="SKU">SKU Level</option>
              <option value="HANDLING_STRATEGY">Handling Strategy Level</option>
              <option value="PALLET">Pallet Dynamic Properties</option>
            </select>
          )}

          {/* Toggle Column Search Filters Row */}
          <button
            onClick={() => setShowColFilters(!showColFilters)}
            title="Toggle column-level search inputs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: showColFilters ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
              backgroundColor: showColFilters ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface)',
              color: showColFilters ? 'var(--color-primary-500)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Filter size={12} />
            <span>Col Search</span>
            {activeColFilterCount > 0 && (
              <span style={{
                backgroundColor: 'var(--color-primary-500)',
                color: '#fff',
                borderRadius: '8px',
                padding: '0 5px',
                fontSize: '9.5px',
                fontWeight: 700
              }}>
                {activeColFilterCount}
              </span>
            )}
          </button>

          {/* Reset All Filters Button */}
          {(activeColFilterCount > 0 || searchQuery || (activeTab === 'custom_fields' && attrEntityFilter !== 'ALL')) && (
            <button
              onClick={handleClearAllFilters}
              title="Clear all active global and column filters"
              style={{
                display: 'inline-flex',
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
              <span>Clear Filters ({activeColFilterCount + (searchQuery ? 1 : 0)})</span>
            </button>
          )}
        </div>

        {/* Page Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span>Rows per page:</span>
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
              padding: '3px 6px',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
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

      {/* 5. TABLE CONTAINER (Compact, High Density, Columnar Custom Fields, Header Sort) */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        boxShadow: 'var(--shadow-sm)'
      }}>
        
        {/* TAB 1: Materials & Items */}
        {activeTab === 'materials' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th onClick={() => handleSort('itemCode')} style={{ padding: '7px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Material Code {getSortIcon('itemCode')}
                  </div>
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Description {getSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('baseUom')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Base UoM {getSortIcon('baseUom')}
                  </div>
                </th>
                <th onClick={() => handleSort('mixedPalletGroup')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Mixing Group {getSortIcon('mixedPalletGroup')}
                  </div>
                </th>
                {/* DYNAMIC CUSTOM PROPERTY COLUMNS */}
                {itemCustomAttrs.map(attr => (
                  <th
                    key={attr.code}
                    onClick={() => handleSort(attr.code)}
                    style={{ padding: '7px 10px', cursor: 'pointer', color: 'var(--color-primary-500)', whiteSpace: 'nowrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {attr.label} {getSortIcon(attr.code)}
                    </div>
                  </th>
                ))}
                <th style={{ padding: '7px 10px' }}>Status</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  <ColumnFilterCell colKey="itemCode" placeholder="Search Code..." />
                  <ColumnFilterCell colKey="name" placeholder="Search Description..." />
                  <ColumnFilterCell colKey="baseUom" placeholder="Search UoM..." />
                  <ColumnFilterCell colKey="mixedPalletGroup" placeholder="Search Group..." />
                  {itemCustomAttrs.map(attr => (
                    <ColumnFilterCell key={attr.code} colKey={attr.code} placeholder={`Search ${attr.label}...`} />
                  ))}
                  <ColumnFilterCell colKey="status" placeholder="Search Status..." />
                  <th style={{ padding: '4px 6px' }} />
                </tr>
              )}
            </thead>
            <tbody>
              {(pagedRecords as ItemMaster[]).map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--color-primary-500)', fontFamily: 'monospace' }}>
                    {item.itemCode}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {item.baseUom}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{
                      fontSize: '11px',
                      color: item.allowMixedPallet ? '#10B981' : '#F59E0B',
                      fontWeight: 500
                    }}>
                      {item.mixedPalletGroup || (item.allowMixedPallet ? 'General' : 'Pure Only')}
                    </span>
                  </td>
                  {/* DYNAMIC CUSTOM PROPERTY CELLS */}
                  {itemCustomAttrs.map(attr => {
                    const val = item.customAttributes?.[attr.code];
                    const isPresent = val !== undefined && val !== null && val !== '';
                    return (
                      <td key={attr.code} style={{ padding: '6px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {isPresent ? (
                          typeof val === 'boolean' ? (
                            val ? (
                              <span style={{ color: '#10B981', fontWeight: 600, fontSize: '10.5px' }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>No</span>
                            )
                          ) : Array.isArray(val) ? (
                            <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-subtle)', fontSize: '10.5px' }}>
                              {val.join(', ')}
                            </span>
                          ) : (
                            <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-subtle)', fontSize: '10.5px' }}>
                              {String(val)}{attr.uom ? ` ${attr.uom}` : ''}
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: item.status === 'ACTIVE' ? '#10B981' : '#EF4444', fontSize: '11px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.status === 'ACTIVE' ? '#10B981' : '#EF4444' }} />
                      {item.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <button
                        onClick={() => openEditItem(item)}
                        title="Edit Material"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--color-primary-500)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        <Edit2 size={11} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        title="Delete Material"
                        style={{
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* TAB 2: Packaging & SKUs */}
        {activeTab === 'skus' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th onClick={() => handleSort('skuCode')} style={{ padding: '7px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    SKU Code {getSortIcon('skuCode')}
                  </div>
                </th>
                <th onClick={() => handleSort('itemName')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Parent Material {getSortIcon('itemName')}
                  </div>
                </th>
                <th onClick={() => handleSort('packageType')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    SKU Type {getSortIcon('packageType')}
                  </div>
                </th>
                <th onClick={() => handleSort('unitsPerPackage')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Best Fit (Ratio) {getSortIcon('unitsPerPackage')}
                  </div>
                </th>
                <th onClick={() => handleSort('barcode')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    GTIN Barcode {getSortIcon('barcode')}
                  </div>
                </th>
                {/* DYNAMIC SKU CUSTOM PROPERTY COLUMNS */}
                {skuCustomAttrs.map(attr => (
                  <th
                    key={attr.code}
                    onClick={() => handleSort(attr.code)}
                    style={{ padding: '7px 10px', cursor: 'pointer', color: 'var(--color-primary-500)', whiteSpace: 'nowrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {attr.label} {getSortIcon(attr.code)}
                    </div>
                  </th>
                ))}
                <th style={{ padding: '7px 10px' }}>Status</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  <ColumnFilterCell colKey="skuCode" placeholder="Search SKU..." />
                  <ColumnFilterCell colKey="itemName" placeholder="Search Material..." />
                  <ColumnFilterCell colKey="packageType" placeholder="Search Type..." />
                  <ColumnFilterCell colKey="unitsPerPackage" placeholder="Search Units..." />
                  <ColumnFilterCell colKey="barcode" placeholder="Search Barcode..." />
                  {skuCustomAttrs.map(attr => (
                    <ColumnFilterCell key={attr.code} colKey={attr.code} placeholder={`Search ${attr.label}...`} />
                  ))}
                  <ColumnFilterCell colKey="status" placeholder="Search Status..." />
                  <th style={{ padding: '4px 6px' }} />
                </tr>
              )}
            </thead>
            <tbody>
              {(pagedRecords as SkuMaster[]).map(sku => (
                <tr key={sku.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--color-primary-500)', fontFamily: 'monospace' }}>
                    {sku.skuCode}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-primary)', fontWeight: 500, maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sku.itemName}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      color: '#8B5CF6'
                    }}>
                      {sku.packageType}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sku.unitsPerPackage} Units
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {sku.barcode || '-'}
                  </td>
                  {/* DYNAMIC SKU CUSTOM PROPERTY CELLS */}
                  {skuCustomAttrs.map(attr => {
                    const val = sku.customAttributes?.[attr.code];
                    const isPresent = val !== undefined && val !== null && val !== '';
                    return (
                      <td key={attr.code} style={{ padding: '6px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {isPresent ? (
                          typeof val === 'boolean' ? (
                            val ? (
                              <span style={{ color: '#EF4444', fontWeight: 600, fontSize: '10.5px' }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>No</span>
                            )
                          ) : Array.isArray(val) ? (
                            <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-subtle)', fontSize: '10.5px' }}>
                              {val.join(', ')}
                            </span>
                          ) : (
                            <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-subtle)', fontSize: '10.5px' }}>
                              {String(val)}{attr.uom ? ` ${attr.uom}` : ''}
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ color: sku.isActive ? '#10B981' : '#EF4444', fontSize: '11px' }}>
                      {sku.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <button
                        onClick={() => openEditSku(sku)}
                        title="Edit SKU"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: '#8B5CF6',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        <Edit2 size={11} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSku(sku)}
                        title="Delete SKU"
                        style={{
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* TAB 3: Pallet Types (wes.pallet_type_master) */}
        {activeTab === 'pallet_types' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th onClick={() => handleSort('code')} style={{ padding: '7px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Pallet Code {getSortIcon('code')}
                  </div>
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Carrier Name {getSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('material')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Material {getSortIcon('material')}
                  </div>
                </th>
                <th onClick={() => handleSort('tareWeightKg')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Tare Weight {getSortIcon('tareWeightKg')}
                  </div>
                </th>
                <th onClick={() => handleSort('lengthMm')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Length (L) {getSortIcon('lengthMm')}
                  </div>
                </th>
                <th onClick={() => handleSort('widthMm')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Width (W) {getSortIcon('widthMm')}
                  </div>
                </th>
                <th onClick={() => handleSort('heightMm')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Height (H) {getSortIcon('heightMm')}
                  </div>
                </th>
                <th onClick={() => handleSort('maxPayloadKg')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Max Payload {getSortIcon('maxPayloadKg')}
                  </div>
                </th>
                <th style={{ padding: '7px 10px', textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  <ColumnFilterCell colKey="code" placeholder="Search Code..." />
                  <ColumnFilterCell colKey="name" placeholder="Search Name..." />
                  <ColumnFilterCell colKey="material" placeholder="Search Material..." />
                  <ColumnFilterCell colKey="tareWeightKg" placeholder="Search Tare..." />
                  <ColumnFilterCell colKey="lengthMm" placeholder="Search Length..." />
                  <ColumnFilterCell colKey="widthMm" placeholder="Search Width..." />
                  <ColumnFilterCell colKey="heightMm" placeholder="Search Height..." />
                  <ColumnFilterCell colKey="maxPayloadKg" placeholder="Search Payload..." />
                  <th style={{ padding: '4px 6px' }} />
                </tr>
              )}
            </thead>
            <tbody>
              {(pagedRecords as PalletType[]).map(pt => {
                const mat = (pt.material || 'WOOD').toUpperCase();
                const matBg = mat === 'WOOD' ? 'rgba(217, 119, 6, 0.12)' :
                              mat === 'PLASTIC' ? 'rgba(6, 182, 212, 0.12)' :
                              mat === 'METAL' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(139, 92, 246, 0.12)';
                const matColor = mat === 'WOOD' ? '#D97706' :
                                mat === 'PLASTIC' ? '#0891B2' :
                                mat === 'METAL' ? '#475569' : '#8B5CF6';

                return (
                  <tr key={pt.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--color-primary-500)', fontFamily: 'monospace' }}>
                      {pt.code}
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {pt.name}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: matBg,
                        color: matColor
                      }}>
                        {mat}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {pt.tareWeightKg} kg
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                      {pt.lengthMm} mm
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                      {pt.widthMm} mm
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                      {pt.heightMm} mm
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: '#10B981' }}>
                      {pt.maxPayloadKg} kg
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <button
                          onClick={() => openEditPalletType(pt)}
                          title="Edit Pallet Type"
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--color-primary-500)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          <Edit2 size={11} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePalletType(pt)}
                          title="Delete Pallet Type"
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* TAB 4: Pallet Strategies (TI / HI) */}
        {activeTab === 'strategies' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th onClick={() => handleSort('strategyCode')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Strategy Code {getSortIcon('strategyCode')}
                  </div>
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Strategy Name {getSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('palletTypeCode')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Pallet Type {getSortIcon('palletTypeCode')}
                  </div>
                </th>
                <th onClick={() => handleSort('fullLayerQty')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Full Layer Qty (TI) {getSortIcon('fullLayerQty')}
                  </div>
                </th>
                <th onClick={() => handleSort('maxLayers')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Max Layers (HI) {getSortIcon('maxLayers')}
                  </div>
                </th>
                <th onClick={() => handleSort('standardPackageCount')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Std Pkgs {getSortIcon('standardPackageCount')}
                  </div>
                </th>
                <th onClick={() => handleSort('standardTotalQuantity')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Total Units {getSortIcon('standardTotalQuantity')}
                  </div>
                </th>
                <th onClick={() => handleSort('expectedTotalWeightKg')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Full Pallet Wt {getSortIcon('expectedTotalWeightKg')}
                  </div>
                </th>
                <th onClick={() => handleSort('expectedHeightMm')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Height {getSortIcon('expectedHeightMm')}
                  </div>
                </th>
                {/* DYNAMIC STRATEGY CUSTOM PROPERTY COLUMNS */}
                {strategyCustomAttrs.map(attr => (
                  <th
                    key={attr.code}
                    onClick={() => handleSort(attr.code)}
                    style={{ padding: '7px 10px', cursor: 'pointer', color: 'var(--color-primary-500)', whiteSpace: 'nowrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {attr.label} {getSortIcon(attr.code)}
                    </div>
                  </th>
                ))}
              </tr>
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  <ColumnFilterCell colKey="strategyCode" placeholder="Search Strategy Code..." />
                  <ColumnFilterCell colKey="name" placeholder="Search Name..." />
                  <ColumnFilterCell colKey="palletTypeCode" placeholder="Search Pallet Type..." />
                  <ColumnFilterCell colKey="fullLayerQty" placeholder="Search TI..." />
                  <ColumnFilterCell colKey="maxLayers" placeholder="Search HI..." />
                  <ColumnFilterCell colKey="standardPackageCount" placeholder="Search Pkgs..." />
                  <ColumnFilterCell colKey="standardTotalQuantity" placeholder="Search Units..." />
                  <ColumnFilterCell colKey="expectedTotalWeightKg" placeholder="Search Wt..." />
                  <ColumnFilterCell colKey="expectedHeightMm" placeholder="Search Height..." />
                  {strategyCustomAttrs.map(attr => (
                    <ColumnFilterCell key={attr.code} colKey={attr.code} placeholder={`Search ${attr.label}...`} />
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {(pagedRecords as PalletHandlingStrategy[]).map(st => (
                <tr key={st.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--color-primary-500)', fontFamily: 'monospace' }}>
                    {st.strategyCode}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {st.name}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ fontSize: '10.5px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', fontWeight: 600 }}>
                      {st.palletTypeCode}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                    {st.fullLayerQty} pkgs/layer
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                    {st.maxLayers} layers
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {st.standardPackageCount} pkgs
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#10B981' }}>
                    {st.standardTotalQuantity}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                    {st.expectedTotalWeightKg} kg
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                    {st.expectedHeightMm} mm
                  </td>
                  {/* DYNAMIC STRATEGY CUSTOM PROPERTY CELLS */}
                  {strategyCustomAttrs.map(attr => {
                    const val = st.customAttributes?.[attr.code];
                    const isPresent = val !== undefined && val !== null && val !== '';
                    return (
                      <td key={attr.code} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        {isPresent ? (
                          typeof val === 'boolean' ? (
                            val ? (
                              <span style={{ color: '#10B981', fontWeight: 600, fontSize: '10.5px' }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>No</span>
                            )
                          ) : Array.isArray(val) ? (
                            <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-subtle)', fontSize: '10.5px' }}>
                              {val.join(', ')}
                            </span>
                          ) : (
                            <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-subtle)', fontSize: '10.5px' }}>
                              {String(val)}{attr.uom ? ` ${attr.uom}` : ''}
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* TAB 4: Custom Fields Registry */}
        {activeTab === 'custom_fields' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
              <tr style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th onClick={() => handleSort('targetEntity')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Target Scope Level {getSortIcon('targetEntity')}
                  </div>
                </th>
                <th onClick={() => handleSort('attributeCode')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Attribute Code {getSortIcon('attributeCode')}
                  </div>
                </th>
                <th onClick={() => handleSort('label')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Display Label {getSortIcon('label')}
                  </div>
                </th>
                <th onClick={() => handleSort('dataType')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Data Type {getSortIcon('dataType')}
                  </div>
                </th>
                <th onClick={() => handleSort('unitOfMeasure')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Unit {getSortIcon('unitOfMeasure')}
                  </div>
                </th>
                <th style={{ padding: '7px 10px' }}>Allowed Options / Description</th>
                <th onClick={() => handleSort('isRequired')} style={{ padding: '7px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Required {getSortIcon('isRequired')}
                  </div>
                </th>
              </tr>
              {showColFilters && (
                <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  <ColumnFilterCell colKey="targetEntity" placeholder="Search Scope..." />
                  <ColumnFilterCell colKey="attributeCode" placeholder="Search Code..." />
                  <ColumnFilterCell colKey="label" placeholder="Search Label..." />
                  <ColumnFilterCell colKey="dataType" placeholder="Search Type..." />
                  <ColumnFilterCell colKey="unitOfMeasure" placeholder="Search Unit..." />
                  <ColumnFilterCell colKey="options" placeholder="Search Options..." />
                  <ColumnFilterCell colKey="isRequired" placeholder="Search Required..." />
                </tr>
              )}
            </thead>
            <tbody>
              {(pagedRecords as CustomAttributeDef[]).map(attr => (
                <tr key={attr.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: attr.targetEntity === 'ITEM' ? 'rgba(59, 130, 246, 0.12)' : 
                                       attr.targetEntity === 'SKU' ? 'rgba(16, 185, 129, 0.12)' : 
                                       attr.targetEntity === 'PALLET' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                      color: attr.targetEntity === 'ITEM' ? '#3B82F6' : 
                             attr.targetEntity === 'SKU' ? '#10B981' : 
                             attr.targetEntity === 'PALLET' ? '#F59E0B' : '#8B5CF6'
                    }}>
                      {attr.targetEntity}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-500)' }}>
                    {attr.attributeCode}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {attr.label}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                    {attr.dataType}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                    {attr.unitOfMeasure || '-'}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                    {attr.allowedOptions ? attr.allowedOptions.join(', ') : (attr.description || '-')}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {attr.isRequired ? (
                      <span style={{ color: '#EF4444', fontWeight: 600, fontSize: '10.5px' }}>Yes</span>
                    ) : (
                      <span style={{ color: 'var(--text-disabled)', fontSize: '10.5px' }}>Optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}


      </div>

      {/* 6. ENTERPRISE PAGINATION CONTROLS BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 4px 2px 4px',
        fontSize: '11.5px',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        gap: '10px',
        flexShrink: 0,
        borderTop: '1px solid var(--border-default)',
        marginTop: '4px'
      }}>
        {/* Record count info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalRecords === 0 ? 0 : startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{endIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalRecords}</strong> records
          </span>
          <span style={{ color: 'var(--text-disabled)' }}>•</span>
          <span>
            Page <strong style={{ color: 'var(--text-primary)' }}>{safeCurrentPage}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
          </span>
          {recordsLeftToView > 0 && (
            <span style={{
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--color-primary-500)',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '10.5px'
            }}>
              {recordsLeftToView} remaining to view
            </span>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            title="First Page"
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsLeft size={13} />
          </button>

          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            title="Previous Page"
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </button>

          {/* Page Number Pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span style={{ padding: '0 2px', color: 'var(--text-disabled)' }}>...</span>
                )}
                <button
                  onClick={() => setCurrentPage(p)}
                  style={{
                    minWidth: '26px',
                    height: '24px',
                    padding: '0 6px',
                    borderRadius: '5px',
                    border: '1px solid',
                    borderColor: safeCurrentPage === p ? 'var(--color-primary-600)' : 'var(--border-default)',
                    backgroundColor: safeCurrentPage === p ? 'var(--color-primary-600)' : 'var(--bg-surface)',
                    color: safeCurrentPage === p ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: safeCurrentPage === p ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            title="Next Page"
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
            title="Last Page"
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT MATERIAL / ITEM                                               */}
      {/* ========================================================================= */}
      {isEditItemModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="var(--color-primary-500)" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Material: <span style={{ fontFamily: 'monospace' }}>{editItemCode}</span>
                </h2>
              </div>
              <button
                onClick={() => setIsEditItemModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemCode}
                    onChange={e => setEditItemCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Description / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemName}
                    onChange={e => setEditItemName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Item Type
                    </label>
                    <select
                      value={editItemType}
                      onChange={e => setEditItemType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="FINISHED_GOOD">Finished Good</option>
                      <option value="SEMI_FINISHED">Semi-Finished</option>
                      <option value="SPARE_PART">Spare Part</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Base Unit of Measure
                    </label>
                    <select
                      value={editBaseUom}
                      onChange={e => setEditBaseUom(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="KG">KG (Kilograms)</option>
                      <option value="LITER">LITER (Liters)</option>
                      <option value="EA">EA (Each / Pieces)</option>
                      <option value="METER">METER (Meters)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Status
                    </label>
                    <select
                      value={editItemStatus}
                      onChange={e => setEditItemStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Mixing Group
                    </label>
                    <input
                      type="text"
                      value={editMixedGroup}
                      onChange={e => setEditMixedGroup(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={editAllowMixed}
                    onChange={e => setEditAllowMixed(e.target.checked)}
                    id="editAllowMixedCheck"
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="editAllowMixedCheck" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Allow Mixed Pallet Stacking
                  </label>
                </div>

                {/* Level 1 Custom Fields */}
                {customAttrs.filter(a => a.targetEntity === 'ITEM').length > 0 && (
                  <div style={{ borderTop: '1px dashed var(--border-default)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary-500)', marginBottom: '8px' }}>
                      Custom Properties
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {customAttrs.filter(a => a.targetEntity === 'ITEM').map(attr => (
                        <div key={attr.id}>
                          <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                            {attr.label}
                          </label>
                          {attr.dataType === 'SELECT_ONE' && attr.allowedOptions ? (
                            <select
                              value={editItemDynAttrs[attr.attributeCode] || ''}
                              onChange={e => setEditItemDynAttrs({ ...editItemDynAttrs, [attr.attributeCode]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              <option value="">Select...</option>
                              {attr.allowedOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : attr.dataType === 'NUMBER' ? (
                            <input
                              type="number"
                              placeholder={attr.unitOfMeasure || ''}
                              value={editItemDynAttrs[attr.attributeCode] || ''}
                              onChange={e => setEditItemDynAttrs({ ...editItemDynAttrs, [attr.attributeCode]: Number(e.target.value) })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={editItemDynAttrs[attr.attributeCode] || ''}
                              onChange={e => setEditItemDynAttrs({ ...editItemDynAttrs, [attr.attributeCode]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditItemModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--color-primary-600)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SKU MASTER                                                    */}
      {/* ========================================================================= */}
      {isEditSkuModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="#8B5CF6" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Edit SKU: <span style={{ fontFamily: 'monospace' }}>{editSkuCode}</span>
                </h2>
              </div>
              <button
                onClick={() => setIsEditSkuModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateSku} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Parent Material / Item *
                  </label>
                  <select
                    value={editSkuItemId}
                    onChange={e => setEditSkuItemId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.itemCode} - {item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSkuCode}
                    onChange={e => setEditSkuCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      SKU Type
                    </label>
                    <select
                      value={editPackageType}
                      onChange={e => setEditPackageType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="BAG">Bag (Sack)</option>
                      <option value="CAN">Can / Jerrycan</option>
                      <option value="CARTON">Carton / Box</option>
                      <option value="DRUM">Industrial Drum</option>
                      <option value="LOOSE">Loose Piece</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Best Fit Ratio (Units / Pkg)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editUnitsPerPack}
                      onChange={e => setEditUnitsPerPack(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      GTIN Barcode
                    </label>
                    <input
                      type="text"
                      value={editBarcode}
                      onChange={e => setEditBarcode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Status
                    </label>
                    <select
                      value={editSkuIsActive ? 'ACTIVE' : 'INACTIVE'}
                      onChange={e => setEditSkuIsActive(e.target.value === 'ACTIVE')}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Level 2 Custom Fields */}
                {customAttrs.filter(a => a.targetEntity === 'SKU').length > 0 && (
                  <div style={{ borderTop: '1px dashed var(--border-default)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '8px' }}>
                      Packaging Custom Properties
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {customAttrs.filter(a => a.targetEntity === 'SKU').map(attr => (
                        <div key={attr.id}>
                          <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                            {attr.label}
                          </label>
                          {attr.dataType === 'SELECT_ONE' && attr.allowedOptions ? (
                            <select
                              value={editSkuDynAttrs[attr.attributeCode] || ''}
                              onChange={e => setEditSkuDynAttrs({ ...editSkuDynAttrs, [attr.attributeCode]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              <option value="">Select...</option>
                              {attr.allowedOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : attr.dataType === 'NUMBER' ? (
                            <input
                              type="number"
                              placeholder={attr.unitOfMeasure || ''}
                              value={editSkuDynAttrs[attr.attributeCode] || ''}
                              onChange={e => setEditSkuDynAttrs({ ...editSkuDynAttrs, [attr.attributeCode]: Number(e.target.value) })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={editSkuDynAttrs[attr.attributeCode] || ''}
                              onChange={e => setEditSkuDynAttrs({ ...editSkuDynAttrs, [attr.attributeCode]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditSkuModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PALLET TYPE (wes.pallet_type_master)                          */}
      {/* ========================================================================= */}
      {isEditPalletTypeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="var(--color-primary-500)" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Pallet Type: <span style={{ fontFamily: 'monospace' }}>{editPtCode}</span>
                </h2>
              </div>
              <button
                onClick={() => setIsEditPalletTypeModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdatePalletType} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Pallet Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={editPtCode}
                      onChange={e => setEditPtCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Base Material *
                    </label>
                    <select
                      value={editPtMaterial}
                      onChange={e => setEditPtMaterial(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="WOOD">WOOD (Timber EPAL/GMA)</option>
                      <option value="PLASTIC">PLASTIC (Cleanroom/Washable)</option>
                      <option value="METAL">METAL (Steel/Aluminum High-Load)</option>
                      <option value="COMPOSITE">COMPOSITE (Fiber/Hybrid)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Carrier Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPtName}
                    onChange={e => setEditPtName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Tare Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editPtTareWeight}
                      onChange={e => setEditPtTareWeight(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Max Payload (kg) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={editPtMaxPayload}
                      onChange={e => setEditPtMaxPayload(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Length (mm) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={editPtLength}
                      onChange={e => setEditPtLength(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Width (mm) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={editPtWidth}
                      onChange={e => setEditPtWidth(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Height (mm) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={editPtHeight}
                      onChange={e => setEditPtHeight(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-default)'
              }}>
                <button
                  type="button"
                  onClick={() => setIsEditPalletTypeModalOpen(false)}
                  style={{
                    padding: '6px 12px',
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
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--color-primary-600)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW MATERIAL / ITEM                                         */}
      {/* ========================================================================= */}
      {isAddItemModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={16} color="var(--color-primary-500)" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  New Material / Item Master
                </h2>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateItem} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAT-GLUCOSE-SYRUP"
                    value={newItemCode}
                    onChange={e => setNewItemCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Description / Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liquid Glucose Syrup Food Grade 84°Bx"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Item Type
                    </label>
                    <select
                      value={newItemType}
                      onChange={e => setNewItemType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="FINISHED_GOOD">Finished Good</option>
                      <option value="SEMI_FINISHED">Semi-Finished</option>
                      <option value="SPARE_PART">Spare Part</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Base Unit of Measure
                    </label>
                    <select
                      value={newBaseUom}
                      onChange={e => setNewBaseUom(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="KG">KG (Kilograms)</option>
                      <option value="LITER">LITER (Liters)</option>
                      <option value="EA">EA (Each / Pieces)</option>
                      <option value="METER">METER (Meters)</option>
                    </select>
                  </div>
                </div>

                {/* Mixing rule */}
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Allow Pallet Mixing</span>
                    <input
                      type="checkbox"
                      checked={newAllowMixed}
                      onChange={e => setNewAllowMixed(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  {newAllowMixed && (
                    <input
                      type="text"
                      placeholder="Mixing Group (e.g. FOOD_INGREDIENTS, GENERAL)"
                      value={newMixedGroup}
                      onChange={e => setNewMixedGroup(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>

                {/* Level 1 Custom Fields */}
                <div style={{ borderTop: '1px dashed var(--border-default)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary-500)', marginBottom: '8px' }}>
                    Custom Properties (Rendered as Columns)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {customAttrs.filter(a => a.targetEntity === 'ITEM').map(attr => (
                      <div key={attr.id}>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                          {attr.label}
                        </label>
                        {attr.dataType === 'SELECT_ONE' && attr.allowedOptions ? (
                          <select
                            value={newItemDynAttrs[attr.attributeCode] || ''}
                            onChange={e => setNewItemDynAttrs({ ...newItemDynAttrs, [attr.attributeCode]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '11.5px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="">Select...</option>
                            {attr.allowedOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : attr.dataType === 'NUMBER' ? (
                          <input
                            type="number"
                            placeholder={attr.unitOfMeasure || ''}
                            value={newItemDynAttrs[attr.attributeCode] || ''}
                            onChange={e => setNewItemDynAttrs({ ...newItemDynAttrs, [attr.attributeCode]: Number(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '11.5px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={newItemDynAttrs[attr.attributeCode] || ''}
                            onChange={e => setNewItemDynAttrs({ ...newItemDynAttrs, [attr.attributeCode]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '11.5px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--color-primary-600)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW PACKAGING SKU                                           */}
      {/* ========================================================================= */}
      {isAddSkuModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} color="#8B5CF6" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  New Packaging SKU
                </h2>
              </div>
              <button
                onClick={() => setIsAddSkuModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSku} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Parent Material / Item *
                  </label>
                  <select
                    value={newSkuItemId}
                    onChange={e => setNewSkuItemId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.itemCode} - {item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-RESIN-CAN20L"
                    value={newSkuCode}
                    onChange={e => setNewSkuCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      SKU Type
                    </label>
                    <select
                      value={newPackageType}
                      onChange={e => setNewPackageType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="CAN">Can</option>
                      <option value="BAG">Bag</option>
                      <option value="CARTON">Carton Box</option>
                      <option value="DRUM">Drum</option>
                      <option value="LOOSE">Loose / Direct Piece</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Best Fit (Ratio)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newUnitsPerPack}
                      onChange={e => setNewUnitsPerPack(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      GTIN Barcode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0793573189012"
                      value={newBarcode}
                      onChange={e => setNewBarcode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Dimensions (L x W x H mm)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 600 x 400 x 200"
                      value={newSkuDims}
                      onChange={e => setNewSkuDims(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={newIsFragile}
                    onChange={e => setNewIsFragile(e.target.checked)}
                    id="fragileCheck"
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="fragileCheck" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Fragile Packaging (Limit conveyor acceleration)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddSkuModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW PALLET TYPE (wes.pallet_type_master)                     */}
      {/* ========================================================================= */}
      {isAddPalletTypeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={16} color="var(--color-primary-500)" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  New Pallet Type Master
                </h2>
              </div>
              <button
                onClick={() => setIsAddPalletTypeModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePalletType} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Pallet Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EUR_EPAL1, US_GMA"
                      value={newPtCode}
                      onChange={e => setNewPtCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Base Material *
                    </label>
                    <select
                      value={newPtMaterial}
                      onChange={e => setNewPtMaterial(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="WOOD">WOOD (Timber EPAL/GMA)</option>
                      <option value="PLASTIC">PLASTIC (Cleanroom/Washable)</option>
                      <option value="METAL">METAL (Steel/Aluminum High-Load)</option>
                      <option value="COMPOSITE">COMPOSITE (Fiber/Hybrid)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Carrier Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Euro Pallet EPAL 1, US GMA Standard"
                    value={newPtName}
                    onChange={e => setNewPtName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Tare Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newPtTareWeight}
                      onChange={e => setNewPtTareWeight(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Max Payload (kg) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={newPtMaxPayload}
                      onChange={e => setNewPtMaxPayload(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Length (mm) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={newPtLength}
                      onChange={e => setNewPtLength(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Width (mm) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={newPtWidth}
                      onChange={e => setNewPtWidth(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Height (mm) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={newPtHeight}
                      onChange={e => setNewPtHeight(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-default)'
              }}>
                <button
                  type="button"
                  onClick={() => setIsAddPalletTypeModalOpen(false)}
                  style={{
                    padding: '6px 12px',
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
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--color-primary-600)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Create Pallet Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD NEW PALLET STRATEGY BLUEPRINT                                */}
      {/* ========================================================================= */}
      {isAddStrategyModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#10B981" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  New Pallet Handling Strategy
                </h2>
              </div>
              <button
                onClick={() => setIsAddStrategyModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStrategy} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Select Material *
                    </label>
                    <select
                      value={newStratItemId}
                      onChange={e => setNewStratItemId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {items.length === 0 ? (
                        <option value="">No materials available</option>
                      ) : (
                        items.map(item => (
                          <option key={item.id} value={item.id}>{item.itemCode} - {item.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Select SKU *
                    </label>
                    <select
                      value={newStratSkuId}
                      onChange={e => setNewStratSkuId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {skus.length === 0 ? (
                        <option value="">No SKUs available</option>
                      ) : (
                        skus.map(s => (
                          <option key={s.id} value={s.id}>{s.skuCode} ({s.packageType})</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Strategy Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. STRAT-RESIN-EUR"
                      value={newStratCode}
                      onChange={e => setNewStratCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Strategy Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Resin Standard Euro Pallet"
                      value={newStratName}
                      onChange={e => setNewStratName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Pallet Type *
                  </label>
                  <select
                    value={newStratPalletTypeId}
                    onChange={e => setNewStratPalletTypeId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {palletTypes.length === 0 ? (
                      <option value="">No pallet types available</option>
                    ) : (
                      palletTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name} ({pt.code}) - {pt.material}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Stacking TI / HI */}
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#10B981', marginBottom: '6px' }}>
                    Stacking Geometry (Spreadsheet TI / HI)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                        Full Layer Qty (TI)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newFullLayerQty}
                        onChange={e => setNewFullLayerQty(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                        Max Layers High (HI)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newMaxLayers}
                        onChange={e => setNewMaxLayers(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Standard Package Count: {newFullLayerQty * newMaxLayers} packages per pallet
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                      Full Pallet Wt (kg)
                    </label>
                    <input
                      type="number"
                      value={newExpectedWeight}
                      onChange={e => setNewExpectedWeight(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={newExpectedHeight}
                      onChange={e => setNewExpectedHeight(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-secondary)' }}>
                      Load Bearing
                    </label>
                    <select
                      value={newLoadBearing}
                      onChange={e => setNewLoadBearing(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="DOUBLE_STACKABLE">Double Stackable</option>
                      <option value="NON_STACKABLE">Non-Stackable</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddStrategyModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Handling Strategy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD CUSTOM ATTRIBUTE DEFINITION                                 */}
      {/* ========================================================================= */}
      {isAddAttrModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings2 size={16} color="var(--color-primary-500)" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  New Dynamic Custom Field
                </h2>
              </div>
              <button
                onClick={() => setIsAddAttrModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomAttr} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                    Target Scope Level *
                  </label>
                  <select
                    value={newAttrEntity}
                    onChange={e => setNewAttrEntity(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="ITEM">Item Level (Level 1: Chemistry &amp; Product)</option>
                    <option value="SKU">SKU Level (Level 2: Packaging Container Specs)</option>
                    <option value="HANDLING_STRATEGY">Handling Strategy Level (Level 3: Warehouse Rules)</option>
                    <option value="PALLET">Pallet Dynamic Properties (Live Unit Load)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      JSON Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. flash_point_c"
                      value={newAttrCode}
                      onChange={e => setNewAttrCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Column Header Label *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flash Point (°C)"
                      value={newAttrLabel}
                      onChange={e => setNewAttrLabel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Data Type
                    </label>
                    <select
                      value={newAttrType}
                      onChange={e => setNewAttrType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="STRING">Text (String)</option>
                      <option value="NUMBER">Numeric (Number)</option>
                      <option value="BOOLEAN">Boolean (Yes/No)</option>
                      <option value="SELECT_ONE">Dropdown (Select One)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. °C, kg, mm"
                      value={newAttrUom}
                      onChange={e => setNewAttrUom(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {newAttrType === 'SELECT_ONE' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                      Allowed Options (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GRADE_A, GRADE_B, GRADE_C"
                      value={newAttrOptions}
                      onChange={e => setNewAttrOptions(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddAttrModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--color-primary-600)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Register Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
