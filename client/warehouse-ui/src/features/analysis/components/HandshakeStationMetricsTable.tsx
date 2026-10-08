import React, { useState } from 'react';
import { ArrowUpDown, Zap, Clock, Search } from 'lucide-react';
import { StationMetric } from '../types';

interface HandshakeStationMetricsTableProps {
  metrics: StationMetric[];
  loading: boolean;
  onSelectStation: (station: string) => void;
}

type SortField = 'station' | 'total_cycles' | 'success_rate_pct' | 'avg_protocol_ms' | 'p95_protocol_ms' | 'avg_cycle_ms' | 'failure_count';

export const HandshakeStationMetricsTable: React.FC<HandshakeStationMetricsTableProps> = ({
  metrics,
  loading,
  onSelectStation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_cycles');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredMetrics = metrics
    .filter(m => m.station.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') {
        return sortAsc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  const getHealthBadge = (rate: number, avgProtoMs: number) => {
    if (rate >= 90 && avgProtoMs < 4000) {
      return { label: 'Optimal', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
    if (rate >= 70 && avgProtoMs < 8000) {
      return { label: 'Nominal', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    }
    if (avgProtoMs > 10000) {
      return { label: 'Slow Protocol', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    }
    return { label: 'High Failures', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-card, #0f172a)',
      borderRadius: '8px',
      border: '1px solid var(--border-default, #334155)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Search */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-default, #334155)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-header, #1e293b)'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
          STATION HANDSHAKE DURATION & PERFORMANCE BENCHMARK ({filteredMetrics.length} stations)
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary, #64748b)' }} />
          <input
            type="text"
            placeholder="Search station..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-input, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-default, #334155)',
              borderRadius: '6px',
              padding: '6px 12px 6px 32px',
              fontSize: '12px',
              outline: 'none',
              minHeight: '38px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto', minHeight: '320px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-default, #334155)',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              color: 'var(--text-secondary, #94a3b8)',
              fontWeight: 600,
              fontSize: '11px',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('station')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Station</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('total_cycles')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Total Cycles</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('success_rate_pct')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Success Rate</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('avg_protocol_ms')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Avg Protocol Time</span>
                  <Zap size={12} color="#eab308" />
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('p95_protocol_ms')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>P95 Protocol Time</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('avg_cycle_ms')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Avg Full Cycle</span>
                  <Clock size={12} color="#06b6d4" />
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('failure_count')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Failures</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px' }}>Health Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                  Calculating station benchmark metrics...
                </td>
              </tr>
            ) : filteredMetrics.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                  No station metrics found.
                </td>
              </tr>
            ) : (
              filteredMetrics.map(m => {
                const health = getHealthBadge(m.success_rate_pct, m.avg_protocol_ms);
                const avgProtoSec = (m.avg_protocol_ms / 1000).toFixed(2);
                const p95ProtoSec = (m.p95_protocol_ms / 1000).toFixed(2);
                const avgCycleSec = (m.avg_cycle_ms / 1000).toFixed(1);

                return (
                  <tr
                    key={m.station}
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #1e293b)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Station Name */}
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                      {m.station}
                    </td>

                    {/* Total Cycles */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary, #f8fafc)' }}>
                      {m.total_cycles.toLocaleString()}
                    </td>

                    {/* Success Rate */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: m.success_rate_pct >= 80 ? '#10b981' : m.success_rate_pct >= 50 ? '#f59e0b' : '#ef4444'
                        }}>
                          {m.success_rate_pct}%
                        </span>
                        <div style={{
                          flex: 1,
                          maxWidth: '60px',
                          height: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${m.success_rate_pct}%`,
                            height: '100%',
                            backgroundColor: m.success_rate_pct >= 80 ? '#10b981' : m.success_rate_pct >= 50 ? '#f59e0b' : '#ef4444'
                          }} />
                        </div>
                      </div>
                    </td>

                    {/* Avg Protocol Duration */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: m.avg_protocol_ms > 5000 ? '#f59e0b' : '#eab308' }}>
                        {avgProtoSec}s
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', marginLeft: '4px' }}>
                        ({m.avg_protocol_ms} ms)
                      </span>
                    </td>

                    {/* P95 Protocol Duration */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #94a3b8)' }}>
                      {p95ProtoSec}s
                    </td>

                    {/* Avg Full Cycle */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary, #f8fafc)' }}>
                      {m.avg_cycle_ms > 0 ? `${avgCycleSec}s` : '-'}
                    </td>

                    {/* Failure Count */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontWeight: 600,
                        color: m.failure_count > 0 ? '#ef4444' : 'var(--text-secondary, #94a3b8)'
                      }}>
                        {m.failure_count}
                      </span>
                    </td>

                    {/* Health Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        color: health.color,
                        backgroundColor: health.bg
                      }}>
                        {health.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => onSelectStation(m.station)}
                        style={{
                          minHeight: '48px',
                          padding: '0 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border-default, #334155)',
                          color: 'var(--color-primary-400, #38bdf8)',
                          cursor: 'pointer'
                        }}
                      >
                        Filter Transactions
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
