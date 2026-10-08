import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ListOrdered, BarChart3, AlertTriangle, CheckCircle2, Columns, LayoutList, PanelRight, Cpu } from 'lucide-react';
import { 
  HandshakeRecord, 
  HandshakeSummary, 
  StationMetric, 
  LogFileInfo, 
  AnalysisFilterState 
} from './types';
import { analysisService } from './analysisService';
import { HandshakeSummaryKpis } from './components/HandshakeSummaryKpis';
import { FailureBreakdownBar } from './components/FailureBreakdownBar';
import { HandshakeFilterToolbar } from './components/HandshakeFilterToolbar';
import { HandshakeTransactionsTable } from './components/HandshakeTransactionsTable';
import { HandshakeStationMetricsTable } from './components/HandshakeStationMetricsTable';
import { HandshakeInspectorPanel } from './components/HandshakeInspectorPanel';

interface HandshakeAnalysisViewProps {
  onNavigateToStationTags?: () => void;
}

export const HandshakeAnalysisView: React.FC<HandshakeAnalysisViewProps> = ({ onNavigateToStationTags }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'metrics'>('transactions');
  const [splitMode, setSplitMode] = useState<'split' | 'table_only' | 'inspector_only'>('split');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Data states
  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [summary, setSummary] = useState<HandshakeSummary | null>(null);
  const [stationMetrics, setStationMetrics] = useState<StationMetric[]>([]);
  const [records, setRecords] = useState<HandshakeRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Inspector modal
  const [selectedRecord, setSelectedRecord] = useState<HandshakeRecord | null>(null);

  // Filters state
  const [filters, setFilters] = useState<AnalysisFilterState>({
    file: 'all',
    station: '',
    pallet_id: '',
    from_time: '',
    to_time: '',
    status: 'ALL',
    failure_reason: 'ALL'
  });

  // Load available files list
  const loadFiles = useCallback(async () => {
    try {
      const data = await analysisService.getFiles();
      setFiles(data.files);
    } catch (err: any) {
      console.warn('Failed to load log files list:', err);
    }
  }, []);

  // Fetch summary and transactions
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Summary
      const summaryData = await analysisService.getSummary(filters);
      setSummary(summaryData);

      // 2. Fetch Station Metrics if on metrics tab
      if (activeTab === 'metrics') {
        const metricsData = await analysisService.getStationMetrics(filters);
        setStationMetrics(metricsData.stations);
      } else {
        // 3. Fetch Transactions
        const txData = await analysisService.getHandshakes(filters, page, pageSize);
        setRecords(txData.items);
        setTotalRecords(txData.total);
        setTotalPages(txData.total_pages);

        // Auto-select initial transaction for right-side waveform & log inspector
        if (txData.items.length > 0) {
          const first = txData.items[0];
          setSelectedRecord(prev => {
            if (!prev) {
              analysisService.getHandshakeDetail(first.id).then(d => setSelectedRecord(d)).catch(() => {});
              return first;
            }
            return prev;
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching handshake analysis data:', err);
      setError('Could not connect to the Handshake Analysis Service. Ensure the log analyzer is running on port 8095.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, activeTab]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AnalysisFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // reset to page 1 on filter modification
  };

  const handleResetFilters = () => {
    setFilters({
      file: 'all',
      station: '',
      pallet_id: '',
      from_time: '',
      to_time: '',
      status: 'ALL',
      failure_reason: 'ALL',
      is_retry: 'ALL',
      cycle_id: ''
    });
    setPage(1);
  };

  const handleRescan = async () => {
    setLoading(true);
    try {
      await analysisService.rescan();
      await loadFiles();
      await loadData();
    } catch (err: any) {
      setError('Failed to re-scan log files.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadSuccessMsg(null);
    try {
      const res = await analysisService.uploadLogFile(file);
      setUploadSuccessMsg(`Successfully uploaded "${file.name}"! Indexed ${res.file?.handshake_count?.toLocaleString() ?? 0} handshake transactions.`);
      await loadFiles();
      setFilters(prev => ({ ...prev, file: file.name }));
      setPage(1);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setError(`Failed to upload ${file.name}: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectRecord = async (rec: HandshakeRecord) => {
    setSelectedRecord(rec);
    try {
      const fullDetail = await analysisService.getHandshakeDetail(rec.id);
      setSelectedRecord(fullDetail);
    } catch {
      setSelectedRecord(rec);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-page, #0b1120)',
      color: 'var(--text-primary, #f8fafc)',
      overflowY: 'auto',
      padding: '20px 24px',
      boxSizing: 'border-box'
    }}>
      {/* Top Analysis Mode Switcher */}
      {onNavigateToStationTags && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '3px',
          marginBottom: '14px',
          width: 'fit-content'
        }}>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'default',
              minHeight: '36px'
            }}
          >
            <Activity size={14} />
            <span>Handshake Timing & Failures</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToStationTags}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: '36px'
            }}
          >
            <Cpu size={14} />
            <span>Station Tag Inspector & Timing (New)</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} color="var(--color-primary-400, #38bdf8)" />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              PLC ↔ mWCS Handshake Failure & Performance Analysis
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
            Monitor protocol latencies, diagnose failure reasons (timeouts, resets, faults), and inspect transaction timelines.
          </p>
        </div>

        {/* Layout Mode & Tab Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'transactions' && (
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card, #0f172a)',
              border: '1px solid var(--border-default, #334155)',
              borderRadius: '8px',
              padding: '4px',
              gap: '2px'
            }}>
              <button
                type="button"
                onClick={() => setSplitMode('split')}
                title="Split 50/50 View: Table on Left, Waveform & Logs on Right"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '48px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: splitMode === 'split' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: splitMode === 'split' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Columns size={15} />
                <span>Split 50/50</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('table_only')}
                title="Full Table View"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '48px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: splitMode === 'table_only' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: splitMode === 'table_only' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutList size={15} />
                <span>Table Only</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('inspector_only')}
                title="Full Waveform & Telemetry Logs View"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '48px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: splitMode === 'inspector_only' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: splitMode === 'inspector_only' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s ease'
                }}
              >
                <PanelRight size={15} />
                <span>Waveform & Logs</span>
              </button>
            </div>
          )}

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-card, #0f172a)',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '48px',
                padding: '0 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === 'transactions' ? 'var(--color-primary-600, #0284c7)' : 'transparent',
                color: activeTab === 'transactions' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s ease'
              }}
            >
              <ListOrdered size={15} />
              <span>Transactions & Failures</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '48px',
                padding: '0 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === 'metrics' ? 'var(--color-primary-600, #0284c7)' : 'transparent',
                color: activeTab === 'metrics' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s ease'
              }}
            >
              <BarChart3 size={15} />
              <span>Station Timing Benchmark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          color: '#f87171',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Success Banner */}
      {uploadSuccessMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          color: '#34d399',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          <CheckCircle2 size={18} />
          <span>{uploadSuccessMsg}</span>
        </div>
      )}

      {/* Top Summary Metric Cards */}
      <HandshakeSummaryKpis summary={summary} loading={loading} />

      {/* Failure Breakdown Quick Pills */}
      {summary && (
        <FailureBreakdownBar
          breakdown={summary.failure_reasons_breakdown}
          selectedReason={filters.failure_reason}
          onSelectReason={(r) => handleFilterChange({ failure_reason: r, status: r === 'ALL' ? 'ALL' : 'FAILED' })}
        />
      )}

      {/* Filter Toolbar */}
      <HandshakeFilterToolbar
        filters={filters}
        files={files}
        loading={loading}
        uploading={uploading}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onRescan={handleRescan}
        onUploadFile={handleUploadFile}
        onExportCsv={() => analysisService.downloadExportCsv(filters)}
      />

      {/* Main Content: Tab 1 (Transactions split view) vs Tab 2 (Station Metrics) */}
      {activeTab === 'transactions' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: splitMode === 'split' 
            ? 'minmax(420px, 1fr) minmax(460px, 1fr)' 
            : '1fr',
          gap: '16px',
          alignItems: 'start'
        }}>
          {/* Left Side: Current Grid / Transactions Table */}
          {(splitMode === 'split' || splitMode === 'table_only') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <HandshakeTransactionsTable
                records={records}
                total={totalRecords}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                loading={loading}
                selectedRecordId={selectedRecord?.id}
                onPageChange={(p) => setPage(p)}
                onSelectPallet={(palletId) => handleFilterChange({ pallet_id: palletId })}
                onSelectStation={(station) => handleFilterChange({ station })}
                onInspect={handleSelectRecord}
                onSelectRecord={handleSelectRecord}
              />
            </div>
          )}

          {/* Right Side: Waveform Graph with Real Timestamps, Zoom/Pan & Synchronized Logs */}
          {(splitMode === 'split' || splitMode === 'inspector_only') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, height: '100%' }}>
              <HandshakeInspectorPanel
                record={selectedRecord}
                loading={loading}
                isMaximized={splitMode === 'inspector_only'}
                onToggleMaximize={() => setSplitMode(m => m === 'inspector_only' ? 'split' : 'inspector_only')}
                onSelectAttempt={handleSelectRecord}
              />
            </div>
          )}
        </div>
      ) : (
        <HandshakeStationMetricsTable
          metrics={stationMetrics}
          loading={loading}
          onSelectStation={(station) => {
            handleFilterChange({ station });
            setActiveTab('transactions');
          }}
        />
      )}
    </div>
  );
};
