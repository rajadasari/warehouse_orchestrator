import React, { useState, useEffect } from 'react';
import { Box, RotateCcw, Check } from 'lucide-react';
import { 
  masterDataService, 
  PalletInventoryItem, 
  PalletHandlingStrategyItem,
  SkuMasterItem,
  PalletTypeItem,
  ItemMasterItem
} from '../../../services/masterDataService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Alert } from '../../../components/common/Alert';

export interface InboundPalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: PalletHandlingStrategyItem[];
  skus: SkuMasterItem[];
  palletTypes: PalletTypeItem[];
  items: ItemMasterItem[];
  onPalletCreated: (newPallet: PalletInventoryItem) => void;
}

export const InboundPalletModal: React.FC<InboundPalletModalProps> = ({
  isOpen,
  onClose,
  strategies,
  skus,
  palletTypes,
  items,
  onPalletCreated
}) => {
  const [loadType, setLoadType] = useState<'NO_LOAD' | 'MATERIAL' | 'MATERIAL_WITH_SKU' | 'PALLET_STACK'>('MATERIAL_WITH_SKU');
  const [lpn, setLpn] = useState('');
  const [palletAlias, setPalletAlias] = useState('');
  const [strategyId, setStrategyId] = useState('');
  const [palletTypeId, setPalletTypeId] = useState('');
  const [itemId, setItemId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [materialQty, setMaterialQty] = useState<number>(500);
  const [packageCount, setPackageCount] = useState<number>(40);
  const [palletStackCount, setPalletStackCount] = useState<number>(10);
  const [actualWeight, setActualWeight] = useState<number>(750);
  const [status, setStatus] = useState('STAGED');
  const [location, setLocation] = useState('STAGING-LANE-01');
  const [isMixed, setIsMixed] = useState(false);
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [rfidTag, setRfidTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Helper to populate all full pallet defaults using DB entities and dynamic year
  const populateDefaults = (
    mode?: 'NO_LOAD' | 'MATERIAL' | 'MATERIAL_WITH_SKU' | 'PALLET_STACK',
    targetStratId?: string,
    targetTypeId?: string,
    targetSkuId?: string,
    targetItemId?: string
  ) => {
    const activeMode = mode || loadType;
    setLoadType(activeMode);

    const currentYear = new Date().getFullYear();
    const seq = Math.floor(100000 + Math.random() * 900000);
    const newLpn = `PLT-${currentYear}-${seq}`;
    const newLot = `LOT-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
    const newRfid = `3034257BF400${String(seq).padStart(12, '0')}`;
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newExpiry = nextYear.toISOString().split('T')[0];

    const strat = strategies.find(s => s.id === (targetStratId || strategyId)) || (strategies.length > 0 ? strategies[0] : null);
    const pType = palletTypes.find(t => t.id === (targetTypeId || strat?.palletTypeId || palletTypeId)) || (palletTypes.length > 0 ? palletTypes[0] : null);
    const sku = skus.find(k => k.id === (targetSkuId || strat?.skuId || skuId)) || (skus.length > 0 ? skus[0] : null);
    const item = items.find(i => i.id === (targetItemId || strat?.itemId || sku?.itemId || itemId)) || (items.length > 0 ? items[0] : null);

    const tare = pType?.tareWeightKg || 25.0;
    const pkgs = strat?.standardPackageCount || 40;
    const unitWt = sku?.unitsPerPackage || 18.0;

    let calcWeight = tare;

    if (activeMode === 'NO_LOAD') {
      calcWeight = Number(tare.toFixed(1));
      setPackageCount(0);
    } else if (activeMode === 'PALLET_STACK') {
      const stack = 10;
      setPalletStackCount(stack);
      calcWeight = Number((tare * stack).toFixed(1));
      setPackageCount(0);
    } else if (activeMode === 'MATERIAL') {
      const mat = 500;
      setMaterialQty(mat);
      calcWeight = Number((tare + mat).toFixed(1));
      setPackageCount(1);
    } else {
      // MATERIAL_WITH_SKU
      calcWeight = Number((tare + pkgs * unitWt).toFixed(1));
      setPackageCount(pkgs);
    }

    setLpn(newLpn);
    setPalletAlias('');
    setLotNumber(newLot);
    setRfidTag(newRfid);
    setExpiryDate(newExpiry);
    setLocation('STAGING-LANE-01');
    setStatus('STAGED');
    setIsMixed(false);
    setActualWeight(calcWeight);

    if (strat) setStrategyId(strat.id);
    if (pType) setPalletTypeId(pType.id);
    if (sku) setSkuId(sku.id);
    if (item) setItemId(item.id);
  };

  useEffect(() => {
    if (isOpen) {
      populateDefaults();
      setFormError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await masterDataService.createPalletFromStrategy({
        palletLpn: lpn.trim() || undefined,
        palletAlias: palletAlias.trim() || undefined,
        loadType,
        strategyId: (loadType === 'NO_LOAD' || loadType === 'PALLET_STACK') ? undefined : (strategyId || undefined),
        palletTypeId: palletTypeId || undefined,
        itemId: (loadType === 'MATERIAL' || loadType === 'MATERIAL_WITH_SKU') ? (itemId || undefined) : undefined,
        skuId: loadType === 'MATERIAL_WITH_SKU' ? (skuId || undefined) : undefined,
        materialQuantity: loadType === 'MATERIAL' ? Number(materialQty) : undefined,
        status,
        location: location.trim() || 'STAGING-LANE-01',
        isMixedPallet: loadType === 'MATERIAL_WITH_SKU' ? isMixed : false,
        actualWeightKg: actualWeight ? Number(actualWeight) : undefined,
        packageCount: loadType === 'MATERIAL_WITH_SKU' ? (packageCount ? Number(packageCount) : undefined) : (loadType === 'MATERIAL' ? 1 : 0),
        lotNumber: lotNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        rfidTag: rfidTag.trim() || undefined,
        customAttributes: {
          ...(loadType === 'PALLET_STACK' ? { pallet_stack_count: palletStackCount } : {}),
          ...(palletAlias.trim() ? { pallet_alias: palletAlias.trim() } : {})
        }
      });

      onPalletCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to register inbound pallet:', err);
      setFormError(err.message || 'Failed to register pallet in wes.pallet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="720px"
      title={
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
          <span>1-Click Inbound Pallet Entry</span>
          <span style={{
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--color-primary-600)',
            fontWeight: 700,
            border: '1px solid rgba(37, 99, 235, 0.2)'
          }}>
            wes.pallet
          </span>
        </div>
      }
      subtitle="All physical container, operational, and sensor attributes ready for immediate record entry"
      headerActions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<RotateCcw size={12} />}
          onClick={() => populateDefaults()}
          title="Randomize and regenerate pallet defaults"
        >
          Re-roll
        </Button>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {formError && (
          <Alert variant="danger" title="Registration Failed" onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        )}

        {/* Load Type Mode Selector */}
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
              const active = loadType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => populateDefaults(tab.id as any)}
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

        {/* Panel 1: Pallet Identity & Carrier Type */}
        <div style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            1. Pallet Identity &amp; Carrier Type
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Pallet LPN (Barcode / SSCC) *
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  required
                  value={lpn}
                  onChange={e => setLpn(e.target.value)}
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
                    const currentYear = new Date().getFullYear();
                    const seq = Math.floor(100000 + Math.random() * 900000);
                    setLpn(`PLT-${currentYear}-${seq}`);
                    setPalletAlias(`ALIAS-${String(seq).slice(-4)}`);
                    setRfidTag(`3034257BF400${String(seq).padStart(12, '0')}`);
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Pallet Alias (Secondary Identifier)
              </label>
              <input
                type="text"
                value={palletAlias}
                onChange={e => setPalletAlias(e.target.value)}
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

            {(loadType === 'MATERIAL' || loadType === 'MATERIAL_WITH_SKU') && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Handling Strategy
                </label>
                <select
                  value={strategyId}
                  onChange={e => {
                    const stratId = e.target.value;
                    setStrategyId(stratId);
                    const strat = strategies.find(s => s.id === stratId);
                    if (strat) {
                      if (strat.palletTypeId) setPalletTypeId(strat.palletTypeId);
                      if (strat.skuId) setSkuId(strat.skuId);
                      if (strat.itemId) setItemId(strat.itemId);
                      if (strat.standardPackageCount) {
                        setPackageCount(strat.standardPackageCount);
                        const t = palletTypes.find(p => p.id === (strat.palletTypeId || palletTypeId));
                        const k = skus.find(item => item.id === (strat.skuId || skuId));
                        const wt = (t?.tareWeightKg || 25.0) + (strat.standardPackageCount * (k?.unitsPerPackage || 18.0));
                        setActualWeight(Number(wt.toFixed(1)));
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

            <div style={{ gridColumn: (loadType === 'NO_LOAD' || loadType === 'PALLET_STACK') ? 'auto' : 'span 2' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Pallet Type (Carrier Master) *
              </label>
              <select
                required
                value={palletTypeId}
                onChange={e => {
                  const typeId = e.target.value;
                  setPalletTypeId(typeId);
                  const pType = palletTypes.find(p => p.id === typeId);
                  if (pType) {
                    const tare = pType.tareWeightKg;
                    if (loadType === 'NO_LOAD') {
                      setActualWeight(Number(tare.toFixed(1)));
                    } else if (loadType === 'PALLET_STACK') {
                      setActualWeight(Number((tare * palletStackCount).toFixed(1)));
                    } else if (loadType === 'MATERIAL') {
                      setActualWeight(Number((tare + materialQty).toFixed(1)));
                    } else {
                      const k = skus.find(item => item.id === skuId);
                      const wt = tare + (packageCount * (k?.unitsPerPackage || 18.0));
                      setActualWeight(Number(wt.toFixed(1)));
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

        {/* Panel 2: Cargo / Load Configuration */}
        <div style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            2. {loadType === 'NO_LOAD' ? 'Cargo Status' : loadType === 'PALLET_STACK' ? 'Stack Configuration' : loadType === 'MATERIAL' ? 'Material Load Details' : 'Loaded SKU Inventory'}
          </div>

          {loadType === 'NO_LOAD' && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Box size={22} color="var(--text-secondary)" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Empty Carrier Pallet (No Payload)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  This pallet carrier is circulating without material or packaged SKU cargo. Recorded weight matches empty carrier tare ({actualWeight} kg).
                </div>
              </div>
            </div>
          )}

          {loadType === 'PALLET_STACK' && (
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
                  value={palletStackCount}
                  onChange={e => {
                    const count = parseInt(e.target.value, 10) || 2;
                    setPalletStackCount(count);
                    const pType = palletTypes.find(p => p.id === palletTypeId);
                    const tare = pType?.tareWeightKg || 25.0;
                    setActualWeight(Number((tare * count).toFixed(1)));
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
                  {palletStackCount} nested carriers • Total tare: {actualWeight} kg
                </div>
              </div>
            </div>
          )}

          {loadType === 'MATERIAL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Material / Bulk Item Master *
                </label>
                <select
                  required
                  value={itemId}
                  onChange={e => setItemId(e.target.value)}
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
                  Material Quantity ({items.find(i => i.id === itemId)?.baseUom || 'KG'}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  required
                  value={materialQty}
                  onChange={e => {
                    const qty = parseFloat(e.target.value) || 0;
                    setMaterialQty(qty);
                    const pType = palletTypes.find(p => p.id === palletTypeId);
                    const tare = pType?.tareWeightKg || 25.0;
                    setActualWeight(Number((tare + qty).toFixed(1)));
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
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="e.g. LOT-491"
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
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
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

          {loadType === 'MATERIAL_WITH_SKU' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  SKU Item *
                </label>
                <select
                  required
                  value={skuId}
                  onChange={e => {
                    const id = e.target.value;
                    setSkuId(id);
                    const k = skus.find(item => item.id === id);
                    const t = palletTypes.find(p => p.id === palletTypeId);
                    const wt = (t?.tareWeightKg || 25.0) + (packageCount * (k?.unitsPerPackage || 18.0));
                    setActualWeight(Number(wt.toFixed(1)));
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
                  value={packageCount}
                  onChange={e => {
                    const count = parseInt(e.target.value, 10) || 1;
                    setPackageCount(count);
                    const k = skus.find(item => item.id === skuId);
                    const t = palletTypes.find(p => p.id === palletTypeId);
                    const wt = (t?.tareWeightKg || 25.0) + (count * (k?.unitsPerPackage || 18.0));
                    setActualWeight(Number(wt.toFixed(1)));
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
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="e.g. LOT-491"
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
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
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

        {/* Panel 3: Operational State & Sensor Telemetry */}
        <div style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            3. Operational State &amp; Sensor Telemetry
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Current Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Operational Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Actual Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={actualWeight}
                onChange={e => setActualWeight(parseFloat(e.target.value) || 0)}
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
              gridColumn: 'span 2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              opacity: loadType === 'MATERIAL_WITH_SKU' ? 1 : 0.55
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Mix Status
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {loadType === 'MATERIAL_WITH_SKU' ? 'Single vs multi-SKU load' : 'Single / Not applicable'}
                </span>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: loadType === 'MATERIAL_WITH_SKU' ? 'pointer' : 'not-allowed' }}>
                <input
                  type="checkbox"
                  disabled={loadType !== 'MATERIAL_WITH_SKU'}
                  checked={loadType === 'MATERIAL_WITH_SKU' ? isMixed : false}
                  onChange={e => setIsMixed(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: loadType === 'MATERIAL_WITH_SKU' ? 'pointer' : 'not-allowed', accentColor: 'var(--color-primary-600)' }}
                />
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: (loadType === 'MATERIAL_WITH_SKU' && isMixed) ? '#D97706' : 'var(--color-primary-600)'
                }}>
                  {(loadType === 'MATERIAL_WITH_SKU' && isMixed) ? 'MIXED' : 'SINGLE'}
                </span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                RFID EPC Tag
              </label>
              <input
                type="text"
                value={rfidTag}
                onChange={e => setRfidTag(e.target.value)}
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

        {/* Modal Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Check size={14} />}
          >
            Register Pallet in wes.pallet
          </Button>
        </div>
      </form>
    </Modal>
  );
};
