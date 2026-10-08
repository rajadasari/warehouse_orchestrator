import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Gauge
} from 'lucide-react';
import { formatSeconds3Dec } from './timelineUtils';

interface TimelineToolbarProps {
  zoom: number;
  maxZoom: number;
  panRatio: number;
  viewSpanMs: number;
  totalCycleSpanMs: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSet: (z: number) => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onPanSet?: (p: number) => void;
  onZoomHandshake?: () => void;
  onReset: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  zoom,
  maxZoom,
  panRatio,
  viewSpanMs,
  totalCycleSpanMs,
  onZoomIn,
  onZoomOut,
  onZoomSet,
  onPanLeft,
  onPanRight,
  onPanSet,
  onZoomHandshake,
  onReset
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px',
      borderBottom: '1px solid #1e293b',
      paddingBottom: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
          Telemetry Waveform Timeline
        </span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          backgroundColor: '#1e293b',
          color: '#38bdf8',
          padding: '2px 6px',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Gauge size={12} />
          Zoom: {zoom.toFixed(1)}x
        </span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          Res: 0.001s (1ms)
        </span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          ({formatSeconds3Dec(viewSpanMs)} window / {formatSeconds3Dec(totalCycleSpanMs)} total)
        </span>
      </div>

      {/* Zoom & Navigation Actions (Minimum 48px touch targets) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Quick 1x preset */}
        <button
          type="button"
          onClick={() => onZoomSet(1.0)}
          title="Reset Zoom to 1x Full Fit"
          style={{
            minHeight: '48px',
            padding: '0 10px',
            borderRadius: '6px',
            backgroundColor: zoom <= 1.05 ? '#0284c7' : '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          1x Fit
        </button>

        {/* Quick Max (0.001s) preset */}
        <button
          type="button"
          onClick={() => onZoomSet(maxZoom)}
          title="Zoom to 0.001 sec (1ms) Maximum Resolution"
          style={{
            minHeight: '48px',
            padding: '0 10px',
            borderRadius: '6px',
            backgroundColor: zoom >= maxZoom * 0.95 ? '#0284c7' : '#1e293b',
            color: '#38bdf8',
            border: '1px solid #334155',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          0.001s Zoom
        </button>

        {/* Handshake Focus preset */}
        {onZoomHandshake && (
          <button
            type="button"
            onClick={onZoomHandshake}
            title="Focus zoom directly on Handshake Window (PLC Req -> mWCS Dest)"
            style={{
              minHeight: '48px',
              padding: '0 10px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            HS Focus
          </button>
        )}

        {/* Horizontal Scrub Slider for direct panning */}
        {zoom > 1.05 && onPanSet && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 8px',
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            minHeight: '48px'
          }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              Pan: {Math.round(panRatio * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1000"
              value={Math.round(panRatio * 1000)}
              onChange={(e) => onPanSet(Number(e.target.value) / 1000)}
              title="Drag horizontally to scrub across transaction timeline"
              style={{
                width: '100px',
                height: '6px',
                accentColor: '#38bdf8',
                cursor: 'pointer'
              }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={onPanLeft}
          disabled={panRatio <= 0}
          title="Pan Left along timeline"
          style={{
            minHeight: '48px',
            minWidth: '48px',
            padding: '0 8px',
            borderRadius: '6px',
            backgroundColor: '#1e293b',
            color: panRatio <= 0 ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
            cursor: panRatio <= 0 ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In time axis"
          style={{
            minHeight: '48px',
            minWidth: '48px',
            padding: '0 8px',
            borderRadius: '6px',
            backgroundColor: '#1e293b',
            color: '#38bdf8',
            border: '1px solid #334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ZoomIn size={16} />
        </button>

        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoom <= 1.05}
          title="Zoom Out time axis"
          style={{
            minHeight: '48px',
            minWidth: '48px',
            padding: '0 8px',
            borderRadius: '6px',
            backgroundColor: '#1e293b',
            color: zoom <= 1.05 ? '#475569' : '#38bdf8',
            border: '1px solid #334155',
            cursor: zoom <= 1.05 ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ZoomOut size={16} />
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset Zoom & Pan"
          style={{
            minHeight: '48px',
            minWidth: '48px',
            padding: '0 10px',
            borderRadius: '6px',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          onClick={onPanRight}
          disabled={panRatio >= 1}
          title="Pan Right along timeline"
          style={{
            minHeight: '48px',
            minWidth: '48px',
            padding: '0 8px',
            borderRadius: '6px',
            backgroundColor: '#1e293b',
            color: panRatio >= 1 ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
            cursor: panRatio >= 1 ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
