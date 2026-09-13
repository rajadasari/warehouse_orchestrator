import React, { useState, useEffect } from 'react';
import { 
  Send, 
  ShoppingCart, 
  History, 
  RotateCcw, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Box, 
  CheckCircle2, 
  Clock,
  Eye,
  Code,
  Copy,
  Check,
  X,
  Server,
  Layers
} from 'lucide-react';
import { 
  resourceService, 
  ResourceItem 
} from '../../services/resourceService';
import { 
  wmsService, 
  PalletPreAnnouncePayload, 
  CreateOrderPayload, 
  WmsTransactionLog, 
  WmsTokenStatus,
  WmsPreAnnounceResult,
  WmsOrderResult,
  WmsReserveResult,
  WmsOutboundResult
} from '../../services/wmsService';
import { 
  masterDataService, 
  PalletInventoryItem, 
  PalletTypeItem, 
  ItemMasterItem, 
  SkuMasterItem 
} from '../../services/masterDataService';

type WmsTabKey = 'pre-announce' | 'ordering' | 'history';

export const WmsFormsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WmsTabKey>('pre-announce');

  // Master Data & Pallet state for auto-completes
  const [pallets, setPallets] = useState<PalletInventoryItem[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletTypeItem[]>([]);
  const [items, setItems] = useState<ItemMasterItem[]>([]);
  const [skus, setSkus] = useState<SkuMasterItem[]>([]);
  const [tokenStatus, setTokenStatus] = useState<WmsTokenStatus | null>(null);
  const [wmsResources, setWmsResources] = useState<ResourceItem[]>([]);
  const [preTargetResourceId, setPreTargetResourceId] = useState('');

  const handleSelectWmsResource = async (resId: string) => {
    setPreTargetResourceId(resId);
    if (resId) {
      try {
        const st = await wmsService.getTokenStatus(resId);
        setTokenStatus(st);
      } catch {
        // ignore
      }
    } else {
      setTokenStatus(null);
    }
  };

  // Pre-announce Form State (Clean, non-hardcoded states)
  const [selectedPalletLpn, setSelectedPalletLpn] = useState('');
  const [preLpn, setPreLpn] = useState('');
  const [prePalletTypeCode, setPrePalletTypeCode] = useState('');
  const [preItemCode, setPreItemCode] = useState('');
  const [preSkuCode, setPreSkuCode] = useState('');
  const [preQuantity, setPreQuantity] = useState<string>('');
  const [preUom, setPreUom] = useState('');
  const [preLotNumber, setPreLotNumber] = useState('');
  const [preExpiryDate, setPreExpiryDate] = useState('');
  const [preActualWeight, setPreActualWeight] = useState<string>('');
  const [preSourceLocation, setPreSourceLocation] = useState('');
  const [preSubmitting, setPreSubmitting] = useState(false);
  const [preResult, setPreResult] = useState<WmsPreAnnounceResult | null>(null);
  const [preError, setPreError] = useState<string | null>(null);

  // Ordering Form State
  const [orderClientRef, setOrderClientRef] = useState('');
  const [orderType, setOrderType] = useState('OUTBOUND_SHIPMENT');
  const [orderPalletLpn, setOrderPalletLpn] = useState('');
  const [orderItemCode, setOrderItemCode] = useState('');
  const [orderSkuCode, setOrderSkuCode] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [orderDestination, setOrderDestination] = useState('STAGE-LANE-OUT-01');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<WmsOrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Reservation & Outbound workflow states
  const [activeCreatedOrderId, setActiveCreatedOrderId] = useState<string | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const [reserveResult, setReserveResult] = useState<WmsReserveResult | null>(null);
  const [outboundSubmitting, setOutboundSubmitting] = useState(false);
  const [outboundResult, setOutboundResult] = useState<WmsOutboundResult | null>(null);

  // Audit Logs State
  const [logs, setLogs] = useState<WmsTransactionLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [inspectedLog, setInspectedLog] = useState<WmsTransactionLog | null>(null);
  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);

  const formatJson = (data: any) => {
    if (!data) return '{}';
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  const copyToClipboard = (text: string, type: 'req' | 'res') => {
    navigator.clipboard.writeText(text);
    if (type === 'req') {
      setCopiedReq(true);
      setTimeout(() => setCopiedReq(false), 2000);
    } else {
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    }
  };

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
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

      const filtered = (resList || []).filter((r: ResourceItem) =>
        r.type?.toUpperCase() === 'WMS' ||
        r.type?.toUpperCase() === 'SOFTWARE' ||
        r.resourceId?.toUpperCase().includes('WMS')
      );
      setWmsResources(filtered);

      const targetId = filtered.length > 0 ? filtered[0].resourceId : '';
      setPreTargetResourceId(targetId);

      if (targetId) {
        const authSt = await wmsService.getTokenStatus(targetId).catch(() => null);
        setTokenStatus(authSt);
      }

      // Pre-seed ordering defaults only (keep pre-announce form clean)
      resetOrderingDefaults(plts, itms, sks);
    } catch (e) {
      console.error('Error loading WMS form prerequisites:', e);
    }
  };

  // Populate pre-announce form from real database pallet in inventory
  const handleSelectExistingPallet = (lpn: string) => {
    setSelectedPalletLpn(lpn);
    if (!lpn) return;
    const p = pallets.find(plt => plt.palletLpn === lpn);
    if (!p) return;

    setPreLpn(p.palletLpn || '');
    setPrePalletTypeCode(p.palletTypeCode || '');
    setPreItemCode(p.itemCode || (p.items && p.items[0]?.itemCode) || '');
    setPreSkuCode((p.items && p.items[0]?.skuCode) || '');

    const qty = (p.items && p.items[0]?.totalQuantity) != null 
      ? p.items[0].totalQuantity 
      : (p.telemetry?.quantity || '');
    setPreQuantity(qty !== '' ? String(qty) : '');

    const uom = (p.items && p.items[0]?.baseUom) || p.materialBaseUom || '';
    setPreUom(uom);

    setPreLotNumber((p.items && p.items[0]?.lotNumber) || '');
    setPreExpiryDate((p.items && p.items[0]?.expiryDate) || '');
    setPreActualWeight(p.actualWeightKg != null ? String(p.actualWeightKg) : '');
    setPreSourceLocation(p.currentLocation || '');
    setPreResult(null);
    setPreError(null);
  };

  // Clear pre-announce form to blank state
  const handleClearPreAnnounceForm = () => {
    setSelectedPalletLpn('');
    setPreLpn('');
    setPrePalletTypeCode('');
    setPreItemCode('');
    setPreSkuCode('');
    setPreQuantity('');
    setPreUom('');
    setPreLotNumber('');
    setPreExpiryDate('');
    setPreActualWeight('');
    setPreSourceLocation('');
    setPreResult(null);
    setPreError(null);
  };

  const resetOrderingDefaults = (
    plts: PalletInventoryItem[] = pallets,
    itms: ItemMasterItem[] = items,
    sks: SkuMasterItem[] = skus
  ) => {
    const refSeq = Math.floor(10000 + Math.random() * 90000);
    setOrderClientRef(`SO-2026-${refSeq}`);
    setOrderType('OUTBOUND_SHIPMENT');
    setOrderDestination('STAGE-LANE-OUT-01');
    setOrderResult(null);
    setOrderError(null);
    setActiveCreatedOrderId(null);
    setReserveResult(null);
    setOutboundResult(null);

    if (plts.length > 0) {
      const selected = plts[0];
      setOrderPalletLpn(selected.palletLpn);
      if (selected.itemCode) setOrderItemCode(selected.itemCode);
      if (selected.items && selected.items.length > 0) {
        setOrderSkuCode(selected.items[0].skuCode || '');
        setOrderQuantity(Number(selected.items[0].totalQuantity || 1000));
      }
    } else {
      setOrderPalletLpn('PLT-2026-442062');
      if (itms.length > 0) setOrderItemCode(itms[0].itemCode);
      if (sks.length > 0) setOrderSkuCode(sks[0].skuCode);
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const txs = await wmsService.getTransactions();
      setLogs(txs || []);
    } catch (e) {
      console.error('Failed to load WMS audit logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadAuditLogs();
    }
  }, [activeTab]);

  // Handle Pre-Announce Submission
  const handleSubmitPreAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreError(null);
    setPreResult(null);

    if (!preTargetResourceId) {
      setPreError('Please select a Target WMS Resource.');
      return;
    }
    if (!preLpn.trim()) {
      setPreError('Pallet LPN (Barcode / SSCC) is required.');
      return;
    }
    if (!prePalletTypeCode.trim()) {
      setPreError('Please select a Pallet Type.');
      return;
    }
    if (!preSourceLocation.trim()) {
      setPreError('Receiving Location / Staging Bay is required.');
      return;
    }

    const numQty = parseFloat(preQuantity);
    if (isNaN(numQty) || numQty <= 0) {
      setPreError('Total Quantity must be a valid number greater than zero.');
      return;
    }

    const numWeight = parseFloat(preActualWeight);
    if (isNaN(numWeight) || numWeight <= 0) {
      setPreError('Scale Weight must be a valid number greater than zero.');
      return;
    }

    setPreSubmitting(true);
    const payload: PalletPreAnnouncePayload = {
      palletLpn: preLpn.trim(),
      palletTypeCode: prePalletTypeCode.trim(),
      itemCode: preItemCode.trim() || undefined,
      skuCode: preSkuCode.trim() || undefined,
      quantity: numQty,
      uom: preUom.trim() || 'KG',
      lotNumber: preLotNumber.trim() || undefined,
      expiryDate: preExpiryDate || undefined,
      actualWeightKg: numWeight,
      sourceLocation: preSourceLocation.trim(),
      targetResourceId: preTargetResourceId
    };

    try {
      const res = await wmsService.preAnnounce(payload);
      setPreResult(res);
    } catch (err: any) {
      setPreError(err.message || 'Pre-announce dispatch failed.');
    } finally {
      setPreSubmitting(false);
    }
  };

  // Handle Create Order Submission
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitting(true);
    setOrderError(null);
    setOrderResult(null);
    setReserveResult(null);
    setOutboundResult(null);

    const payload: CreateOrderPayload = {
      clientOrderRef: orderClientRef.trim(),
      orderType: orderType.trim(),
      palletLpn: orderPalletLpn.trim(),
      itemCode: orderItemCode.trim() || undefined,
      skuCode: orderSkuCode.trim() || undefined,
      quantity: Number(orderQuantity),
      destinationLocation: orderDestination.trim()
    };

    try {
      const res = await wmsService.createOrder(payload);
      setOrderResult(res);
      if (res.successful && res.wmsOrderId) {
        setActiveCreatedOrderId(res.wmsOrderId);
      }
    } catch (err: any) {
      setOrderError(err.message || 'Order creation failed.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Handle Pallet Reservation
  const handleReserveOrder = async () => {
    if (!activeCreatedOrderId) return;
    setReserveSubmitting(true);
    try {
      const res = await wmsService.reserveOrder({
        wmsOrderId: activeCreatedOrderId,
        palletLpn: orderPalletLpn.trim()
      });
      setReserveResult(res);
    } catch (err: any) {
      alert(`Reservation failed: ${err.message}`);
    } finally {
      setReserveSubmitting(false);
    }
  };

  // Handle Send to Outbound Release
  const handleSendToOutbound = async () => {
    if (!activeCreatedOrderId) return;
    setOutboundSubmitting(true);
    try {
      const res = await wmsService.sendToOutbound({
        wmsOrderId: activeCreatedOrderId,
        palletLpn: orderPalletLpn.trim(),
        targetDockLocation: orderDestination.trim()
      });
      setOutboundResult(res);
    } catch (err: any) {
      alert(`Outbound release failed: ${err.message}`);
    } finally {
      setOutboundSubmitting(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-page)',
      color: 'var(--text-primary)',
      padding: '16px 20px',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* View Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--border-default)',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary-600)'
          }}>
            <Send size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                WMS Form Operations
              </h1>
              <span style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '5px',
                backgroundColor: 'rgba(22, 163, 74, 0.12)',
                color: '#16A34A',
                fontWeight: 600,
                border: '1px solid rgba(22, 163, 74, 0.25)'
              }}>
                Bearer Token Injected
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Integrated Pre-Announce and Ordering forms with automated Bearer token authentication
            </p>
          </div>
        </div>

        {/* Auth Status Mini Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)'
        }}>
          <ShieldCheck size={14} color="#16A34A" />
          <div style={{ fontSize: '11px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Active Token: </span>
            <span style={{ fontWeight: 600, color: '#16A34A' }}>
              {tokenStatus?.hasToken ? 'Active & Valid' : 'Ready'}
            </span>
          </div>
          <button
            onClick={async () => {
              await wmsService.refreshToken(preTargetResourceId);
              const s = await wmsService.getTokenStatus(preTargetResourceId);
              setTokenStatus(s);
            }}
            title="Refresh Token"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: '2px',
        marginBottom: '16px'
      }}>
        <button
          onClick={() => setActiveTab('pre-announce')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            borderBottom: activeTab === 'pre-announce' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
            backgroundColor: activeTab === 'pre-announce' ? 'var(--bg-surface-subtle)' : 'transparent',
            color: activeTab === 'pre-announce' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'pre-announce' ? 700 : 500,
            fontSize: '12.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Box size={15} />
          <span>Pre-Announce Form</span>
          <span style={{
            fontSize: '9.5px',
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--color-primary-600)',
            fontWeight: 600
          }}>
            wes.pallet
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ordering')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            borderBottom: activeTab === 'ordering' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
            backgroundColor: activeTab === 'ordering' ? 'var(--bg-surface-subtle)' : 'transparent',
            color: activeTab === 'ordering' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'ordering' ? 700 : 500,
            fontSize: '12.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ShoppingCart size={15} />
          <span>Ordering Form</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
            backgroundColor: activeTab === 'history' ? 'var(--bg-surface-subtle)' : 'transparent',
            color: activeTab === 'history' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'history' ? 700 : 500,
            fontSize: '12.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <History size={15} />
          <span>Transaction Audit History</span>
        </button>
      </div>

      {/* TAB 1: PRE-ANNOUNCE FORM (wes.pallet configuration) */}
      {activeTab === 'pre-announce' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <form onSubmit={handleSubmitPreAnnounce} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '920px' }}>
            
            {/* Header info banner */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={16} color="var(--color-primary-600)" />
                <span style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  Fields map directly to the <strong>wes.pallet</strong> physical container specification and pass standard warehouse validation before WMS submission.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearPreAnnounceForm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={11} />
                <span>Clear Form</span>
              </button>
            </div>

            {/* Error Message */}
            {preError && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={14} />
                <span>{preError}</span>
              </div>
            )}

            {/* Success Acknowledgment Banner */}
            {preResult && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={20} color="#16A34A" />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#16A34A' }}>
                      Pre-Announce Successfully Acknowledged by WMS!
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      WMS Acknowledgment ID: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{preResult.preAnnounceId}</strong> for Pallet LPN: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{preResult.palletLpn}</strong>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  Header injected: <code style={{ fontSize: '10px' }}>Authentication: accessToken</code>
                </span>
              </div>
            )}

            {/* Target WMS Resource Destination Selector */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '14px',
              borderLeft: '4px solid var(--color-primary-600)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={16} color="var(--color-primary-600)" />
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                    Target WMS Resource (System Destination)
                  </span>
                </div>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--color-primary-600)',
                  fontWeight: 600
                }}>
                  wes.resource
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '14px', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                    Select Target WMS Resource *
                  </label>
                  <select
                    value={preTargetResourceId}
                    onChange={e => handleSelectWmsResource(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Select Target WMS Resource * --</option>
                    {wmsResources.map((res: ResourceItem) => (
                      <option key={res.id || res.resourceId} value={res.resourceId}>
                        {res.name || res.resourceId} ({res.resourceId})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    Select which WMS system this pallet should be dispatched to.
                  </span>
                </div>

                {/* Selected Resource Live Details Card */}
                {(() => {
                  const selectedRes = wmsResources.find(r => r.resourceId === preTargetResourceId);
                  const ip = selectedRes?.ip || selectedRes?.customProperties?.ip || '';
                  const port = selectedRes?.customProperties?.port || '';
                  const resolvedUrl = tokenStatus?.targetBaseUrl || (ip ? `http://${ip}${port ? ':' + port : ''}` : 'Not Configured');
                  const hasToken = tokenStatus?.hasToken ?? false;

                  return (
                    <div style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                            {selectedRes?.name || preTargetResourceId}
                          </strong>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            [{preTargetResourceId}]
                          </span>
                        </div>
                        <span style={{
                          fontSize: '9.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: (selectedRes?.status === 'ACTIVE' || !selectedRes) ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: (selectedRes?.status === 'ACTIVE' || !selectedRes) ? '#16A34A' : '#EF4444',
                          fontWeight: 700
                        }}>
                          {selectedRes?.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '2px', color: 'var(--text-secondary)' }}>
                        <div>
                          Host URL: <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{resolvedUrl}</code>
                        </div>
                        <div>
                          Auth: <span style={{ color: hasToken ? '#16A34A' : 'var(--text-secondary)', fontWeight: 600 }}>
                            {hasToken ? 'Bearer Active' : 'Token Ready'}
                          </span>
                        </div>
                      </div>

                      <div style={{ color: 'var(--text-secondary)', fontSize: '10.5px' }}>
                        Endpoint URI: <code style={{ color: 'var(--color-primary-600)' }}>/api/v1/wms/pallets/pre-announce</code>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Auto-Populate from Real Inventory Pallet */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 320px' }}>
                <Layers size={16} color="var(--color-primary-600)" />
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Load from Pallet Inventory:
                </span>
                <select
                  value={selectedPalletLpn}
                  onChange={e => handleSelectExistingPallet(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    fontFamily: 'monospace'
                  }}
                >
                  <option value="">-- Choose Pallet (Optional) --</option>
                  {pallets.map(p => (
                    <option key={p.id} value={p.palletLpn}>
                      {p.palletLpn} {p.palletTypeCode ? `[${p.palletTypeCode}]` : ''} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleClearPreAnnounceForm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-default)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={11} />
                <span>Clear Form</span>
              </button>
            </div>

            {/* Section 1: Carrier & Identity */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                1. Pallet Identity &amp; Carrier Base (wes.pallet)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Pallet LPN */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Pallet LPN (Barcode / SSCC) *
                  </label>
                  <input
                    type="text"
                    required
                    value={preLpn}
                    onChange={e => setPreLpn(e.target.value)}
                    placeholder="Enter Pallet Barcode / SSCC (e.g. PLT-001)"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Pallet Type Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Pallet Type Master *
                  </label>
                  <select
                    value={prePalletTypeCode}
                    onChange={e => setPrePalletTypeCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Select Pallet Type * --</option>
                    {palletTypes.map((pt: PalletTypeItem) => (
                      <option key={pt.id} value={pt.code}>
                        {pt.code} — {pt.name} (Tare: {pt.tareWeightKg}kg)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source / Receiving Location */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Receiving Location / Staging Bay *
                  </label>
                  <input
                    type="text"
                    required
                    value={preSourceLocation}
                    onChange={e => setPreSourceLocation(e.target.value)}
                    placeholder="Enter Receiving Location (e.g. RCV-DOCK-01)"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Material & Product Load */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                2. Material, SKU &amp; Lot Traceability (wes.pallet_item)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Item Master Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Item Code (Material)
                  </label>
                  <select
                    value={preItemCode}
                    onChange={e => {
                      const c = e.target.value;
                      setPreItemCode(c);
                      const itm = items.find(i => i.itemCode === c);
                      if (itm && itm.baseUom) setPreUom(itm.baseUom);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Optional: Select Item / Material --</option>
                    {items.map((it: ItemMasterItem) => (
                      <option key={it.id} value={it.itemCode}>
                        {it.itemCode} — {it.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    SKU Code (Packaging Unit)
                  </label>
                  <select
                    value={preSkuCode}
                    onChange={e => setPreSkuCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Optional: Select SKU --</option>
                    {skus.map((k: SkuMasterItem) => (
                      <option key={k.id} value={k.skuCode}>
                        {k.skuCode} ({k.packageType} - {k.unitsPerPackage})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total Quantity */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Total Quantity {preUom ? `(${preUom})` : ''} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={preQuantity}
                    onChange={e => setPreQuantity(e.target.value)}
                    placeholder="Enter total quantity"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Lot Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Batch / Lot Number
                  </label>
                  <input
                    type="text"
                    value={preLotNumber}
                    onChange={e => setPreLotNumber(e.target.value)}
                    placeholder="Enter Batch / Lot Number"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Expiry Date (FEFO)
                  </label>
                  <input
                    type="date"
                    value={preExpiryDate}
                    onChange={e => setPreExpiryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Verified Actual Weight */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Scale Weight (actual_weight_kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={preActualWeight}
                    onChange={e => setPreActualWeight(e.target.value)}
                    placeholder="Enter scale weight in kg"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleClearPreAnnounceForm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={preSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--color-primary-600)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: preSubmitting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                {preSubmitting ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                <span>Send Pre-Announce to WMS</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 2: ORDERING FORM */}
      {activeTab === 'ordering' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px', maxWidth: '1100px' }}>
            
            {/* Left: Order Creation Form */}
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShoppingCart size={16} color="var(--color-primary-600)" />
                <span style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  Submit client order instructions to Third-Party WMS. Once created, execute stock reservation and release to outbound.
                </span>
              </div>

              {orderError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#EF4444',
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={14} />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Order Info Card */}
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Order Parameters
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Client Order Ref */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Client Order Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderClientRef}
                      onChange={e => setOrderClientRef(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Order Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Order Type *
                    </label>
                    <select
                      value={orderType}
                      onChange={e => setOrderType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="OUTBOUND_SHIPMENT">OUTBOUND_SHIPMENT</option>
                      <option value="TRANSFER">TRANSFER</option>
                      <option value="CROSS_DOCK">CROSS_DOCK</option>
                    </select>
                  </div>

                  {/* Target Pallet LPN */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Source Pallet LPN (from Inventory) *
                    </label>
                    <select
                      value={orderPalletLpn}
                      onChange={e => {
                        const lpn = e.target.value;
                        setOrderPalletLpn(lpn);
                        const match = pallets.find((p: PalletInventoryItem) => p.palletLpn === lpn);
                        if (match) {
                          if (match.itemCode) setOrderItemCode(match.itemCode);
                          if (match.items && match.items.length > 0) {
                            setOrderSkuCode(match.items[0].skuCode || '');
                            setOrderQuantity(Number(match.items[0].totalQuantity || 1000));
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {pallets.map((p: PalletInventoryItem) => (
                        <option key={p.id} value={p.palletLpn}>
                          {p.palletLpn} — {p.loadType || 'PALLET'} ({p.status}) @ {p.currentLocation}
                        </option>
                      ))}
                      {pallets.length === 0 && <option value="PLT-2026-442062">PLT-2026-442062</option>}
                    </select>
                  </div>

                  {/* Item Code */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Item Code
                    </label>
                    <input
                      type="text"
                      value={orderItemCode}
                      onChange={e => setOrderItemCode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Order Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderQuantity}
                      onChange={e => setOrderQuantity(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Destination Location */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Destination Location / Dispatch Door *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderDestination}
                      onChange={e => setOrderDestination(e.target.value)}
                      placeholder="e.g. STAGE-LANE-OUT-01"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={orderSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: orderSubmitting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                {orderSubmitting ? <Loader2 size={14} className="spin" /> : <ShoppingCart size={14} />}
                <span>1. Create Order in WMS</span>
              </button>
            </form>

            {/* Right: Step-by-Step Order Pipeline (Reservation & Release) */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                WMS Order Lifecycle Pipeline
              </div>

              {/* Step 1: Created State */}
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: activeCreatedOrderId ? 'rgba(22, 163, 74, 0.08)' : 'var(--bg-surface-subtle)',
                border: activeCreatedOrderId ? '1px solid rgba(22, 163, 74, 0.25)' : '1px solid var(--border-default)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeCreatedOrderId ? <CheckCircle2 size={16} color="#16A34A" /> : <Clock size={16} color="var(--text-secondary)" />}
                    <span style={{ fontSize: '11.5px', fontWeight: 700 }}>Step 1: Order Created</span>
                  </div>
                  {activeCreatedOrderId && (
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 600 }}>
                      CONFIRMED
                    </span>
                  )}
                </div>
                {orderResult?.wmsOrderId && (
                  <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                    WMS Order ID: <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{orderResult.wmsOrderId}</code>
                  </div>
                )}
              </div>

              {/* Step 2: Pallet Stock Reservation */}
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: reserveResult?.successful ? 'rgba(22, 163, 74, 0.08)' : 'var(--bg-surface-subtle)',
                border: reserveResult?.successful ? '1px solid rgba(22, 163, 74, 0.25)' : '1px solid var(--border-default)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {reserveResult?.successful ? <CheckCircle2 size={16} color="#16A34A" /> : <Clock size={16} color="var(--text-secondary)" />}
                    <span style={{ fontSize: '11.5px', fontWeight: 700 }}>Step 2: Stock Reservation</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReserveOrder}
                    disabled={!activeCreatedOrderId || reserveSubmitting || reserveResult?.successful}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: reserveResult?.successful ? 'rgba(22, 163, 74, 0.2)' : 'var(--color-primary-600)',
                      color: reserveResult?.successful ? '#16A34A' : '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: (!activeCreatedOrderId || reserveResult?.successful) ? 'not-allowed' : 'pointer',
                      opacity: (!activeCreatedOrderId || reserveResult?.successful) ? 0.6 : 1
                    }}
                  >
                    {reserveSubmitting ? 'Reserving...' : reserveResult?.successful ? 'Reserved' : 'Reserve Pallet'}
                  </button>
                </div>
                {reserveResult?.reservationId && (
                  <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                    Reservation ID: <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{reserveResult.reservationId}</code>
                  </div>
                )}
              </div>

              {/* Step 3: Outbound Release */}
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: outboundResult?.successful ? 'rgba(22, 163, 74, 0.08)' : 'var(--bg-surface-subtle)',
                border: outboundResult?.successful ? '1px solid rgba(22, 163, 74, 0.25)' : '1px solid var(--border-default)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {outboundResult?.successful ? <CheckCircle2 size={16} color="#16A34A" /> : <Clock size={16} color="var(--text-secondary)" />}
                    <span style={{ fontSize: '11.5px', fontWeight: 700 }}>Step 3: Release Outbound</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendToOutbound}
                    disabled={!activeCreatedOrderId || outboundSubmitting || outboundResult?.successful}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: outboundResult?.successful ? 'rgba(22, 163, 74, 0.2)' : '#16A34A',
                      color: outboundResult?.successful ? '#16A34A' : '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: (!activeCreatedOrderId || outboundResult?.successful) ? 'not-allowed' : 'pointer',
                      opacity: (!activeCreatedOrderId || outboundResult?.successful) ? 0.6 : 1
                    }}
                  >
                    {outboundSubmitting ? 'Releasing...' : outboundResult?.successful ? 'Released' : 'Release Pallet'}
                  </button>
                </div>
                {outboundResult?.outboundStageSpur && (
                  <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                    Dispatched to Spur: <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{outboundResult.outboundStageSpur}</code>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Recent dispatch audit transactions captured by WES integration engine:
            </span>
            <button
              onClick={loadAuditLogs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '5px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={11} />
              <span>Refresh Log</span>
            </button>
          </div>

          {isLoadingLogs ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <Loader2 size={24} className="spin" color="var(--color-primary-600)" />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
              No transactions dispatched yet. Submit Pre-Announce or Order forms above.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '8px 12px' }}>Timestamp</th>
                    <th style={{ padding: '8px 12px' }}>Transaction Type</th>
                    <th style={{ padding: '8px 12px' }}>Pallet LPN</th>
                    <th style={{ padding: '8px 12px' }}>WMS Reference ID</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Details</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Payload & Response</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: WmsTransactionLog) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                        {log.transactionType}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                        {log.palletLpn || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--color-primary-600)' }}>
                        {log.wmsReferenceId || '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: log.status === 'SUCCESS' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: log.status === 'SUCCESS' ? '#16A34A' : '#EF4444'
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        {log.details || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setInspectedLog(log)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: 'var(--color-primary-600)',
                            border: '1px solid rgba(37, 99, 235, 0.25)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                            e.currentTarget.style.color = 'var(--color-primary-600)';
                          }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYLOAD & RESPONSE INSPECTION MODAL */}
      {inspectedLog && (
        <div 
          onClick={() => setInspectedLog(null)}
          style={{
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
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '900px',
              maxWidth: '95vw',
              height: '80vh',
              maxHeight: '85vh',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code size={18} color="var(--color-primary-600)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                  WMS Transaction Audit: {inspectedLog.transactionType}
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: inspectedLog.status === 'SUCCESS' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: inspectedLog.status === 'SUCCESS' ? '#16A34A' : '#EF4444'
                }}>
                  {inspectedLog.status}
                </span>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Metadata Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '10px 20px',
              fontSize: '11.5px',
              borderBottom: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-page)'
            }}>
              <div><strong>Timestamp:</strong> {new Date(inspectedLog.createdAt).toLocaleString()}</div>
              <div><strong>Pallet LPN:</strong> <code style={{ fontWeight: 600 }}>{inspectedLog.palletLpn || '—'}</code></div>
              <div><strong>Ref ID:</strong> <code style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>{inspectedLog.wmsReferenceId || '—'}</code></div>
              <div><strong>Details:</strong> {inspectedLog.details || '—'}</div>
            </div>

            {/* Modal Body: Two-panel side-by-side JSON view */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              padding: '16px 20px',
              overflow: 'hidden'
            }}>
              {/* Request Payload */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-page)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Request Payload (Sent to WMS)</span>
                  <button
                    onClick={() => copyToClipboard(formatJson(inspectedLog.payload), 'req')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedReq ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                    <span>{copiedReq ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  flex: 1,
                  overflowY: 'auto',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  lineHeight: '1.45',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
                }}>
                  {formatJson(inspectedLog.payload)}
                </pre>
              </div>

              {/* Response Payload */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-page)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Response Payload (From WMS)</span>
                  <button
                    onClick={() => copyToClipboard(formatJson(inspectedLog.responsePayload), 'res')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedRes ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                    <span>{copiedRes ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  flex: 1,
                  overflowY: 'auto',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  lineHeight: '1.45',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
                }}>
                  {formatJson(inspectedLog.responsePayload)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '10px 20px',
              borderTop: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <button
                onClick={() => setInspectedLog(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-primary-600)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
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
