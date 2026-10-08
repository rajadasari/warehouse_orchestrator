export interface HandshakeEvent {
  ts: string;
  direction: 'READ' | 'WRITE' | 'SYSTEM';
  tag: string;
  name: string;
  val: string;
}

export interface HandshakeRecord {
  id: string;
  cycle_id: string;
  attempt_number: number;
  is_retry: boolean;
  file_name: string;
  station: string;
  substation: string;
  pallet_id: string;
  start_time: string;
  end_time: string;
  cycle_start_time?: string | null;
  cycle_end_time?: string | null;
  arrival_time: string | null;
  status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  failure_reason: string | null;
  destination: string | null;
  dwell_duration_ms?: number | null;
  protocol_duration_ms: number | null;
  discharge_duration_ms?: number | null;
  cycle_duration_ms: number | null;
  event_count?: number;
  events?: HandshakeEvent[];
  cycle_attempts?: HandshakeRecord[];
}

export interface HandshakeSummary {
  total_handshakes: number;
  total_success: number;
  total_failed: number;
  total_retries: number;
  success_rate_pct: number;
  avg_dwell_duration_ms?: number;
  avg_protocol_duration_ms: number;
  avg_discharge_duration_ms?: number;
  avg_cycle_duration_ms: number;
  failure_reasons_breakdown: Record<string, number>;
  busiest_stations: Array<{ station: string; count: number }>;
  slowest_stations: Array<{ station: string; avg_ms: number; samples: number }>;
  min_timestamp: string | null;
  max_timestamp: string | null;
}

export interface StationMetric {
  station: string;
  total_cycles: number;
  success_count: number;
  failure_count: number;
  success_rate_pct: number;
  avg_protocol_ms: number;
  min_protocol_ms: number;
  max_protocol_ms: number;
  p95_protocol_ms: number;
  avg_cycle_ms: number;
  min_cycle_ms: number;
  max_cycle_ms: number;
  p95_cycle_ms: number;
  failure_breakdown: Record<string, number>;
}

export interface LogFileInfo {
  name: string;
  size_bytes: number;
  modified_time: string;
  handshake_count: number;
}

export interface StationInfo {
  station: string;
  total_events: number;
  unique_tags: number;
  min_timestamp: string;
  max_timestamp: string;
}

export interface StationTagEvent {
  id: string;
  timestamp: string;
  station: string;
  substation: string;
  tag_name: string;
  full_tag: string;
  direction: 'READ' | 'WRITE';
  value: string;
  file: string;
  line_num: number;
}

export interface AnalysisFilterState {
  file: string;
  station: string;
  pallet_id: string;
  from_time: string;
  to_time: string;
  status: 'ALL' | 'SUCCESS' | 'FAILED';
  failure_reason: string;
  is_retry?: 'ALL' | 'INITIAL' | 'RETRY';
  cycle_id?: string;
}

export interface StationLogFilterState {
  station: string;
  from_time: string;
  to_time: string;
  tag_filter: string;
  direction: 'ALL' | 'READ' | 'WRITE';
  file: string;
}


