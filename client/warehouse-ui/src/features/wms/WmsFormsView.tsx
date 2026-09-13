import React, { useState } from 'react';
import { Box, ShoppingCart, History, Server, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useWmsPrerequisites } from './hooks/useWmsPrerequisites';
import { PreAnnounceTab } from './components/PreAnnounceTab';
import { OrderingTab } from './components/OrderingTab';
import { TransactionHistoryTab } from './components/TransactionHistoryTab';
import { Tabs, TabItemDef } from '../../components/common/Tabs';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';

type WmsTabKey = 'pre-announce' | 'ordering' | 'history';

export const WmsFormsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WmsTabKey>('pre-announce');

  const {
    pallets,
    palletTypes,
    items,
    skus,
    wmsResources,
    selectedResourceId,
    handleSelectResource,
    tokenStatus,
    handleRefreshToken,
    isLoading,
    error,
    reloadPrerequisites
  } = useWmsPrerequisites();

  const tabs: TabItemDef<WmsTabKey>[] = [
    {
      key: 'pre-announce',
      label: 'Pre-Announce Form',
      icon: <Box size={14} />,
      badge: 'wes.pallet'
    },
    {
      key: 'ordering',
      label: 'Ordering Form',
      icon: <ShoppingCart size={14} />,
      badge: pallets.length > 0 ? `${pallets.length} Pallets` : undefined
    },
    {
      key: 'history',
      label: 'Transaction Audit History',
      icon: <History size={14} />
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', height: '100%', overflowY: 'auto' }}>
      {/* Top Header & Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--color-primary-600)" />
            WMS Outbound & Inbound Interface
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Enterprise warehouse integration orchestrator &bull; Live database sync &amp; multi-step WMS execution
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {tokenStatus && (
            <Badge
              variant={tokenStatus.hasToken ? 'success' : 'warning'}
              icon={<ShieldCheck size={12} />}
            >
              {tokenStatus.hasToken
                ? `Active Token (${tokenStatus.remainingSeconds ? `${Math.round(tokenStatus.remainingSeconds / 60)}m left` : 'Valid'})`
                : 'Token Required'}
            </Badge>
          )}

          {tokenStatus?.requiresRefresh && (
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={12} />}
              onClick={handleRefreshToken}
            >
              Refresh Token
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={12} />}
            isLoading={isLoading}
            onClick={reloadPrerequisites}
          >
            Reload Master Data
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="danger">
          <AlertCircle size={15} />
          <span>{error}</span>
        </Alert>
      )}

      {/* Reusable Tab Strip */}
      <Tabs
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Panels */}
      <div style={{ flex: 1 }}>
        {activeTab === 'pre-announce' && (
          <PreAnnounceTab
            pallets={pallets}
            palletTypes={palletTypes}
            items={items}
            skus={skus}
            wmsResources={wmsResources}
            selectedResourceId={selectedResourceId}
            onSelectResource={handleSelectResource}
            tokenStatus={tokenStatus}
          />
        )}

        {activeTab === 'ordering' && (
          <OrderingTab
            pallets={pallets}
            items={items}
            skus={skus}
          />
        )}

        {activeTab === 'history' && (
          <TransactionHistoryTab />
        )}
      </div>
    </div>
  );
};
