import { useState, useEffect, useCallback } from 'react';
import { resourceService, ResourceItem } from '../../../services/resourceService';
import { wmsService, WmsTokenStatus } from '../../../services/wmsService';
import {
  masterDataService,
  PalletInventoryItem,
  PalletTypeItem,
  ItemMasterItem,
  SkuMasterItem
} from '../../../services/masterDataService';

export interface UseWmsPrerequisitesResult {
  pallets: PalletInventoryItem[];
  palletTypes: PalletTypeItem[];
  items: ItemMasterItem[];
  skus: SkuMasterItem[];
  wmsResources: ResourceItem[];
  selectedResourceId: string;
  setSelectedResourceId: (id: string) => void;
  tokenStatus: WmsTokenStatus | null;
  isLoading: boolean;
  error: string | null;
  handleSelectResource: (resourceId: string) => Promise<void>;
  handleRefreshToken: () => Promise<void>;
  reloadPrerequisites: () => Promise<void>;
}

export function useWmsPrerequisites(): UseWmsPrerequisitesResult {
  const [pallets, setPallets] = useState<PalletInventoryItem[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletTypeItem[]>([]);
  const [items, setItems] = useState<ItemMasterItem[]>([]);
  const [skus, setSkus] = useState<SkuMasterItem[]>([]);
  const [wmsResources, setWmsResources] = useState<ResourceItem[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [tokenStatus, setTokenStatus] = useState<WmsTokenStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenStatus = async (resId: string) => {
    if (!resId) {
      setTokenStatus(null);
      return;
    }
    try {
      const status = await wmsService.getTokenStatus(resId);
      setTokenStatus(status);
    } catch {
      setTokenStatus(null);
    }
  };

  const handleSelectResource = async (resId: string) => {
    setSelectedResourceId(resId);
    await fetchTokenStatus(resId);
  };

  const handleRefreshToken = async () => {
    try {
      await wmsService.refreshToken(selectedResourceId);
      await fetchTokenStatus(selectedResourceId);
    } catch (e: any) {
      console.error('Failed to refresh token:', e);
    }
  };

  const reloadPrerequisites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pts, itms, sks, plts, resList] = await Promise.all([
        masterDataService.getPalletTypes().catch(() => []),
        masterDataService.getItems().catch(() => []),
        masterDataService.getSkus().catch(() => []),
        masterDataService.getPallets().catch(() => []),
        resourceService.getResources().catch(() => [])
      ]);

      setPalletTypes(pts || []);
      setItems(itms || []);
      setSkus(sks || []);
      setPallets(plts || []);

      const filteredWms = (resList || []).filter((r: ResourceItem) =>
        r.type?.toUpperCase() === 'WMS' ||
        r.type?.toUpperCase() === 'SOFTWARE' ||
        r.resourceId?.toUpperCase().includes('WMS')
      );
      setWmsResources(filteredWms);

      const targetId = filteredWms.length > 0 ? filteredWms[0].resourceId : '';
      setSelectedResourceId(targetId);

      if (targetId) {
        const authSt = await wmsService.getTokenStatus(targetId).catch(() => null);
        setTokenStatus(authSt);
      }
    } catch (err: any) {
      console.error('Error loading WMS prerequisites:', err);
      setError(err.message || 'Failed to load prerequisite data from warehouse database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadPrerequisites();
  }, [reloadPrerequisites]);

  return {
    pallets,
    palletTypes,
    items,
    skus,
    wmsResources,
    selectedResourceId,
    setSelectedResourceId,
    tokenStatus,
    isLoading,
    error,
    handleSelectResource,
    handleRefreshToken,
    reloadPrerequisites
  };
}
