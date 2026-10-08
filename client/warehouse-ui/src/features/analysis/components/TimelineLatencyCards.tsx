import React from 'react';
import { HandshakeRecord } from '../types';
import { formatSeconds3Dec } from './timelineUtils';

interface TimelineLatencyCardsProps {
  record: HandshakeRecord;
}

export const TimelineLatencyCards: React.FC<TimelineLatencyCardsProps> = ({ record }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '8px'
    }}>
      <div style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #1e3a8a' }}>
        <div style={{ fontSize: '10px', color: '#93c5fd', fontWeight: 600 }}>DWELL / DOCK</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
          {formatSeconds3Dec(record.dwell_duration_ms ?? 0)}
        </div>
        <div style={{ fontSize: '9px', color: '#64748b' }}>
          {(record.dwell_duration_ms ?? 0).toLocaleString()} ms
        </div>
      </div>

      <div style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #78350f' }}>
        <div style={{ fontSize: '10px', color: '#fde68a', fontWeight: 600 }}>HANDSHAKE PROTOCOL</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#facc15' }}>
          {formatSeconds3Dec(record.protocol_duration_ms ?? 0)}
        </div>
        <div style={{ fontSize: '9px', color: '#64748b' }}>
          {(record.protocol_duration_ms ?? 0).toLocaleString()} ms
        </div>
      </div>

      <div style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #4c1d95' }}>
        <div style={{ fontSize: '10px', color: '#c4b5fd', fontWeight: 600 }}>DISCHARGE TIME</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#a78bfa' }}>
          {formatSeconds3Dec(record.discharge_duration_ms ?? 0)}
        </div>
        <div style={{ fontSize: '9px', color: '#64748b' }}>
          {(record.discharge_duration_ms ?? 0).toLocaleString()} ms
        </div>
      </div>

      <div style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #0369a1' }}>
        <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600 }}>TOTAL CYCLE</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
          {formatSeconds3Dec(record.cycle_duration_ms ?? 0)}
        </div>
        <div style={{ fontSize: '9px', color: '#64748b' }}>
          {(record.cycle_duration_ms ?? 0).toLocaleString()} ms • 0.001s res
        </div>
      </div>
    </div>
  );
};
