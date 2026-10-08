import React, { useRef, useEffect, useState } from 'react';
import { Search, ArrowDownRight, ArrowUpRight, Download, Terminal } from 'lucide-react';
import { HandshakeEvent } from '../types';
import { analysisService } from '../analysisService';

interface SynchronizedLogViewerProps {
  events: HandshakeEvent[];
  activeEventIndex: number | null;
  onSelectEventIndex: (index: number) => void;
  recordId: string;
}

export const SynchronizedLogViewer: React.FC<SynchronizedLogViewerProps> = ({
  events,
  activeEventIndex,
  onSelectEventIndex,
  recordId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(false);
  const rowRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the corresponding event row into view when hovered/selected from waveform
  useEffect(() => {
    if (activeEventIndex != null && rowRefs.current[activeEventIndex]) {
      const el = rowRefs.current[activeEventIndex];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeEventIndex]);

  const handleDownloadLogs = async () => {
    setDownloading(true);
    try {
      await analysisService.downloadRawLogs(recordId);
    } catch (err) {
      console.error('Failed to download raw logs:', err);
    } finally {
      setDownloading(false);
    }
  };

  const filteredEvents = events
    .map((evt, idx) => ({ ...evt, originalIndex: idx }))
    .filter(evt => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        evt.tag.toLowerCase().includes(q) ||
        evt.val.toLowerCase().includes(q) ||
        evt.name.toLowerCase().includes(q) ||
        evt.ts.toLowerCase().includes(q)
      );
    });

  const baseTime = events.length > 0 ? new Date(events[0].ts.replace(' ', 'T')).getTime() : 0;

  return (
    <div style={{
      backgroundColor: '#090d16',
      borderRadius: '10px',
      border: '1px solid #1e293b',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      flex: 1,
      minHeight: '260px',
      maxHeight: '420px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Header and Filter Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
            Synchronized Raw Telemetry Stream
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            backgroundColor: '#1e293b',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {events.length} events
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '180px' }}>
            <Search 
              size={13} 
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }} 
            />
            <input
              type="text"
              placeholder="Search tag or val..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                minHeight: '36px',
                paddingLeft: '30px',
                paddingRight: '10px',
                fontSize: '11.5px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Download Raw Logs Button */}
          <button
            type="button"
            onClick={handleDownloadLogs}
            disabled={downloading}
            title="Download telemetry slice as .log file"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} />
            <span>{downloading ? 'Downloading...' : 'Export .log'}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Log List View */}
      <div 
        ref={listContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingRight: '4px'
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            No telemetry events found matching current criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isSelected = activeEventIndex === evt.originalIndex;
            const isWrite = evt.direction === 'WRITE';
            
            const evtTime = new Date(evt.ts.replace(' ', 'T')).getTime();
            const offsetMs = !isNaN(evtTime) && baseTime > 0 ? evtTime - baseTime : 0;
            const offsetStr = offsetMs >= 0 ? `+${(offsetMs / 1000).toFixed(3)}s` : '';

            return (
              <div
                key={evt.originalIndex}
                ref={(el) => { rowRefs.current[evt.originalIndex] = el; }}
                onClick={() => onSelectEventIndex(evt.originalIndex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.5)',
                  border: isSelected ? '1.5px solid #38bdf8' : '1px solid #1e293b',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                  minHeight: '34px'
                }}
              >
                {/* Left: Index + Direction Badge + Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: isSelected ? '#38bdf8' : '#64748b',
                    fontWeight: 700,
                    width: '28px'
                  }}>
                    #{String(evt.originalIndex + 1).padStart(2, '0')}
                  </span>

                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: isWrite ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: isWrite ? '#38bdf8' : '#10b981'
                  }}>
                    {isWrite ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {isWrite ? 'WCS → PLC' : 'PLC → WCS'}
                  </span>

                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#cbd5e1' }}>
                    {evt.ts.split(' ')[1] || evt.ts}
                  </span>

                  {offsetStr && (
                    <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                      {offsetStr}
                    </span>
                  )}
                </div>

                {/* Center: Tag name and full path */}
                <div style={{ flex: 1, padding: '0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {evt.tag}
                  </span>
                </div>

                {/* Right: Value Pill */}
                <div style={{ minWidth: '90px', textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#1e293b',
                    color: evt.val === '1' || evt.val === '0' 
                      ? '#facc15' 
                      : (evt.val.startsWith('SP') || evt.val.startsWith('TP') ? '#38bdf8' : '#f8fafc')
                  }}>
                    {evt.val || '<empty>'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
