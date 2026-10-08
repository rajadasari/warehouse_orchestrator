import { useEffect, useRef } from 'react';
import { DeviceTag } from '../types';
import { networkService } from '../networkService';

interface UseLiveTelemetryOptions {
  channelId: string;
  isOnline: boolean;
  visibleTags: DeviceTag[];
  expandedTags: Set<string>;
  childrenByParentNodeId: Map<string, DeviceTag[]>;
  setMonitoredTags: React.Dispatch<React.SetStateAction<DeviceTag[]>>;
  setBrowsedTags: React.Dispatch<React.SetStateAction<DeviceTag[]>>;
  setIsChannelOnline: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Custom hook managing real-time tag telemetry:
 * 1. SSE passive push subscription for all active monitored tags
 * 2. Cyclic batch polling (2500ms) for visible tags in active folder/grid
 */
export const useLiveTelemetry = ({
  channelId,
  isOnline,
  visibleTags,
  expandedTags,
  childrenByParentNodeId,
  setMonitoredTags,
  setBrowsedTags,
  setIsChannelOnline
}: UseLiveTelemetryOptions): void => {
  // Keep stable refs to avoid unnecessary re-subscriptions
  const visibleTagsRef = useRef(visibleTags);
  visibleTagsRef.current = visibleTags;

  const expandedTagsRef = useRef(expandedTags);
  expandedTagsRef.current = expandedTags;

  const childMapRef = useRef(childrenByParentNodeId);
  childMapRef.current = childrenByParentNodeId;

  // 1. Real-Time Live Subscription Stream (Passive SSE Push)
  useEffect(() => {
    if (!channelId) return;

    const sse = networkService.createTelemetryStream(channelId, (update) => {
      const updateTagInList = (t: DeviceTag): DeviceTag => {
        if (t.nodeId === update.nodeId) {
          return {
            ...t,
            value: update.value,
            quality: update.quality,
            timestamp: update.timestamp
          };
        }
        return t;
      };

      setMonitoredTags(prev => prev.map(updateTagInList));
      setBrowsedTags(prev => prev.map(updateTagInList));
      setIsChannelOnline(true);
    });

    return () => {
      sse.close();
    };
  }, [channelId, setMonitoredTags, setBrowsedTags, setIsChannelOnline]);

  // 2. Cyclic Live Polling for Visible / Expanded Tags on Screen
  useEffect(() => {
    if (!channelId || !isOnline) return;

    let isCancelled = false;

    const pollVisibleTags = async () => {
      const currentVisible = visibleTagsRef.current;
      if (currentVisible.length === 0) return;

      const expanded = expandedTagsRef.current;
      const childMap = childMapRef.current;

      const targetNodeIds: string[] = [];
      for (const tag of currentVisible.slice(0, 80)) {
        if (!tag.isUdt) targetNodeIds.push(tag.nodeId);
        if (expanded.has(tag.nodeId)) {
          const children = childMap.get(tag.nodeId) ?? [];
          for (const c of children) {
            targetNodeIds.push(c.nodeId);
          }
        }
      }

      if (targetNodeIds.length === 0) return;

      const batch = Array.from(new Set(targetNodeIds)).slice(0, 100);
      try {
        const liveUpdates = await networkService.readLiveValues(channelId, batch);
        if (isCancelled || !liveUpdates || liveUpdates.length === 0) return;

        const updateMap = new Map(liveUpdates.map(u => [u.nodeId, u]));
        const applyUpdates = (t: DeviceTag): DeviceTag => {
          const update = updateMap.get(t.nodeId);
          if (update && update.value !== '--') {
            return {
              ...t,
              value: update.value,
              quality: update.quality,
              timestamp: update.timestamp
            };
          }
          return t;
        };

        setMonitoredTags(prev => prev.map(applyUpdates));
        setBrowsedTags(prev => prev.map(applyUpdates));
      } catch {
        // Silently ignore background polling errors
      }
    };

    pollVisibleTags();
    const interval = setInterval(pollVisibleTags, 2500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [channelId, isOnline, setMonitoredTags, setBrowsedTags]);
};
