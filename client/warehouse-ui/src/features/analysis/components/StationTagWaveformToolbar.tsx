import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Activity, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Check, 
  Clock 
} from 'lucide-react';
import { TagTrackData } from './StationTagWaveformTypes';

interface StationTagWaveformToolbarProps {
  activeTracksCount: number;
  totalEventsCount: number;
  totalDurationMs: number;
  deltaInfo: { ms: number; sec: string; isForward: boolean } | null;
  onClearMarkers?: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isMaximized: boolean;
  onToggleMaximize?: () => void;
  allTracks: TagTrackData[];
  visibleTags: Set<string>;
  onToggleTag: (tagName: string) => void;
  onSelectAllTags: () => void;
}

export const StationTagWaveformToolbar: React.FC<StationTagWaveformToolbarProps> = ({
  activeTracksCount,
  totalEventsCount,
  totalDurationMs,
  deltaInfo,
  onClearMarkers,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isMaximized,
  onToggleMaximize,
  allTracks,
  visibleTags,
  onToggleTag,
  onSelectAllTags,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Title & Track Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8'
          }}>
            <Activity size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc' }}>
                Multi-Signal Waveform Analyzer
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                fontWeight: 600
              }}>
                {activeTracksCount} Active Tracks
              </span>
              {totalEventsCount > 0 && (
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  ({totalEventsCount} events over {(totalDurationMs / 1000).toFixed(2)}s)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Marker Delta Badge (if markers placed) */}
        {deltaInfo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#67e8f9',
            fontSize: '12px',
            fontWeight: 600
          }}>
            <Clock size={13} color="#22d3ee" />
            <span>ΔT (Point A → B): <strong>{deltaInfo.ms.toLocaleString()} ms</strong> ({deltaInfo.sec}s)</span>
            {onClearMarkers && (
              <button
                type="button"
                onClick={onClearMarkers}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '11px',
                  marginLeft: '4px',
                  textDecoration: 'underline'
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Right: Zoom & Layout Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1e293b',
            borderRadius: '6px',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={onZoomIn}
              disabled={zoom >= 16.0}
              title="Zoom In Timeline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '30px',
                border: 'none',
                background: 'transparent',
                color: zoom >= 16.0 ? '#475569' : '#cbd5e1',
                borderRadius: '4px',
                cursor: zoom >= 16.0 ? 'default' : 'pointer'
              }}
            >
              <ZoomIn size={14} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', padding: '0 6px', minWidth: '34px', textAlign: 'center' }}>
              {zoom.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={onZoomOut}
              disabled={zoom <= 1.0}
              title="Zoom Out Timeline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '30px',
                border: 'none',
                background: 'transparent',
                color: zoom <= 1.0 ? '#475569' : '#cbd5e1',
                borderRadius: '4px',
                cursor: zoom <= 1.0 ? 'default' : 'pointer'
              }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              title="Reset Zoom (1.0x)"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restore View Size' : 'Maximize Waveform Timeline'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: isMaximized ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                border: '1px solid #334155',
                color: isMaximized ? '#38bdf8' : '#e2e8f0',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                height: '32px'
              }}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isMaximized ? 'Restore' : 'Maximize'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Track Selector Filter Ribbon */}
      {allTracks.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          backgroundColor: '#0c1322',
          borderBottom: '1px solid #1e293b',
          overflowX: 'auto',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '0.05em',
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Layers size={12} /> Tracks:
          </span>

          <button
            type="button"
            onClick={onSelectAllTags}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            All
          </button>

          {allTracks.map(track => {
            const isVisible = visibleTags.has(track.tagName);
            return (
              <button
                key={track.tagName}
                type="button"
                onClick={() => onToggleTag(track.tagName)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isVisible ? `1px solid ${track.color}` : '1px solid #334155',
                  backgroundColor: isVisible ? `${track.color}22` : '#111827',
                  color: isVisible ? '#f8fafc' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isVisible ? track.color : '#475569'
                }} />
                <span>{track.tagName}</span>
                <span style={{ fontSize: '9.5px', opacity: 0.7 }}>
                  ({track.events.length})
                </span>
                {isVisible && <Check size={10} color={track.color} />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
