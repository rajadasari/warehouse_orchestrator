import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Cpu, 
  RefreshCw, 
  Activity, 
  AlertCircle,
  Columns,
  LayoutList
} from 'lucide-react';
import { analysisService } from './analysisService';
import { 
  StationInfo, 
  StationTagEvent, 
  StationLogFilterState, 
  LogFileInfo 
} from './types';
import { StationTagFilterBar } from './components/StationTagFilterBar';
import { TwoPointDeltaCard, parseTimestampMs } from './components/TwoPointDeltaCard';
import { StationTagGrid } from './components/StationTagGrid';
import { StationTagWaveformViewer } from './components/StationTagWaveformViewer';

interface StationTagInspectorViewProps {
  onNavigateToHandshake?: () => void;
}

export const StationTagInspectorView: React.FC<StationTagInspectorViewProps> = ({ onNavigateToHandshake }) => {
  const [stations, setStations] = useState<StationInfo[]>([]);
  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [loadingStations, setLoadingStations] = useState<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<StationLogFilterState>({
    station: 'ALL',
    from_time: '',
    to_time: '',
    tag_filter: '',
    direction: 'ALL',
    file: 'all'
  });

  // Pagination State
  const [events, setEvents] = useState<StationTagEvent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(250);

  // Two-Point Markers State
  const [markerA, setMarkerA] = useState<StationTagEvent | null>(null);
  const [markerB, setMarkerB] = useState<StationTagEvent | null>(null);

  // Layout View Mode (Split / Waveform Only / Table Only)
  const [layoutMode, setLayoutMode] = useState<'split' | 'waveform_only' | 'table_only'>('split');

  // Load Station Metadata and Files list on mount
  const loadInitialData = useCallback(async () => {
    setLoadingStations(true);
    setError(null);
    try {
      const [stationData, fileData] = await Promise.all([
        analysisService.getStations(),
        analysisService.getFiles()
      ]);
      setStations(stationData.stations || []);
      setFiles(fileData.files || []);

      // If stations available, select the first station with the most events
      if (stationData.stations && stationData.stations.length > 0) {
        const topStation = stationData.stations[0];
        setFilters(prev => ({
          ...prev,
          station: topStation.station,
          from_time: topStation.min_timestamp ? topStation.min_timestamp.slice(0, 19).replace(' ', 'T') : '',
          to_time: topStation.max_timestamp ? topStation.max_timestamp.slice(0, 19).replace(' ', 'T') : ''
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load station index';
      setError(msg);
    } finally {
      setLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Station Logs when filters, limit, or offset change
  const fetchLogs = useCallback(async (currentOffset = offset, currentLimit = limit) => {
    setLoadingLogs(true);
    setError(null);
    try {
      const res = await analysisService.getStationLogs(filters, currentLimit, currentOffset);
      setEvents(res.events || []);
      setTotalCount(res.total || 0);
      setOffset(res.offset || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch station logs';
      setError(msg);
    } finally {
      setLoadingLogs(false);
    }
  }, [filters, offset, limit]);

  // Trigger fetch when initial station is set
  useEffect(() => {
    if (stations.length > 0) {
      fetchLogs(0, limit);
    }
  }, [stations]); // Only run after stations are initially resolved

  const handleFilterChange = <K extends keyof StationLogFilterState>(key: K, value: StationLogFilterState[K]) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      // If user changed station, update date range to match new station bounds if not explicitly set
      if (key === 'station' && value !== 'ALL') {
        const matched = stations.find(s => s.station === value);
        if (matched) {
          if (matched.min_timestamp) updated.from_time = matched.min_timestamp.slice(0, 19).replace(' ', 'T');
          if (matched.max_timestamp) updated.to_time = matched.max_timestamp.slice(0, 19).replace(' ', 'T');
        }
      }
      return updated;
    });
  };

  const handleApplyFilter = () => {
    setOffset(0);
    fetchLogs(0, limit);
  };

  const handleResetFilters = () => {
    const defaultStation = stations[0]?.station || 'ALL';
    const firstSt = stations.find(s => s.station === defaultStation);
    const resetState: StationLogFilterState = {
      station: defaultStation,
      from_time: firstSt?.min_timestamp ? firstSt.min_timestamp.slice(0, 19).replace(' ', 'T') : '',
      to_time: firstSt?.max_timestamp ? firstSt.max_timestamp.slice(0, 19).replace(' ', 'T') : '',
      tag_filter: '',
      direction: 'ALL',
      file: 'all'
    };
    setFilters(resetState);
    setOffset(0);
    // Fetch with reset state
    setTimeout(() => {
      fetchLogs(0, limit);
    }, 50);
  };

  const handleExportCsv = async () => {
    try {
      await analysisService.downloadStationLogsCsv(filters);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export CSV';
      setError(msg);
    }
  };

  const handleSetMarkerA = (evt: StationTagEvent) => {
    setMarkerA(prev => (prev?.id === evt.id ? null : evt));
  };

  const handleSetMarkerB = (evt: StationTagEvent) => {
    setMarkerB(prev => (prev?.id === evt.id ? null : evt));
  };

  const handleClearMarkers = () => {
    setMarkerA(null);
    setMarkerB(null);
  };

  const handleSwapMarkers = () => {
    setMarkerA(markerB);
    setMarkerB(markerA);
  };

  // Calculate count of events between Marker A and Marker B in the current dataset
  const eventsBetweenCount = useMemo(() => {
    if (!markerA || !markerB) return undefined;
    const msA = parseTimestampMs(markerA.timestamp);
    const msB = parseTimestampMs(markerB.timestamp);
    const minMs = Math.min(msA, msB);
    const maxMs = Math.max(msA, msB);

    return events.filter(e => {
      const t = parseTimestampMs(e.timestamp);
      return t >= minMs && t <= maxMs;
    }).length;
  }, [markerA, markerB, events]);

  const selectedStationObj = stations.find(s => s.station === filters.station);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: '100%',
      overflowY: 'auto',
      padding: '20px 24px',
      gap: '16px',
      boxSizing: 'border-box'
    }}>
      {/* Top Analysis Mode Switcher */}
      {onNavigateToHandshake && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '3px',
          width: 'fit-content'
        }}>
          <button
            type="button"
            onClick={onNavigateToHandshake}
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
            <Activity size={14} />
            <span>Handshake Timing & Failures</span>
          </button>
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
            <Cpu size={14} />
            <span>Station Tag Inspector & Timing (New)</span>
          </button>
        </div>
      )}

      {/* View Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={24} color="#38bdf8" />
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary, #f8fafc)',
              letterSpacing: '-0.02em'
            }}>
              Station Tag Inspector & Timing
            </h1>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontWeight: 600
            }}>
              IEC 62443 HMI
            </span>
          </div>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: 'var(--text-secondary, #94a3b8)'
          }}>
            Filter station tag reads and writes with millisecond precision. Select Point A and Point B to calculate exact elapsed durations.
          </p>
        </div>

        {/* Quick Stats Badges & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedStationObj && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(30, 41, 59, 0.7)',
              borderRadius: '6px',
              border: '1px solid #334155',
              fontSize: '12px',
              color: '#cbd5e1'
            }}>
              <Activity size={14} color="#38bdf8" />
              <span>Station: <strong style={{ color: '#38bdf8' }}>{selectedStationObj.station}</strong></span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span><strong>{selectedStationObj.total_events.toLocaleString()}</strong> events</span>
            </div>
          )}

          {/* Layout Mode Selector (Split / Waveform Only / Table Only) */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              title="Split View: Waveform on Top, Table on Bottom"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '36px',
                padding: '0 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: layoutMode === 'split' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: layoutMode === 'split' ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <Columns size={14} />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('waveform_only')}
              title="Full Waveform Analyzer View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '36px',
                padding: '0 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: layoutMode === 'waveform_only' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: layoutMode === 'waveform_only' ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <Activity size={14} />
              <span>Waveform Only</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('table_only')}
              title="Full Table View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '36px',
                padding: '0 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: layoutMode === 'table_only' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: layoutMode === 'table_only' ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutList size={14} />
              <span>Table Only</span>
            </button>
          </div>

          <button
            onClick={() => fetchLogs(offset, limit)}
            disabled={loadingLogs}
            title="Refresh current view"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'rgba(51, 65, 85, 0.5)',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 500,
              cursor: loadingLogs ? 'not-allowed' : 'pointer',
              minHeight: '36px'
            }}
          >
            <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '6px',
          color: '#fca5a5',
          fontSize: '13px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <StationTagFilterBar
        stations={stations}
        files={files}
        filters={filters}
        onChangeFilter={handleFilterChange}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
        onExportCsv={handleExportCsv}
        loading={loadingLogs || loadingStations}
        totalCount={totalCount}
      />

      {/* Two-Point Delta Calculator Sticky Card */}
      <TwoPointDeltaCard
        markerA={markerA}
        markerB={markerB}
        eventsBetweenCount={eventsBetweenCount}
        onClear={handleClearMarkers}
        onSwap={handleSwapMarkers}
      />

      {/* Waveform Telemetry View */}
      {(layoutMode === 'split' || layoutMode === 'waveform_only') && (
        <StationTagWaveformViewer
          events={events}
          markerA={markerA}
          markerB={markerB}
          onSetMarkerA={handleSetMarkerA}
          onSetMarkerB={handleSetMarkerB}
          onClearMarkers={handleClearMarkers}
          isMaximized={layoutMode === 'waveform_only'}
          onToggleMaximize={() => setLayoutMode(m => m === 'waveform_only' ? 'split' : 'waveform_only')}
          loading={loadingLogs}
        />
      )}

      {/* Station Tag Grid */}
      {(layoutMode === 'split' || layoutMode === 'table_only') && (
        <StationTagGrid
          events={events}
          markerA={markerA}
          markerB={markerB}
          onSetMarkerA={handleSetMarkerA}
          onSetMarkerB={handleSetMarkerB}
          offset={offset}
          limit={limit}
          total={totalCount}
          onChangePage={(newOffset) => {
            setOffset(newOffset);
            fetchLogs(newOffset, limit);
          }}
          onChangeLimit={(newLimit) => {
            setLimit(newLimit);
            setOffset(0);
            fetchLogs(0, newLimit);
          }}
          loading={loadingLogs}
        />
      )}
    </div>
  );
};
