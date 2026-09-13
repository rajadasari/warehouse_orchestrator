import React, { useState } from 'react';
import { Box, Send, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  PalletInventoryItem,
  PalletTypeItem,
  ItemMasterItem,
  SkuMasterItem
} from '../../../services/masterDataService';
import {
  wmsService,
  WmsPreAnnounceResult,
  WmsTokenStatus
} from '../../../services/wmsService';
import { ResourceItem } from '../../../services/resourceService';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Alert } from '../../../components/common/Alert';
import { Badge } from '../../../components/common/Badge';
import { Card } from '../../../components/common/Card';

export interface PreAnnounceTabProps {
  pallets: PalletInventoryItem[];
  palletTypes: PalletTypeItem[];
  items: ItemMasterItem[];
  skus: SkuMasterItem[];
  wmsResources: ResourceItem[];
  selectedResourceId: string;
  onSelectResource: (id: string) => Promise<void>;
  tokenStatus: WmsTokenStatus | null;
}

interface PreAnnounceFormData {
  selectedExistingLpn: string;
  palletLpn: string;
  palletTypeCode: string;
  itemCode: string;
  skuCode: string;
  quantity: string | number;
  uom: string;
  lotNumber: string;
  expiryDate: string;
  actualWeightKg: string | number;
  sourceLocation: string;
}

const initialFormValues: PreAnnounceFormData = {
  selectedExistingLpn: '',
  palletLpn: '',
  palletTypeCode: '',
  itemCode: '',
  skuCode: '',
  quantity: '',
  uom: '',
  lotNumber: '',
  expiryDate: '',
  actualWeightKg: '',
  sourceLocation: ''
};

