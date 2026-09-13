export interface MasterDataOverviewStats {
  totalMaterials: number;
  totalSkus: number;
  totalPalletTypes?: number;
  totalStrategies: number;
  totalCustomFields: number;
  totalPallets: number;
  activeStagedPallets: number;
}

export interface ItemMasterItem {
  id: string;
  itemCode: string;
  name: string;
  itemType: string;
  baseUom: string;
  allowMixedPallet: boolean;
  mixedPalletGroup?: string;
  status: string;
  customAttributes: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateItemMasterPayload {
  itemCode: string;
  name: string;
  itemType?: string;
  baseUom: string;
  allowMixedPallet?: boolean;
  mixedPalletGroup?: string;
  status?: string;
  customAttributes?: Record<string, any>;
}

export interface SkuMasterItem {
  id: string;
  skuCode: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  packageType: string;
  unitsPerPackage: number;
  barcode?: string;
  isActive: boolean;
  customAttributes: Record<string, any>;
  createdAt?: string;
}

export interface CreateSkuMasterPayload {
  skuCode: string;
  itemId: string;
  packageType: string;
  unitsPerPackage: number;
  barcode?: string;
  isActive?: boolean;
  customAttributes?: Record<string, any>;
}

export interface PalletTypeItem {
  id: string;
  code: string;
  name: string;
  material: string;
  tareWeightKg: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  maxPayloadKg: number;
}

export interface CreatePalletTypePayload {
  code: string;
  name: string;
  material?: string;
  tareWeightKg?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  maxPayloadKg?: number;
}

export interface PalletHandlingStrategyItem {
  id: string;
  strategyCode: string;
  name: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  skuId: string;
  skuCode: string;
  packageType: string;
  palletTypeId: string;
  palletTypeCode: string;
  palletTypeName: string;
  fullLayerQty: number;
  maxLayers: number;
  standardPackageCount: number;
  standardTotalQuantity: number;
  expectedTotalWeightKg?: number;
  expectedHeightMm?: number;
  isDefault: boolean;
  customAttributes: Record<string, any>;
}

export interface CreateHandlingStrategyPayload {
  strategyCode: string;
  name: string;
  itemId: string;
  skuId: string;
  palletTypeId: string;
  fullLayerQty: number;
  maxLayers: number;
  expectedTotalWeightKg?: number;
  expectedHeightMm?: number;
  isDefault?: boolean;
  customAttributes?: Record<string, any>;
}

export interface CustomAttributeItem {
  id: string;
  targetEntity: 'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET';
  attributeCode: string;
  label: string;
  description?: string;
  dataType: string;
  unitOfMeasure?: string;
  appliesToCategory: string;
  isRequired: boolean;
  defaultValue?: any;
  allowedOptions?: string[];
  minValue?: number;
  maxValue?: number;
  validationRegex?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateCustomAttributePayload {
  targetEntity: 'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET';
  attributeCode: string;
  label: string;
  description?: string;
  dataType: string;
  unitOfMeasure?: string;
  appliesToCategory?: string;
  isRequired?: boolean;
  defaultValue?: any;
  allowedOptions?: string[];
  minValue?: number;
  maxValue?: number;
  validationRegex?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface PalletInventorySubItem {
  id: string;
  itemId?: string;
  itemCode?: string;
  skuId?: string;
  skuCode?: string;
  itemName: string;
  packageType: string;
  packageCount: number;
  totalQuantity: number;
  baseUom: string;
  lotNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
}

export interface PalletInventoryItem {
  id: string;
  palletLpn: string;
  palletAlias?: string;
  pallet_alias?: string;
  loadType?: 'NO_LOAD' | 'MATERIAL' | 'MATERIAL_WITH_SKU' | 'PALLET_STACK';
  strategyId?: string;
  strategyCode: string;
  strategyName: string;
  palletTypeId: string;
  palletTypeCode: string;
  palletTypeName: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  materialBaseUom?: string;
  status: string;
  currentLocation?: string;
  isMixedPallet: boolean;
  mixedPallet?: boolean;
  actualWeightKg?: number;
  telemetry?: Record<string, any>;
  customAttributes?: Record<string, any>;
  items: PalletInventorySubItem[];
  createdAt?: string;
}

export interface CreateInboundPalletPayload {
  palletLpn?: string;
  palletAlias?: string;
  pallet_alias?: string;
  loadType?: 'NO_LOAD' | 'MATERIAL' | 'MATERIAL_WITH_SKU' | 'PALLET_STACK';
  strategyId?: string;
  palletTypeId?: string;
  itemId?: string;
  skuId?: string;
  materialQuantity?: number;
  status?: string;
  location?: string;
  isMixedPallet?: boolean;
  actualWeightKg?: number;
  packageCount?: number;
  totalQuantity?: number;
  lotNumber?: string;
  expiryDate?: string;
  rfidTag?: string;
  telemetry?: Record<string, any>;
  customAttributes?: Record<string, any>;
}

export interface PalletProcessLogItem {
  id: string;
  palletId: string;
  palletLpn: string;
  processStage: string;
  location?: string;
  status: string;
  propertiesSnapshot: Record<string, any>;
  notes?: string;
  createdAt: string;
}

export interface RecordPalletProcessLogPayload {
  processStage: string;
  location?: string;
  status?: string;
  properties?: Record<string, any>;
  notes?: string;
}

const BASE_URL = '/api/v1/wes';

// Helper for fetch handling
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

// 1. Overview KPI
export async function fetchMasterDataOverviewApi(): Promise<MasterDataOverviewStats> {
  const res = await fetch(`${BASE_URL}/overview`);
  return handleResponse<MasterDataOverviewStats>(res);
}

// 2. Items / Materials
export async function fetchItemsApi(): Promise<ItemMasterItem[]> {
  const res = await fetch(`${BASE_URL}/items`);
  return handleResponse<ItemMasterItem[]>(res);
}

export async function createItemApi(payload: CreateItemMasterPayload): Promise<ItemMasterItem> {
  const res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ItemMasterItem>(res);
}

export async function updateItemApi(id: string, payload: Partial<CreateItemMasterPayload>): Promise<ItemMasterItem> {
  const res = await fetch(`${BASE_URL}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<ItemMasterItem>(res);
}

export async function deleteItemApi(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/items/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(`Failed to delete item: ${res.status}`);
  }
}

// 3. Packaging SKUs
export async function fetchSkusApi(): Promise<SkuMasterItem[]> {
  const res = await fetch(`${BASE_URL}/skus`);
  return handleResponse<SkuMasterItem[]>(res);
}

export async function createSkuApi(payload: CreateSkuMasterPayload): Promise<SkuMasterItem> {
  const res = await fetch(`${BASE_URL}/skus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<SkuMasterItem>(res);
}

export async function updateSkuApi(id: string, payload: Partial<CreateSkuMasterPayload>): Promise<SkuMasterItem> {
  const res = await fetch(`${BASE_URL}/skus/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<SkuMasterItem>(res);
}

export async function deleteSkuApi(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/skus/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(`Failed to delete SKU: ${res.status}`);
  }
}

// 4. Pallet Handling Strategies (TI / HI Blueprints)
export async function fetchStrategiesApi(): Promise<PalletHandlingStrategyItem[]> {
  const res = await fetch(`${BASE_URL}/strategies`);
  return handleResponse<PalletHandlingStrategyItem[]>(res);
}

export async function createStrategyApi(payload: CreateHandlingStrategyPayload): Promise<PalletHandlingStrategyItem> {
  const res = await fetch(`${BASE_URL}/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PalletHandlingStrategyItem>(res);
}

// 5. Pallet Types
export async function fetchPalletTypesApi(): Promise<PalletTypeItem[]> {
  const res = await fetch(`${BASE_URL}/pallet-types`);
  return handleResponse<PalletTypeItem[]>(res);
}

export async function createPalletTypeApi(payload: CreatePalletTypePayload): Promise<PalletTypeItem> {
  const res = await fetch(`${BASE_URL}/pallet-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PalletTypeItem>(res);
}

export async function updatePalletTypeApi(id: string, payload: Partial<CreatePalletTypePayload>): Promise<PalletTypeItem> {
  const res = await fetch(`${BASE_URL}/pallet-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PalletTypeItem>(res);
}

export async function deletePalletTypeApi(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/pallet-types/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    let errorMsg = `Failed to delete pallet type: ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
}

// 6. Custom Attributes Definition
export async function fetchCustomAttributesApi(): Promise<CustomAttributeItem[]> {
  const res = await fetch(`${BASE_URL}/custom-attributes`);
  const rawList = await handleResponse<any[]>(res);
  return rawList.map(item => ({
    ...item,
    isActive: item.isActive ?? item.active ?? true,
    isRequired: item.isRequired ?? item.required ?? false
  }));
}

export async function createCustomAttributeApi(payload: CreateCustomAttributePayload): Promise<CustomAttributeItem> {
  const res = await fetch(`${BASE_URL}/custom-attributes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const rawItem = await handleResponse<any>(res);
  return {
    ...rawItem,
    isActive: rawItem.isActive ?? rawItem.active ?? true,
    isRequired: rawItem.isRequired ?? rawItem.required ?? false
  };
}

// 7. Live Pallet Inventory
export async function fetchPalletsApi(): Promise<PalletInventoryItem[]> {
  const res = await fetch(`${BASE_URL}/pallets`);
  return handleResponse<PalletInventoryItem[]>(res);
}

export async function createInboundPalletApi(payload: CreateInboundPalletPayload): Promise<PalletInventoryItem> {
  const res = await fetch(`${BASE_URL}/pallets/inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PalletInventoryItem>(res);
}

export async function fetchPalletProcessLogsApi(palletId: string): Promise<PalletProcessLogItem[]> {
  const res = await fetch(`${BASE_URL}/pallets/${palletId}/process-logs`);
  return handleResponse<PalletProcessLogItem[]>(res);
}

export async function recordPalletProcessLogApi(palletId: string, payload: RecordPalletProcessLogPayload): Promise<PalletProcessLogItem> {
  const res = await fetch(`${BASE_URL}/pallets/${palletId}/process-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PalletProcessLogItem>(res);
}

// Type Aliases for Backward Compatibility
export type ItemMaster = ItemMasterItem;
export type SkuMaster = SkuMasterItem;
export type PalletType = PalletTypeItem;
export type PalletHandlingStrategy = PalletHandlingStrategyItem;
export type PalletLpn = PalletInventoryItem;
export type CustomAttributeDef = CustomAttributeItem;

// Convenience Service Object
export const masterDataService = {
  getOverview: fetchMasterDataOverviewApi,
  getItems: fetchItemsApi,
  createItem: createItemApi,
  updateItem: updateItemApi,
  deleteItem: deleteItemApi,
  getSkus: fetchSkusApi,
  createSku: createSkuApi,
  updateSku: updateSkuApi,
  deleteSku: deleteSkuApi,
  getStrategies: fetchStrategiesApi,
  createStrategy: createStrategyApi,
  getPalletTypes: fetchPalletTypesApi,
  createPalletType: createPalletTypeApi,
  updatePalletType: updatePalletTypeApi,
  deletePalletType: deletePalletTypeApi,
  getCustomAttributes: fetchCustomAttributesApi,
  createCustomAttribute: createCustomAttributeApi,
  getPallets: fetchPalletsApi,
  createPalletFromStrategy: async (params: CreateInboundPalletPayload) => {
    return createInboundPalletApi(params);
  },
  getPalletProcessLogs: fetchPalletProcessLogsApi,
  recordPalletProcessLog: recordPalletProcessLogApi
};


