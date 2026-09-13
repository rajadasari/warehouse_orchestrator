import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Plus, Box, Layers, Cpu, Database, AlertCircle } from 'lucide-react';
import {
  masterDataService,
  CustomAttributeItem
} from '../../services/masterDataService';
import { DataTable, ColumnDef } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Tabs, TabItemDef } from '../../components/common/Tabs';
import { DefineCustomFieldModal } from './components/DefineCustomFieldModal';

type TargetEntityFilter = 'ALL' | 'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET';

export const CustomFieldsView: React.FC = () => {
  const [attributes, setAttributes] = useState<CustomAttributeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetEntityFilter, setTargetEntityFilter] = useState<TargetEntityFilter>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await masterDataService.getCustomAttributes();
      setAttributes(data || []);
    } catch (err: any) {
      console.error('Failed to load custom attributes from database:', err);
      setErrorMsg(err.message || 'Failed to load custom attribute definitions from database.');
      setAttributes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreated = (newItem: CustomAttributeItem) => {
    setAttributes(prev => [newItem, ...prev]);
  };

  // Filter by active scope tab
  const filteredAttributes = useMemo(() => {
    if (targetEntityFilter === 'ALL') return attributes;
    return attributes.filter(attr => attr.targetEntity === targetEntityFilter);
  }, [attributes, targetEntityFilter]);

  const getScopeBadge = (entity: string) => {
    switch (entity) {
      case 'ITEM':
        return (
          <Badge variant="info" icon={<Box size={11} />}>
            Material (ITEM)
          </Badge>
        );
      case 'SKU':
        return (
          <Badge variant="success" icon={<Layers size={11} />}>
            Packaging (SKU)
          </Badge>
        );
      case 'HANDLING_STRATEGY':
        return (
          <Badge variant="warning" icon={<Cpu size={11} />}>
            Pallet Strategy
          </Badge>
        );
      case 'PALLET':
        return (
          <Badge variant="neutral" icon={<Database size={11} />}>
            Pallet Dynamic
          </Badge>
        );
      default:
        return <Badge variant="neutral">{entity}</Badge>;
    }
  };

  const columns: ColumnDef<CustomAttributeItem>[] = [
    {
      key: 'targetEntity',
      header: 'Scope Entity',
      sortable: true,
      width: '150px',
      render: item => getScopeBadge(item.targetEntity)
    },
    {
      key: 'attributeCode',
      header: 'Attribute (Code / Label)',
      sortable: true,
      render: item => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
          <code style={{ fontSize: '11px', color: 'var(--color-primary-600)' }}>{item.attributeCode}</code>
          {item.description && (
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {item.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'dataType',
      header: 'Data Type',
      sortable: true,
      width: '120px',
      render: item => (
        <span
          style={{
            fontSize: '10.5px',
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)'
          }}
        >
          {item.dataType}
        </span>
      )
    },
    {
      key: 'unitOfMeasure',
      header: 'UoM',
      sortable: true,
      width: '80px',
      render: item => item.unitOfMeasure ? <strong>{item.unitOfMeasure}</strong> : <span style={{ color: 'var(--text-disabled)' }}>-</span>
    },
    {
      key: 'appliesToCategory',
      header: 'Category',
      sortable: true,
      width: '110px',
      render: item => (
        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          {item.appliesToCategory || 'ALL'}
        </span>
      )
    },
    {
      key: 'rules',
      header: 'Validation Rules',
      render: item => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
          <div>
            {item.isRequired ? (
              <Badge variant="danger">Required</Badge>
            ) : (
              <Badge variant="neutral">Optional</Badge>
            )}
          </div>
          {item.defaultValue != null && item.defaultValue !== '' && (
            <div style={{ color: 'var(--text-secondary)' }}>
              Default: <code>{String(item.defaultValue)}</code>
            </div>
          )}
          {item.allowedOptions && item.allowedOptions.length > 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '10.5px' }}>
              Options: {item.allowedOptions.join(', ')}
            </div>
          )}
          {(item.minValue != null || item.maxValue != null) && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '10.5px' }}>
              Range: [{item.minValue ?? '-∞'}, {item.maxValue ?? '+∞'}]
            </div>
          )}
        </div>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      width: '90px',
      render: item => (
        <Badge variant={item.isActive ? 'success' : 'neutral'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'sortOrder',
      header: 'Order',
      sortable: true,
      width: '70px',
      align: 'center',
      render: item => <span style={{ color: 'var(--text-secondary)' }}>{item.sortOrder}</span>
    }
  ];

  const tabs: TabItemDef<TargetEntityFilter>[] = [
    { key: 'ALL', label: 'All Scopes', badge: attributes.length },
    { key: 'ITEM', label: 'Material (ITEM)', icon: <Box size={13} /> },
    { key: 'SKU', label: 'Packaging (SKU)', icon: <Layers size={13} /> },
    { key: 'HANDLING_STRATEGY', label: 'Pallet Strategy', icon: <Cpu size={13} /> },
    { key: 'PALLET', label: 'Pallet Dynamic', icon: <Database size={13} /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', height: '100%', overflowY: 'auto' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Custom Field Definitions
            </h2>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid var(--color-primary-200)'
              }}
            >
              wes.custom_attribute_definition
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Dynamic extensible EAV fields for Materials (ITEM), Packaging (SKU), and Handling Strategies
          </p>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
            isLoading={isLoading}
            onClick={loadData}
          >
            Refresh DB
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Define Custom Field
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Alert type="danger">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </Alert>
      )}

      {/* Scope Filter Tabs */}
      <Tabs
        tabs={tabs}
        activeKey={targetEntityFilter}
        onChange={setTargetEntityFilter}
      />

      {/* Reusable Generic DataTable with Search, Sorting & Pagination */}
      <DataTable
        columns={columns}
        data={filteredAttributes}
        keyField="id"
        searchable={true}
        searchPlaceholder="Search code, label, category, uom..."
        pageSize={10}
        isLoading={isLoading}
        emptyMessage="No custom attribute definitions found for this scope."
      />

      {/* Add Custom Field Modal */}
      <DefineCustomFieldModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};
