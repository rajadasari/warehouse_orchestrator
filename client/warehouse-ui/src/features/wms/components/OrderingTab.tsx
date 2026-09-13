import React, { useState, useEffect } from 'react';
import { ShoppingCart, Send, CheckCircle2, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import {
  PalletInventoryItem,
  ItemMasterItem,
  SkuMasterItem
} from '../../../services/masterDataService';
import {
  wmsService,
  WmsOrderResult,
  WmsReserveResult,
  WmsOutboundResult
} from '../../../services/wmsService';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Alert } from '../../../components/common/Alert';
import { Badge } from '../../../components/common/Badge';
import { Card } from '../../../components/common/Card';

export interface OrderingTabProps {
  pallets: PalletInventoryItem[];
  items: ItemMasterItem[];
  skus: SkuMasterItem[];
}

interface OrderingFormData {
  clientOrderRef: string;
  orderType: string;
  palletLpn: string;
  itemCode: string;
  skuCode: string;
  quantity: string | number;
  destinationLocation: string;
}

export const OrderingTab: React.FC<OrderingTabProps> = ({
  pallets,
  items,
  skus
}) => {
  const generateClientRef = () => {
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${today}-${rand}`;
  };

  const initialValues: OrderingFormData = {
    clientOrderRef: generateClientRef(),
    orderType: 'OUTBOUND_SHIPMENT',
    palletLpn: pallets.length > 0 ? pallets[0].palletLpn : '',
    itemCode: '',
    skuCode: '',
    quantity: '',
    destinationLocation: ''
  };

  const { values, setFieldValue, setValues, handleChange } = useForm<OrderingFormData>(initialValues);

  // Workflow states
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<WmsOrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const [reserveResult, setReserveResult] = useState<WmsReserveResult | null>(null);

  const [outboundSubmitting, setOutboundSubmitting] = useState(false);
  const [outboundResult, setOutboundResult] = useState<WmsOutboundResult | null>(null);

  // Derive distinct destination locations dynamically from warehouse data
  const availableLocations = React.useMemo(() => {
    const locSet = new Set<string>();
    pallets.forEach(p => {
      if (p.currentLocation) locSet.add(p.currentLocation);
    });
    return Array.from(locSet);
  }, [pallets]);

  // When pallet selection changes, dynamically populate item, sku, and available quantity from DB
  const handlePalletChange = (lpn: string) => {
    setFieldValue('palletLpn', lpn);
    const selected = pallets.find(p => p.palletLpn === lpn);
    if (!selected) return;

    if (selected.itemCode) {
      setFieldValue('itemCode', selected.itemCode);
    }
    if (selected.items && selected.items.length > 0) {
      const sub = selected.items[0];
      setFieldValue('skuCode', sub.skuCode || '');
      setFieldValue('quantity', sub.totalQuantity || '');
      if (sub.itemCode) setFieldValue('itemCode', sub.itemCode);
    } else {
      const qty = selected.telemetry?.quantity || '';
      setFieldValue('quantity', qty);
    }

    if (selected.currentLocation && !values.destinationLocation) {
      setFieldValue('destinationLocation', selected.currentLocation);
    }
  };

  // Sync initial pallet selection when pallets load from DB
  useEffect(() => {
    if (pallets.length > 0 && !values.palletLpn) {
      handlePalletChange(pallets[0].palletLpn);
    }
  }, [pallets]);

  const handleReset = () => {
    const firstLpn = pallets.length > 0 ? pallets[0].palletLpn : '';
    setValues({
      clientOrderRef: generateClientRef(),
      orderType: 'OUTBOUND_SHIPMENT',
      palletLpn: firstLpn,
      itemCode: '',
      skuCode: '',
      quantity: '',
      destinationLocation: availableLocations[0] || ''
    });
    if (firstLpn) {
      handlePalletChange(firstLpn);
    }
    setActiveOrderId(null);
    setOrderResult(null);
    setOrderError(null);
    setReserveResult(null);
    setOutboundResult(null);
  };

  // Step 1: Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.palletLpn) {
      setOrderError('Pallet LPN is required. Please select an available pallet from inventory.');
      return;
    }
    if (!values.destinationLocation.trim()) {
      setOrderError('Destination location is required.');
      return;
    }

    setOrderSubmitting(true);
    setOrderError(null);
    setOrderResult(null);
    setActiveOrderId(null);
    setReserveResult(null);
    setOutboundResult(null);

    try {
      const res = await wmsService.createOrder({
        clientOrderRef: values.clientOrderRef.trim(),
        orderType: values.orderType,
        palletLpn: values.palletLpn.trim(),
        itemCode: values.itemCode.trim() || undefined,
        skuCode: values.skuCode.trim() || undefined,
        quantity: values.quantity !== '' ? Number(values.quantity) : undefined,
        destinationLocation: values.destinationLocation.trim()
      });

      setOrderResult(res);
      if (res.successful && res.wmsOrderId) {
        setActiveOrderId(res.wmsOrderId);
      }
    } catch (err: any) {
      setOrderError(err.message || 'Failed to create order in WMS');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Step 2: Reserve Stock
  const handleReserveStock = async () => {
    if (!activeOrderId || !values.palletLpn) return;
    setReserveSubmitting(true);
    try {
      const res = await wmsService.reserveOrder({
        wmsOrderId: activeOrderId,
        palletLpn: values.palletLpn
      });
      setReserveResult(res);
    } catch (err: any) {
      setReserveResult({
        successful: false,
        errorMessage: err.message || 'Stock reservation failed'
      });
    } finally {
      setReserveSubmitting(false);
    }
  };

  // Step 3: Outbound Release
  const handleReleaseOutbound = async () => {
    if (!activeOrderId || !values.palletLpn) return;
    setOutboundSubmitting(true);
    try {
      const res = await wmsService.sendToOutbound({
        wmsOrderId: activeOrderId,
        palletLpn: values.palletLpn,
        targetDockLocation: values.destinationLocation || undefined
      });
      setOutboundResult(res);
    } catch (err: any) {
      setOutboundResult({
        successful: false,
        errorMessage: err.message || 'Outbound release failed'
      });
    } finally {
      setOutboundSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
      {/* Top Banner */}
      <Alert
        type="info"
        icon={<ShoppingCart size={16} color="var(--color-primary-600)" />}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={12} />}
            onClick={handleReset}
          >
            New Order
          </Button>
        }
      >
        <span>
          Issue outbound shipment orders, reserve warehouse inventory against WMS order lines, and trigger physical dispatch.
        </span>
      </Alert>

      {pallets.length === 0 && (
        <Alert type="warning">
          No inventory pallets found in warehouse database. Please stage or create a pallet in Pallet Inventory before creating an outbound order.
        </Alert>
      )}

      {orderError && (
        <Alert type="danger">
          {orderError}
        </Alert>
      )}

      {orderResult?.successful && (
        <Alert type="success" title="WMS Order Registered Successfully">
          <div>
            WMS Order ID: <strong>{orderResult.wmsOrderId}</strong>
            {orderResult.orderNumber && <span> &bull; Order Ref: <strong>{orderResult.orderNumber}</strong></span>}
          </div>
        </Alert>
      )}

      {/* STEP 1: CREATE ORDER FORM */}
      <Card
        title="Step 1: Outbound Order Creation"
        subtitle="Submit order specification and bind to target inventory pallet"
        headerActions={
          activeOrderId ? (
            <Badge variant="success" icon={<CheckCircle2 size={12} />}>
              WMS Order Created: {activeOrderId}
            </Badge>
          ) : (
            <Badge variant="neutral">Draft</Badge>
          )
        }
      >
        <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Input
              label="Client Order Reference"
              required
              name="clientOrderRef"
              value={values.clientOrderRef}
              onChange={handleChange}
              disabled={!!activeOrderId}
            />

            <Select
              label="Order Type"
              name="orderType"
              value={values.orderType}
              onChange={handleChange}
              disabled={!!activeOrderId}
            >
              <option value="OUTBOUND_SHIPMENT">OUTBOUND_SHIPMENT (Standard Dispatch)</option>
              <option value="CROSS_DOCK">CROSS_DOCK (Direct Transfer)</option>
              <option value="REPLENISHMENT">REPLENISHMENT (ASRS to Pick Zone)</option>
            </Select>

            <Select
              label="Target Pallet LPN"
              required
              name="palletLpn"
              value={values.palletLpn}
              onChange={e => handlePalletChange(e.target.value)}
              disabled={!!activeOrderId || pallets.length === 0}
            >
              {pallets.map(p => (
                <option key={p.id} value={p.palletLpn}>
                  {p.palletLpn} &bull; {p.itemCode || 'No Item'} &bull; Status: {p.status}
                </option>
              ))}
            </Select>

            <Select
              label="Item / Material"
              name="itemCode"
              value={values.itemCode}
              onChange={handleChange}
              disabled={!!activeOrderId}
            >
              <option value="">-- Match from Pallet --</option>
              {items.map(it => (
                <option key={it.id} value={it.itemCode}>
                  {it.name} ({it.itemCode})
                </option>
              ))}
            </Select>

            <Select
              label="SKU Code"
              name="skuCode"
              value={values.skuCode}
              onChange={handleChange}
              disabled={!!activeOrderId}
            >
              <option value="">-- Match from Pallet --</option>
              {skus.map(sk => (
                <option key={sk.id} value={sk.skuCode}>
                  {sk.skuCode} ({sk.packageType})
                </option>
              ))}
            </Select>

            <Input
              label="Quantity"
              type="number"
              name="quantity"
              value={values.quantity}
              onChange={handleChange}
              placeholder="Auto-populated from Pallet"
              disabled={!!activeOrderId}
            />

            <Input
              label="Destination Location / Lane"
              required
              name="destinationLocation"
              value={values.destinationLocation}
              onChange={handleChange}
              placeholder="e.g. STAGING-OUT-01 or select below"
              disabled={!!activeOrderId}
            />
          </div>

          {availableLocations.length > 0 && !activeOrderId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Quick select location:</span>
              {availableLocations.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setFieldValue('destinationLocation', loc)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    backgroundColor: values.destinationLocation === loc ? 'var(--color-primary-600)' : 'var(--bg-surface-subtle)',
                    color: values.destinationLocation === loc ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer'
                  }}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}

          {!activeOrderId && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <Button
                type="submit"
                variant="primary"
                icon={<Send size={14} />}
                isLoading={orderSubmitting}
                disabled={pallets.length === 0}
              >
                Create Order in WMS
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* STEP 2: RESERVE STOCK */}
      {activeOrderId && (
        <Card
          title="Step 2: Reserve Stock Allocation"
          subtitle="Lock inventory line against the created order in WMS"
          headerActions={
            reserveResult?.successful ? (
              <Badge variant="success" icon={<CheckCircle2 size={12} />}>Reserved</Badge>
            ) : reserveResult && !reserveResult.successful ? (
              <Badge variant="danger">Reservation Failed</Badge>
            ) : (
              <Badge variant="warning">Awaiting Reservation</Badge>
            )
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12px' }}>
              <div>Order ID: <strong>{activeOrderId}</strong> &bull; Pallet: <strong>{values.palletLpn}</strong></div>
              {reserveResult?.reservationId && (
                <div style={{ color: 'var(--color-success-text)', marginTop: '4px' }}>
                  Reservation Token: <code>{reserveResult.reservationId}</code>
                </div>
              )}
              {reserveResult && !reserveResult.successful && (
                <div style={{ color: 'var(--color-danger-base)', marginTop: '4px' }}>
                  {reserveResult.errorMessage}
                </div>
              )}
            </div>

            {!reserveResult?.successful && (
              <Button
                variant="primary"
                icon={<ShieldCheck size={14} />}
                isLoading={reserveSubmitting}
                onClick={handleReserveStock}
              >
                Reserve Pallet Stock
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* STEP 3: DISPATCH OUTBOUND */}
      {reserveResult?.successful && (
        <Card
          title="Step 3: Release to Outbound Dispatch"
          subtitle="Trigger physical transport to shipping dock or staging lane"
          headerActions={
            outboundResult?.successful ? (
              <Badge variant="success" icon={<CheckCircle2 size={12} />}>Dispatched</Badge>
            ) : (
              <Badge variant="info">Ready to Dispatch</Badge>
            )
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12px' }}>
              <div>Target Dock / Lane: <strong>{values.destinationLocation || 'Standard Dock'}</strong></div>
              {outboundResult?.outboundStageSpur && (
                <div style={{ color: 'var(--color-success-text)', marginTop: '4px' }}>
                  Assigned Outbound Spur: <strong>{outboundResult.outboundStageSpur}</strong>
                </div>
              )}
              {outboundResult && !outboundResult.successful && (
                <div style={{ color: 'var(--color-danger-base)', marginTop: '4px' }}>
                  {outboundResult.errorMessage}
                </div>
              )}
            </div>

            {!outboundResult?.successful && (
              <Button
                variant="primary"
                icon={<ArrowRight size={14} />}
                isLoading={outboundSubmitting}
                onClick={handleReleaseOutbound}
              >
                Release Outbound Shipment
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
