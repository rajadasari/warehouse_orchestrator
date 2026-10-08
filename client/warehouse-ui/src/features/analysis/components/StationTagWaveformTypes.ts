import { StationTagEvent } from '../types';

export interface StationTagWaveformViewerProps {
  events: StationTagEvent[];
  markerA: StationTagEvent | null;
  markerB: StationTagEvent | null;
  onSetMarkerA: (evt: StationTagEvent) => void;
  onSetMarkerB: (evt: StationTagEvent) => void;
  onClearMarkers?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  loading?: boolean;
}

export interface TagTrackData {
  tagName: string;
  substation: string;
  direction: 'READ' | 'WRITE';
  events: StationTagEvent[];
  isBoolean: boolean;
  color: string;
}

export const TRACK_COLORS = [
  '#38bdf8', // Sky Cyan
  '#34d399', // Emerald Green
  '#fbbf24', // Amber
  '#a78bfa', // Purple
  '#f472b6', // Pink
  '#60a5fa', // Blue
  '#f87171', // Red
  '#2dd4bf', // Teal
  '#fb923c', // Orange
];
