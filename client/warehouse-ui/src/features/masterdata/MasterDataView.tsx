import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Boxes, 
  Layers, 
  Settings2, 
  Tag, 
  RefreshCw, 
  Loader2 
} from 'lucide-react';
import { 
  masterDataService, 
  ItemMaster, 
  SkuMaster, 
  PalletType, 
  PalletHandlingStrategy, 
  CustomAttributeDef 
} from '../../services/masterDataService';
import { Button } from '../../components/common/Button';
import { Tabs } from '../../components/common/Tabs';
import { Alert } from '../../components/common/Alert';
import { MaterialsTab } from './components/MaterialsTab';
import { SkusTab } from './components/SkusTab';
import { PalletTypesTab } from './components/PalletTypesTab';
import { StrategiesTab } from './components/StrategiesTab';
import { CustomFieldsTab } from './components/CustomFieldsTab';

type TabKey = 'materials' | 'skus' | 'pallet_types' | 'strategies' | 'custom_fields';

export const MasterDataView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('materials');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Datasets loaded from backend PostgreSQL tables
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [skus, setSkus] = useState<SkuMaster[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [strategies, setStrategies] = useState<PalletHandlingStrategy[]>([]);
  const [customAttrs, setCustomAttrs] = useState<CustomAttributeDef[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
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
    } catch (err: any) {
      console.error('Failed to load master data:', err);
      setErrorMsg(err.message || 'Failed to load master data from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      {/* 1. Header Section */}
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
              Master Data Management
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
              WES Catalog
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Physical inventory hierarchy: Materials &rarr; Packaging SKUs &rarr; Pallet Types &rarr; Stacking Strategies &rarr; Custom Attributes
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
            title="Reload all master data from PostgreSQL wes tables"
          >
            Refresh All
          </Button>
        </div>
      </div>

      {/* Database Error Alert */}
      {errorMsg && (
        <div style={{ marginBottom: '10px', flexShrink: 0 }}>
          <Alert variant="danger" title="Database Error" onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        </div>
      )}

      {/* 2. Top Tabs Strip */}
      <div style={{ marginBottom: '10px', flexShrink: 0 }}>
        <Tabs<TabKey>
          tabs={[
            {
              key: 'materials',
              label: 'Materials / Items',
              icon: <Package size={14} style={{ marginRight: '6px' }} />,
              badge: items.length
            },
            {
              key: 'skus',
              label: 'Packaging SKUs',
              icon: <Boxes size={14} style={{ marginRight: '6px' }} />,
              badge: skus.length
            },
            {
              key: 'pallet_types',
              label: 'Pallet Types',
              icon: <Layers size={14} style={{ marginRight: '6px' }} />,
              badge: palletTypes.length
            },
            {
              key: 'strategies',
              label: 'Handling Strategies',
              icon: <Settings2 size={14} style={{ marginRight: '6px' }} />,
              badge: strategies.length
            },
            {
              key: 'custom_fields',
              label: 'Custom Fields',
              icon: <Tag size={14} style={{ marginRight: '6px' }} />,
              badge: customAttrs.length
            }
          ]}
          activeKey={activeTab}
          onChange={key => setActiveTab(key)}
        />
      </div>

      {/* 3. Tab Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isLoading && items.length === 0 && skus.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '12px'
          }}>
            <Loader2 size={18} className="animate-spin" />
            <span>Loading master catalog from database...</span>
          </div>
        ) : (
          <>
            {activeTab === 'materials' && (
              <MaterialsTab
                items={items}
                customAttrs={customAttrs}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'skus' && (
              <SkusTab
                skus={skus}
                items={items}
                customAttrs={customAttrs}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'pallet_types' && (
              <PalletTypesTab
                palletTypes={palletTypes}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'strategies' && (
              <StrategiesTab
                strategies={strategies}
                items={items}
                skus={skus}
                palletTypes={palletTypes}
                customAttrs={customAttrs}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'custom_fields' && (
              <CustomFieldsTab
                customAttrs={customAttrs}
                onRefresh={loadData}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
