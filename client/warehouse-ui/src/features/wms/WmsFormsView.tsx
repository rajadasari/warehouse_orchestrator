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
  Clock
} from 'lucide-react';
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
  SkuMasterItem, 
  PalletHandlingStrategyItem 
} from '../../services/masterDataService';

type WmsTabKey = 'pre-announce' | 'ordering' | 'history';

export const WmsFormsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WmsTabKey>('pre-announce');

  // Master Data & Pallet state for auto-completes
  const [pallets, setPallets] = useState<PalletInventoryItem[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletTypeItem[]>([]);
  const [items, setItems] = useState<ItemMasterItem[]>([]);
  const [skus, setSkus] = useState<SkuMasterItem[]>([]);
  const [strategies, setStrategies] = useState<PalletHandlingStrategyItem[]>([]);
  const [tokenStatus, setTokenStatus] = useState<WmsTokenStatus | null>(null);

  // Pre-announce Form State (Matches wes.pallet table configuration)
  const [preLpn, setPreLpn] = useState('');
  const [prePalletTypeCode, setPrePalletTypeCode] = useState('EUR_WOOD');
  const [preItemCode, setPreItemCode] = useState('');
  const [preSkuCode, setPreSkuCode] = useState('');
  const [preQuantity, setPreQuantity] = useState<number>(1000);
  const [preUom, setPreUom] = useState('KG');
  const [preLotNumber, setPreLotNumber] = useState('');
  const [preExpiryDate, setPreExpiryDate] = useState('');
  const [preActualWeight, setPreActualWeight] = useState<number>(1025.0);
  const [preSourceLocation, setPreSourceLocation] = useState('RCV-DOCK-01');
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

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [pts, itms, sks, strats, plts, authSt] = await Promise.all([
        masterDataService.getPalletTypes().catch(() => []),
        masterDataService.getItems().catch(() => []),
        masterDataService.getSkus().catch(() => []),
        masterDataService.getStrategies().catch(() => []),
        masterDataService.getPallets().catch(() => []),
        wmsService.getTokenStatus().catch(() => null)
      ]);

      setPalletTypes(pts || []);
      setItems(itms || []);
      setSkus(sks || []);
      setStrategies(strats || []);
      setPallets(plts || []);
      setTokenStatus(authSt);

      // Pre-seed pre-announce defaults
      resetPreAnnounceDefaults(pts, itms, sks, strats);
      resetOrderingDefaults(plts, itms, sks);
    } catch (e) {
      console.error('Error loading WMS form prerequisites:', e);
    }
  };

  const resetPreAnnounceDefaults = (
    pts: PalletTypeItem[] = palletTypes,
    itms: ItemMasterItem[] = items,
    sks: SkuMasterItem[] = skus,
    strats: PalletHandlingStrategyItem[] = strategies
  ) => {
    const seq = Math.floor(100000 + Math.random() * 900000);
    setPreLpn(`PLT-2026-${seq}`);
    setPreLotNumber(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setPreExpiryDate(nextYear.toISOString().split('T')[0]);

    if (pts.length > 0) setPrePalletTypeCode(pts[0].code);
    if (itms.length > 0) {
      setPreItemCode(itms[0].itemCode);
      setPreUom(itms[0].baseUom || 'KG');
    }
    if (sks.length > 0) setPreSkuCode(sks[0].skuCode);
    if (strats.length > 0 && strats[0].standardTotalQuantity) {
      setPreQuantity(Number(strats[0].standardTotalQuantity));
      if (strats[0].expectedTotalWeightKg) {
        setPreActualWeight(Number(strats[0].expectedTotalWeightKg));
      }
    }
    setPreSourceLocation('RCV-DOCK-01');
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
    setPreSubmitting(true);
    setPreError(null);
    setPreResult(null);

    const payload: PalletPreAnnouncePayload = {
      palletLpn: preLpn.trim(),
      palletTypeCode: prePalletTypeCode.trim(),
      itemCode: preItemCode.trim() || undefined,
      skuCode: preSkuCode.trim() || undefined,
      quantity: Number(preQuantity),
      uom: preUom.trim(),
      lotNumber: preLotNumber.trim() || undefined,
      expiryDate: preExpiryDate || undefined,
      actualWeightKg: Number(preActualWeight),
      sourceLocation: preSourceLocation.trim()
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
              await wmsService.refreshToken();
              const s = await wmsService.getTokenStatus();
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
                onClick={() => resetPreAnnounceDefaults()}
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
                <span>Re-generate Defaults</span>
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
                    {palletTypes.map((pt: PalletTypeItem) => (
                      <option key={pt.id} value={pt.code}>
                        {pt.code} — {pt.name} (Tare: {pt.tareWeightKg}kg)
                      </option>
                    ))}
                    {palletTypes.length === 0 && (
                      <option value="EUR_WOOD">EUR_WOOD — Euro Pallet EPAL 1</option>
                    )}
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
                    placeholder="e.g. RCV-DOCK-01"
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
                      if (itm) setPreUom(itm.baseUom || 'KG');
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
                    {items.map((it: ItemMasterItem) => (
                      <option key={it.id} value={it.itemCode}>
                        {it.itemCode} — {it.name}
                      </option>
                    ))}
                    {items.length === 0 && <option value="MAT-MILK-POWDER">MAT-MILK-POWDER</option>}
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
                    {skus.map((k: SkuMasterItem) => (
                      <option key={k.id} value={k.skuCode}>
                        {k.skuCode} ({k.packageType} - {k.unitsPerPackage})
                      </option>
                    ))}
                    {skus.length === 0 && <option value="SKU-MILK-BAG25KG">SKU-MILK-BAG25KG</option>}
                  </select>
                </div>

                {/* Total Quantity */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Total Quantity ({preUom}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={preQuantity}
                    onChange={e => setPreQuantity(parseFloat(e.target.value) || 0)}
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
                    placeholder="e.g. LOT-2026-491"
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
                    onChange={e => setPreActualWeight(parseFloat(e.target.value) || 0)}
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
                onClick={() => resetPreAnnounceDefaults()}
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
                Reset
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
