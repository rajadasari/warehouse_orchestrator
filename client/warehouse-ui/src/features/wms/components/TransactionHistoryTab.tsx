import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, History, Loader2, AlertCircle } from 'lucide-react';
import { wmsService, WmsTransactionLog } from '../../../services/wmsService';
import { Button } from '../../../components/common/Button';
import { Badge, getStatusBadgeVariant } from '../../../components/common/Badge';
import { LogDetailModal } from './LogDetailModal';

export const TransactionHistoryTab: React.FC = () => {
  const [logs, setLogs] = useState<WmsTransactionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inspectedLog, setInspectedLog] = useState<WmsTransactionLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await wmsService.getTransactions();
      setLogs(data || []);
    } catch (err: any) {
      console.error('Failed to load WMS audit logs:', err);
      setError(err.message || 'Failed to load transaction audit history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={16} color="var(--color-primary-600)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            WMS Transaction Audit Trail
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            ({logs.length} logged calls)
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} />}
          isLoading={isLoading}
          onClick={fetchLogs}
        >
          Refresh Logs
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Operation</th>
              <th>Pallet LPN</th>
              <th>Order Ref</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                  <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <div style={{ color: 'var(--text-secondary)' }}>Loading audit transactions...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No WMS transactions logged yet. Execute a Pre-Announce or Order to view logs.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <code style={{ fontSize: '11px', fontWeight: 600 }}>{log.transactionType}</code>
                  </td>
                  <td>
                    <strong>{log.palletLpn || '-'}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {log.orderReference || '-'}
                  </td>
                  <td>
                    <Badge variant={getStatusBadgeVariant(log.status)}>
                      {log.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye size={12} />}
                      onClick={() => setInspectedLog(log)}
                    >
                      Inspect Payload
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <LogDetailModal
        log={inspectedLog}
        onClose={() => setInspectedLog(null)}
      />
    </div>
  );
};