export const PreAnnounceTab: React.FC<PreAnnounceTabProps> = ({
  pallets,
  palletTypes,
  items,
  skus,
  wmsResources,
  selectedResourceId,
  onSelectResource,
  tokenStatus
}) => {
  const { values, setFieldValue, handleChange, reset } = useForm<PreAnnounceFormData>(initialFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<WmsPreAnnounceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Autofill form from selected DB pallet
  const handleSelectPallet = (lpn: string) => {
    setFieldValue('selectedExistingLpn', lpn);
    if (!lpn) return;
    const p = pallets.find(plt => plt.palletLpn === lpn);
    if (!p) return;

    setFieldValue('palletLpn', p.palletLpn || '');
    setFieldValue('palletTypeCode', p.palletTypeCode || '');
    setFieldValue('itemCode', p.itemCode || (p.items && p.items[0]?.itemCode) || '');
    setFieldValue('skuCode', (p.items && p.items[0]?.skuCode) || '');

    const qty = (p.items && p.items[0]?.totalQuantity) != null
      ? p.items[0].totalQuantity
      : (p.telemetry?.quantity || '');
    setFieldValue('quantity', qty !== '' ? String(qty) : '');

    const uom = (p.items && p.items[0]?.baseUom) || p.materialBaseUom || '';
    setFieldValue('uom', uom);

    setFieldValue('lotNumber', (p.items && p.items[0]?.lotNumber) || '');
    setFieldValue('expiryDate', (p.items && p.items[0]?.expiryDate) || '');
    setFieldValue('actualWeightKg', p.actualWeightKg != null ? String(p.actualWeightKg) : '');
    setFieldValue('sourceLocation', p.currentLocation || '');
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
    reset();
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.palletLpn.trim()) {
      setError('Pallet LPN is required. Select an existing pallet from the database or enter one.');
      return;
    }
    if (!values.palletTypeCode.trim()) {
      setError('Pallet Type Code is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await wmsService.preAnnounce({
        palletLpn: values.palletLpn.trim(),
        palletTypeCode: values.palletTypeCode.trim(),
        itemCode: values.itemCode.trim() || undefined,
        skuCode: values.skuCode.trim() || undefined,
        quantity: values.quantity !== '' ? Number(values.quantity) : undefined,
        uom: values.uom.trim() || undefined,
        lotNumber: values.lotNumber.trim() || undefined,
        expiryDate: values.expiryDate.trim() || undefined,
        actualWeightKg: values.actualWeightKg !== '' ? Number(values.actualWeightKg) : undefined,
        sourceLocation: values.sourceLocation.trim() || undefined,
        targetResourceId: selectedResourceId || undefined
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit pre-announce request to WMS');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
      {/* Top Banner */}
      <Alert
        type="info"
        icon={<Box size={16} color="var(--color-primary-600)" />}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={12} />}
            onClick={handleClear}
          >
            Clear Form
          </Button>
        }
      >
        <span>
          Pre-Announce sends physical container specifications to the WMS before arrival. Data maps directly to <strong>wes.pallet</strong>.
        </span>
      </Alert>

      {/* Target Resource & WMS Connectivity Card */}
      <Card
        title="Target WMS Integration Node"
        subtitle="Route payload to active WMS adapter instance"
        headerActions={
          tokenStatus && (
            <Badge variant={tokenStatus.hasToken ? 'success' : 'warning'} icon={<ShieldCheck size={12} />}>
              {tokenStatus.hasToken ? 'OAuth2 Authenticated' : 'No Valid Token'}
            </Badge>
          )
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <Select
            label="WMS Destination Resource"
            value={selectedResourceId}
            onChange={e => onSelectResource(e.target.value)}
          >
            {wmsResources.map(res => (
              <option key={res.resourceId} value={res.resourceId}>
                {res.name || res.resourceId} ({res.type || 'WMS'})
              </option>
            ))}
          </Select>

          {tokenStatus && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="form-label">Endpoint URL</span>
              <div
                style={{
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-default)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {tokenStatus.targetBaseUrl || 'Default Internal Route'}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Database Autofill Card */}
      <Card
        title="Select Pallet from Database"
        subtitle="Autofill fields using live pallet data from warehouse database"
      >
        <Select
          label="Available Inbound / Staged Pallets in DB"
          value={values.selectedExistingLpn}
          onChange={e => handleSelectPallet(e.target.value)}
          placeholder="-- Select a pallet to autofill fields --"
        >
          <option value="">-- Choose Pallet LPN --</option>
          {pallets.map(p => (
            <option key={p.id} value={p.palletLpn}>
              {p.palletLpn} &bull; {p.itemCode || 'No Item'} &bull; {p.status || 'UNKNOWN'} &bull; {p.currentLocation || 'No Loc'}
            </option>
          ))}
        </Select>
      </Card>

      {/* Feedback Messages */}
      {error && (
        <Alert type="danger">
          {error}
        </Alert>
      )}

      {result && (
        <Alert
          type={result.successful ? 'success' : 'danger'}
          icon={result.successful ? <CheckCircle2 size={16} /> : undefined}
          title={result.successful ? 'Pre-Announce Successfully Sent to WMS!' : 'WMS Submission Rejected'}
        >
          {result.successful ? (
            <div>
              Pre-announce ID: <strong>{result.preAnnounceId}</strong> &bull; Pallet LPN: <strong>{result.palletLpn}</strong>
            </div>
          ) : (
            <div>{result.errorMessage || 'Unknown error occurred'}</div>
          )}
        </Alert>
      )}

      {/* Main Container Specifications */}
      <Card title="Pallet Physical & Inventory Specification">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <Input
            label="Pallet LPN"
            required
            name="palletLpn"
            value={values.palletLpn}
            onChange={handleChange}
            placeholder="e.g. PAL-2026-001"
          />

          <Select
            label="Pallet Type Code"
            required
            name="palletTypeCode"
            value={values.palletTypeCode}
            onChange={handleChange}
          >
            <option value="">-- Select Pallet Type --</option>
            {palletTypes.map(pt => (
              <option key={pt.id} value={pt.code}>
                {pt.name} ({pt.code})
              </option>
            ))}
          </Select>

          <Select
            label="Material / Item"
            name="itemCode"
            value={values.itemCode}
            onChange={handleChange}
          >
            <option value="">-- Optional: Select Item --</option>
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
          >
            <option value="">-- Optional: Select SKU --</option>
            {skus.map(sk => (
              <option key={sk.id} value={sk.skuCode}>
                {sk.skuCode} ({sk.packageType})
              </option>
            ))}
          </Select>

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={values.quantity}
            onChange={handleChange}
            placeholder="e.g. 500"
          />

          <Input
            label="Unit of Measure (UOM)"
            name="uom"
            value={values.uom}
            onChange={handleChange}
            placeholder="e.g. EA, KG, BOX"
          />

          <Input
            label="Lot Number"
            name="lotNumber"
            value={values.lotNumber}
            onChange={handleChange}
            placeholder="e.g. LOT-2026-A"
          />

          <Input
            label="Expiry Date"
            name="expiryDate"
            type="date"
            value={values.expiryDate}
            onChange={handleChange}
          />

          <Input
            label="Actual Weight (Kg)"
            name="actualWeightKg"
            type="number"
            value={values.actualWeightKg}
            onChange={handleChange}
            placeholder="e.g. 750.5"
          />

          <Input
            label="Source Location"
            name="sourceLocation"
            value={values.sourceLocation}
            onChange={handleChange}
            placeholder="e.g. STAGING-01, DOCK-A"
          />
        </div>
      </Card>

      {/* Submission CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClear}
        >
          Reset Form
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={<Send size={14} />}
          isLoading={isSubmitting}
        >
          Send Pre-Announce to WMS
        </Button>
      </div>
    </form>
  );
};
