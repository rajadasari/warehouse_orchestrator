import { 
  HandshakeRecord, 
  HandshakeSummary, 
  StationMetric, 
  LogFileInfo, 
  AnalysisFilterState,
  StationInfo,
  StationTagEvent,
  StationLogFilterState
} from './types';

const API_BASE = '/api/v1/analysis';
const DIRECT_API_BASE = typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? `http://${window.location.hostname}:8095/api/v1/analysis`
  : 'http://127.0.0.1:8095/api/v1/analysis';

async function fetchWithFallback<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // If proxy failed, attempt direct connection to FastAPI on 8095
  }

  const directRes = await fetch(`${DIRECT_API_BASE}${endpoint}`, options);
  if (!directRes.ok) {
    throw new Error(`Analysis API error: ${directRes.statusText}`);
  }
  return await directRes.json();
}

export const analysisService = {
  async getFiles(): Promise<{ files: LogFileInfo[]; total_files: number }> {
    return fetchWithFallback<{ files: LogFileInfo[]; total_files: number }>('/files');
  },

  async getSummary(filters: Partial<AnalysisFilterState>): Promise<HandshakeSummary> {
    const params = new URLSearchParams();
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    if (filters.station) params.append('station', filters.station);
    if (filters.pallet_id) params.append('pallet_id', filters.pallet_id);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback<HandshakeSummary>(`/summary${query}`);
  },

  async getStationMetrics(filters: Partial<AnalysisFilterState>): Promise<{ stations: StationMetric[] }> {
    const params = new URLSearchParams();
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback<{ stations: StationMetric[] }>(`/station-metrics${query}`);
  },

  async getHandshakes(
    filters: Partial<AnalysisFilterState>,
    page: number = 1,
    pageSize: number = 25
  ): Promise<{
    items: HandshakeRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams();
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    if (filters.station) params.append('station', filters.station);
    if (filters.pallet_id) params.append('pallet_id', filters.pallet_id);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.failure_reason && filters.failure_reason !== 'ALL') {
      params.append('failure_reason', filters.failure_reason);
    }
    if (filters.cycle_id) params.append('cycle_id', filters.cycle_id);
    if (filters.is_retry === 'INITIAL') params.append('is_retry', 'false');
    if (filters.is_retry === 'RETRY') params.append('is_retry', 'true');
    params.append('page', String(page));
    params.append('page_size', String(pageSize));

    return fetchWithFallback(`/handshakes?${params.toString()}`);
  },

  async getHandshakeDetail(id: string): Promise<HandshakeRecord> {
    return fetchWithFallback<HandshakeRecord>(`/handshake/${encodeURIComponent(id)}`);
  },

  async rescan(): Promise<{ status: string; total_records: number; files: number }> {
    return fetchWithFallback('/rescan', { method: 'POST' });
  },

  async uploadLogFile(file: File): Promise<{
    status: string;
    message: string;
    file: LogFileInfo;
    total_records: number;
    total_files: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithFallback('/upload', {
      method: 'POST',
      body: formData
    });
  },

  getExportCsvUrl(filters: Partial<AnalysisFilterState>): string {
    const params = new URLSearchParams();
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    if (filters.station) params.append('station', filters.station);
    if (filters.pallet_id) params.append('pallet_id', filters.pallet_id);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.failure_reason && filters.failure_reason !== 'ALL') {
      params.append('failure_reason', filters.failure_reason);
    }
    if (filters.cycle_id) params.append('cycle_id', filters.cycle_id);
    if (filters.is_retry === 'INITIAL') params.append('is_retry', 'false');
    if (filters.is_retry === 'RETRY') params.append('is_retry', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return `${API_BASE}/export/csv${query}`;
  },

  async downloadExportCsv(filters: Partial<AnalysisFilterState>): Promise<void> {
    const params = new URLSearchParams();
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    if (filters.station) params.append('station', filters.station);
    if (filters.pallet_id) params.append('pallet_id', filters.pallet_id);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.failure_reason && filters.failure_reason !== 'ALL') {
      params.append('failure_reason', filters.failure_reason);
    }
    if (filters.cycle_id) params.append('cycle_id', filters.cycle_id);
    if (filters.is_retry === 'INITIAL') params.append('is_retry', 'false');
    if (filters.is_retry === 'RETRY') params.append('is_retry', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/export/csv${query}`);
      if (!res.ok) throw new Error();
    } catch {
      res = await fetch(`${DIRECT_API_BASE}/export/csv${query}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handshake_cycle_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async downloadRawLogs(id: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/handshake/${encodeURIComponent(id)}/raw-logs`);
      if (!res.ok) throw new Error();
    } catch {
      res = await fetch(`${DIRECT_API_BASE}/handshake/${encodeURIComponent(id)}/raw-logs`);
    }
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}_telemetry.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async getStations(): Promise<{ stations: StationInfo[]; total_stations: number }> {
    return fetchWithFallback<{ stations: StationInfo[]; total_stations: number }>('/stations');
  },

  async getStationLogs(
    filters: Partial<StationLogFilterState>,
    limit: number = 500,
    offset: number = 0
  ): Promise<{
    total: number;
    offset: number;
    limit: number;
    station: string | null;
    events: StationTagEvent[];
  }> {
    const params = new URLSearchParams();
    if (filters.station && filters.station !== 'ALL') params.append('station', filters.station);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);
    if (filters.tag_filter) params.append('tag_filter', filters.tag_filter);
    if (filters.direction && filters.direction !== 'ALL') params.append('direction', filters.direction);
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    return fetchWithFallback(`/station-logs?${params.toString()}`);
  },

  async downloadStationLogsCsv(filters: Partial<StationLogFilterState>): Promise<void> {
    const params = new URLSearchParams();
    if (filters.station && filters.station !== 'ALL') params.append('station', filters.station);
    if (filters.from_time) params.append('from_time', filters.from_time);
    if (filters.to_time) params.append('to_time', filters.to_time);
    if (filters.tag_filter) params.append('tag_filter', filters.tag_filter);
    if (filters.direction && filters.direction !== 'ALL') params.append('direction', filters.direction);
    if (filters.file && filters.file !== 'all') params.append('file', filters.file);
    const query = params.toString() ? `?${params.toString()}` : '';

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/station-logs/export${query}`);
      if (!res.ok) throw new Error();
    } catch {
      res = await fetch(`${DIRECT_API_BASE}/station-logs/export${query}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `station_${filters.station || 'all'}_tags_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};

