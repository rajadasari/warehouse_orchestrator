package com.company.warehouse.wes.business.network;

import com.company.warehouse.wes.data.entity.NetworkDeviceChannelEntity;
import com.company.warehouse.wes.data.entity.NetworkDeviceTagEntity;
import com.company.warehouse.wes.data.entity.NetworkTagAcquisitionConfigEntity;
import com.company.warehouse.wes.data.repository.NetworkDeviceChannelRepository;
import com.company.warehouse.wes.data.repository.NetworkDeviceTagRepository;
import com.company.warehouse.wes.data.repository.NetworkTagAcquisitionConfigRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service delegate for industrial network channels, tag synchronization, and live telemetry caching.
 * Keeps NetworkChannelController concise and ensures clean separation of concerns.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NetworkChannelService {

    private final NetworkDeviceChannelRepository channelRepository;
    private final NetworkDeviceTagRepository tagRepository;
    private final NetworkTagAcquisitionConfigRepository acquisitionConfigRepository;
    private final LiveOpcUaChannelDriver liveOpcUaDriver;
    private final ObjectMapper objectMapper;

    private final Map<String, Map<String, Map<String, Object>>> latestTelemetryCache = new ConcurrentHashMap<>();

    public Optional<NetworkDeviceChannelEntity> resolveChannel(String channelId) {
        try {
            UUID uuid = UUID.fromString(channelId);
            return channelRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            return channelRepository.findByChannelCode(channelId);
        }
    }

    public void putTelemetryCache(String channelId, String nodeId, Map<String, Object> payload) {
        latestTelemetryCache.computeIfAbsent(channelId, k -> new ConcurrentHashMap<>()).put(nodeId, payload);
    }

    public List<Map<String, Object>> getLatestValuesForChannel(String channelId) {
        Map<String, Map<String, Object>> chanMap = latestTelemetryCache.get(channelId);
        if (chanMap == null || chanMap.isEmpty()) {
            return Collections.emptyList();
        }
        return new ArrayList<>(chanMap.values());
    }

    /**
     * Retrieves tags for a channel and immediately populates them with live values if the channel is reachable.
     */
    @Transactional
    public List<Map<String, Object>> getChannelTagsWithLiveValues(NetworkDeviceChannelEntity channel) {
        List<NetworkDeviceTagEntity> tags = tagRepository.findByChannelId(channel.getId());
        if (tags.isEmpty()) {
            boolean reachable = liveOpcUaDriver.isChannelReachable(channel);
            String newStatus = reachable ? "ONLINE" : "DISCONNECTED";
            if (!newStatus.equals(channel.getStatus())) {
                channel.setStatus(newStatus);
                channelRepository.save(channel);
            }
            return Collections.emptyList();
        }

        List<UUID> savedTagIds = tags.stream().map(NetworkDeviceTagEntity::getId).toList();
        Map<UUID, NetworkTagAcquisitionConfigEntity> configMap = new HashMap<>();
        List<NetworkTagAcquisitionConfigEntity> configs = acquisitionConfigRepository.findByTagIdIn(savedTagIds);
        for (NetworkTagAcquisitionConfigEntity c : configs) {
            configMap.put(c.getTagId(), c);
        }

        boolean reachable = "OPC_UA".equalsIgnoreCase(channel.getProtocol()) && liveOpcUaDriver.isChannelReachable(channel);
        String channelStatus = reachable ? "ONLINE" : (channel.getStatus() != null ? channel.getStatus() : "DISCONNECTED");
        if (!channelStatus.equals(channel.getStatus())) {
            channel.setStatus(channelStatus);
            channelRepository.save(channel);
        }

        Set<String> subscriptionNodeIds = new HashSet<>();
        List<String> nodeIdsToRead = tags.stream().map(NetworkDeviceTagEntity::getNodeId).toList();

        Map<String, DataValue> liveValues = Collections.emptyMap();
        if (reachable) {
            try {
                liveValues = liveOpcUaDriver.readLiveValues(channel, nodeIdsToRead);
            } catch (Exception ex) {
                log.warn("Failed to batch read live tag values for channel '{}': {}", channel.getChannelCode(), ex.getMessage());
            }
        }

        String chIdStr = channel.getId().toString();
        List<NetworkDeviceTagEntity> modifiedTags = new ArrayList<>();

        for (NetworkDeviceTagEntity t : tags) {
            NetworkTagAcquisitionConfigEntity cfg = configMap.get(t.getId());
            String acqMethod = cfg != null && cfg.getAcquisitionMethod() != null ? cfg.getAcquisitionMethod() : "SUBSCRIPTION";

            if (reachable && !liveValues.isEmpty()) {
                DataValue dv = liveValues.get(t.getNodeId());
                if (dv != null && dv.getStatusCode() != null) {
                    if (dv.getStatusCode().isGood()) {
                        t.setQuality("GOOD (0x00000000)");
                        if (dv.getValue() != null && dv.getValue().getValue() != null) {
                            Object cleanVal = OpcUaValueHelper.sanitizeAndExtractValue(dv.getValue().getValue());
                            String strVal = formatValueString(cleanVal);
                            t.setCurrentValue(strVal);

                            Map<String, Object> payload = new HashMap<>();
                            payload.put("channelId", chIdStr);
                            payload.put("nodeId", t.getNodeId());
                            payload.put("value", cleanVal != null ? cleanVal : "");
                            payload.put("quality", "GOOD (0x00000000)");
                            payload.put("timestamp", dv.getSourceTime() != null && dv.getSourceTime().getJavaInstant() != null
                                    ? dv.getSourceTime().getJavaInstant().toString()
                                    : Instant.now().toString());
                            putTelemetryCache(chIdStr, t.getNodeId(), payload);
                        }
                    } else if (dv.getStatusCode().getValue() == 0x80340000L || dv.getStatusCode().getValue() == 0x80330000L) {
                        t.setQuality("MISSING (0x80330000 - Bad_NodeIdUnknown)");
                    } else {
                        t.setQuality("BAD (" + dv.getStatusCode() + ")");
                    }
                    t.setLastUpdated(Instant.now());
                    modifiedTags.add(t);
                }
            }

            String tagQuality = t.getQuality() != null ? t.getQuality() : "GOOD (0x00000000)";
            if ("SUBSCRIPTION".equalsIgnoreCase(acqMethod) && reachable && !tagQuality.startsWith("MISSING")) {
                subscriptionNodeIds.add(t.getNodeId());
            }
        }

        if (!modifiedTags.isEmpty()) {
            tagRepository.saveAll(modifiedTags);
        }

        if (reachable && !subscriptionNodeIds.isEmpty()) {
            try {
                liveOpcUaDriver.updateSubscriptionNodes(channel, subscriptionNodeIds);
            } catch (Exception ex) {
                log.warn("Failed to update subscriptions for channel '{}': {}", channel.getChannelCode(), ex.getMessage());
            }
        }

        List<Map<String, Object>> result = new ArrayList<>(tags.size());
        for (NetworkDeviceTagEntity t : tags) {
            NetworkTagAcquisitionConfigEntity cfg = configMap.get(t.getId());
            result.add(tagEntityToMap(t, cfg, true, t.getId().toString()));
        }
        return result;
    }

    /**
     * Fallback retrieval of tags directly from PostgreSQL without attempting live driver calls.
     * Guarantees the frontend never receives a 500 when hardware is offline or socket timeouts occur.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getChannelTagsFallback(NetworkDeviceChannelEntity channel) {
        List<NetworkDeviceTagEntity> tags = tagRepository.findByChannelId(channel.getId());
        if (tags.isEmpty()) {
            return Collections.emptyList();
        }
        List<UUID> savedTagIds = tags.stream().map(NetworkDeviceTagEntity::getId).toList();
        Map<UUID, NetworkTagAcquisitionConfigEntity> configMap = new HashMap<>();
        List<NetworkTagAcquisitionConfigEntity> configs = acquisitionConfigRepository.findByTagIdIn(savedTagIds);
        for (NetworkTagAcquisitionConfigEntity c : configs) {
            configMap.put(c.getTagId(), c);
        }
        List<Map<String, Object>> result = new ArrayList<>(tags.size());
        for (NetworkDeviceTagEntity t : tags) {
            NetworkTagAcquisitionConfigEntity cfg = configMap.get(t.getId());
            result.add(tagEntityToMap(t, cfg, true, t.getId().toString()));
        }
        return result;
    }

    /**
     * Batch-reads live values from PLC, persists them, updates cache, and returns mapped tags.
     */
    @Transactional
    public List<Map<String, Object>> syncTagValues(NetworkDeviceChannelEntity channel) {
        List<NetworkDeviceTagEntity> savedTags = tagRepository.findByChannelId(channel.getId());
        if (savedTags.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> savedTagIds = savedTags.stream().map(NetworkDeviceTagEntity::getId).toList();
        Map<UUID, NetworkTagAcquisitionConfigEntity> configMap = new HashMap<>();
        List<NetworkTagAcquisitionConfigEntity> configs = acquisitionConfigRepository.findByTagIdIn(savedTagIds);
        for (NetworkTagAcquisitionConfigEntity c : configs) {
            configMap.put(c.getTagId(), c);
        }

        boolean reachable = "OPC_UA".equalsIgnoreCase(channel.getProtocol()) && liveOpcUaDriver.isChannelReachable(channel);
        Map<String, DataValue> liveValues = Collections.emptyMap();
        if (reachable) {
            List<String> nodeIds = savedTags.stream().map(NetworkDeviceTagEntity::getNodeId).toList();
            liveValues = liveOpcUaDriver.readLiveValues(channel, nodeIds);

            String newStatus = "ONLINE";
            if (!newStatus.equals(channel.getStatus())) {
                channel.setStatus(newStatus);
                channelRepository.save(channel);
            }
        }

        String chIdStr = channel.getId().toString();
        Set<String> subscriptionNodeIds = new HashSet<>();

        for (NetworkDeviceTagEntity saved : savedTags) {
            NetworkTagAcquisitionConfigEntity cfg = configMap.get(saved.getId());
            String acqMethod = cfg != null && cfg.getAcquisitionMethod() != null ? cfg.getAcquisitionMethod() : "SUBSCRIPTION";

            if (reachable) {
                DataValue dv = liveValues.get(saved.getNodeId());
                if (dv == null || dv.getStatusCode() == null) {
                    saved.setQuality("MISSING (0x80330000 - Bad_NodeIdUnknown)");
                } else if (dv.getStatusCode().getValue() == 0x80340000L || dv.getStatusCode().getValue() == 0x80330000L) {
                    saved.setQuality("MISSING (0x80330000 - Bad_NodeIdUnknown)");
                } else if (dv.getStatusCode().isGood()) {
                    saved.setQuality("GOOD (0x00000000)");
                    if (dv.getValue() != null && dv.getValue().getValue() != null) {
                        Object cleanVal = OpcUaValueHelper.sanitizeAndExtractValue(dv.getValue().getValue());
                        saved.setCurrentValue(formatValueString(cleanVal));

                        Map<String, Object> payload = new HashMap<>();
                        payload.put("channelId", chIdStr);
                        payload.put("nodeId", saved.getNodeId());
                        payload.put("value", cleanVal != null ? cleanVal : "");
                        payload.put("quality", "GOOD (0x00000000)");
                        payload.put("timestamp", dv.getSourceTime() != null && dv.getSourceTime().getJavaInstant() != null
                                ? dv.getSourceTime().getJavaInstant().toString()
                                : Instant.now().toString());
                        putTelemetryCache(chIdStr, saved.getNodeId(), payload);
                    }
                    saved.setLastUpdated(Instant.now());
                } else {
                    saved.setQuality("BAD (" + dv.getStatusCode() + ")");
                }
            } else {
                saved.setQuality("BAD (0x80050000 - Bad_CommunicationFailure)");
            }

            String savedQuality = saved.getQuality() != null ? saved.getQuality() : "GOOD (0x00000000)";
            if ("SUBSCRIPTION".equalsIgnoreCase(acqMethod) && reachable && !savedQuality.startsWith("MISSING")) {
                subscriptionNodeIds.add(saved.getNodeId());
            }
        }

        tagRepository.saveAll(savedTags);

        if (reachable && !subscriptionNodeIds.isEmpty()) {
            liveOpcUaDriver.updateSubscriptionNodes(channel, subscriptionNodeIds);
        }

        List<Map<String, Object>> result = new ArrayList<>(savedTags.size());
        for (NetworkDeviceTagEntity saved : savedTags) {
            NetworkTagAcquisitionConfigEntity cfg = configMap.get(saved.getId());
            result.add(tagEntityToMap(saved, cfg, true, saved.getId().toString()));
        }
        return result;
    }

    private String formatValueString(Object cleanVal) {
        if (cleanVal == null) return "--";
        if (cleanVal instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(cleanVal);
        } catch (Exception ex) {
            return String.valueOf(cleanVal);
        }
    }

    public Map<String, Object> entityToMap(NetworkDeviceChannelEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId() != null ? e.getId().toString() : e.getChannelCode());
        m.put("channelCode", e.getChannelCode());
        m.put("name", e.getChannelName());
        m.put("deviceType", e.getDeviceType());
        m.put("protocol", e.getProtocol());
        m.put("endpointUrl", e.getEndpointUrl());
        m.put("status", e.getStatus());
        m.put("securityPolicy", e.getSecurityPolicy());
        m.put("authType", e.getAuthType());
        m.put("tagsCount", e.getTagsCount() != null ? e.getTagsCount() : 0);
        m.put("latencyMs", e.getLatencyMs() != null ? e.getLatencyMs() : 3.5);
        m.put("reconnectIntervalMs", e.getReconnectIntervalMs() != null ? e.getReconnectIntervalMs() : 3000);
        m.put("sessionTimeoutMs", e.getSessionTimeoutMs() != null ? e.getSessionTimeoutMs() : 60000);
        m.put("lastActive", "Just now");

        Map<String, Object> configMap = Collections.emptyMap();
        if (e.getConfig() != null && !e.getConfig().isBlank()) {
            try {
                configMap = objectMapper.readValue(e.getConfig(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }
        m.put("config", configMap);
        return m;
    }

    public Map<String, Object> tagEntityToMap(NetworkDeviceTagEntity t) {
        return tagEntityToMap(t, null, t.getId() != null, t.getId() != null ? t.getId().toString() : t.getNodeId());
    }

    public Map<String, Object> tagEntityToMap(
            NetworkDeviceTagEntity t,
            NetworkTagAcquisitionConfigEntity cfg,
            boolean isMonitored,
            String explicitId
    ) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", explicitId != null ? explicitId : (t.getId() != null ? t.getId().toString() : t.getNodeId()));
        m.put("channelId", t.getChannelId() != null ? t.getChannelId().toString() : "");
        m.put("name", t.getTagName());
        m.put("nodeId", t.getNodeId());
        m.put("folder", t.getFolderPath());
        m.put("dataType", t.getDataType() != null ? t.getDataType() : "Variant");

        // Overlay latest live push telemetry from Milo subscription cache if available
        Map<String, Object> cachedUpdate = null;
        if (t.getChannelId() != null) {
            Map<String, Map<String, Object>> chanMap = latestTelemetryCache.get(t.getChannelId().toString());
            if (chanMap != null) {
                cachedUpdate = chanMap.get(t.getNodeId());
            }
        }

        Object rawVal = (cachedUpdate != null && cachedUpdate.get("value") != null)
                ? cachedUpdate.get("value")
                : t.getCurrentValue();
        String quality = (cachedUpdate != null && cachedUpdate.get("quality") != null)
                ? String.valueOf(cachedUpdate.get("quality"))
                : (t.getQuality() != null ? t.getQuality() : "GOOD (0x00000000)");
        String ts = (cachedUpdate != null && cachedUpdate.get("timestamp") != null)
                ? String.valueOf(cachedUpdate.get("timestamp"))
                : (t.getLastUpdated() != null ? t.getLastUpdated().toString() : Instant.now().toString());

        Object parsedVal = rawVal;
        if (rawVal instanceof String sVal && !"--".equals(sVal)) {
            if (sVal.startsWith("{") || sVal.startsWith("[")) {
                try {
                    parsedVal = objectMapper.readValue(sVal, Object.class);
                } catch (Exception ignored) {}
            } else if ("Boolean".equalsIgnoreCase(t.getDataType())) {
                parsedVal = Boolean.parseBoolean(sVal);
            } else if ("Int16".equalsIgnoreCase(t.getDataType()) || "Int32".equalsIgnoreCase(t.getDataType()) || "Int64".equalsIgnoreCase(t.getDataType())) {
                try {
                    parsedVal = Long.parseLong(sVal);
                } catch (Exception ignored) {}
            } else if ("Float".equalsIgnoreCase(t.getDataType()) || "Double".equalsIgnoreCase(t.getDataType())) {
                try {
                    parsedVal = Double.parseDouble(sVal);
                } catch (Exception ignored) {}
            }
        }

        m.put("quality", quality);
        m.put("value", parsedVal);
        m.put("timestamp", ts);
        m.put("subscribed", isMonitored);
        m.put("writable", t.getIsWritable() != null ? t.getIsWritable() : true);
        m.put("isMonitored", isMonitored);

        // 3NF Operational Acquisition Policy
        m.put("acquisitionMethod", cfg != null && cfg.getAcquisitionMethod() != null ? cfg.getAcquisitionMethod() : "SUBSCRIPTION");
        m.put("samplingIntervalMs", cfg != null && cfg.getSamplingIntervalMs() != null ? cfg.getSamplingIntervalMs() : 250);
        m.put("publishingIntervalMs", cfg != null && cfg.getPublishingIntervalMs() != null ? cfg.getPublishingIntervalMs() : 500);
        m.put("deadbandValue", cfg != null && cfg.getDeadbandValue() != null ? cfg.getDeadbandValue() : 0.0);
        m.put("isLoggingEnabled", cfg != null && cfg.getIsLoggingEnabled() != null ? cfg.getIsLoggingEnabled() : false);
        m.put("isActive", cfg != null && cfg.getIsActive() != null ? cfg.getIsActive() : true);

        // UDT Hierarchy Metadata
        String pTagId = t.getParentTagId() != null ? t.getParentTagId().toString() : t.getParentNodeId();
        m.put("parentTagId", pTagId);
        m.put("isUdt", t.getIsUdt() != null ? t.getIsUdt() : false);
        m.put("isUdtMember", t.getIsUdtMember() != null ? t.getIsUdtMember() : false);
        m.put("memberPath", t.getMemberPath());

        return m;
    }

    @Transactional
    public boolean removeMonitoredTag(NetworkDeviceChannelEntity channel, String identifier) {
        Optional<NetworkDeviceTagEntity> tagOpt = findTag(channel.getId(), identifier);
        if (tagOpt.isPresent()) {
            NetworkDeviceTagEntity tag = tagOpt.get();

            // 1. Clean up any UDT children
            List<NetworkDeviceTagEntity> children = tagRepository.findByParentTagId(tag.getId());
            if (children != null && !children.isEmpty()) {
                List<UUID> childIds = children.stream().map(NetworkDeviceTagEntity::getId).toList();
                acquisitionConfigRepository.deleteByTagIdIn(childIds);
                if ("OPC_UA".equalsIgnoreCase(channel.getProtocol())) {
                    for (NetworkDeviceTagEntity ch : children) {
                        liveOpcUaDriver.removeSubscriptionNode(channel, ch.getNodeId());
                    }
                }
                tagRepository.deleteAll(children);
            }

            // 2. Clean up parent tag acquisition config and tag itself
            acquisitionConfigRepository.deleteByTagId(tag.getId());
            tagRepository.delete(tag);

            // 3. Update channel tags count
            int remaining = tagRepository.countByChannelId(channel.getId());
            channel.setTagsCount(remaining);
            channelRepository.save(channel);

            // 4. Update OPC-UA Milo subscription
            if ("OPC_UA".equalsIgnoreCase(channel.getProtocol())) {
                liveOpcUaDriver.removeSubscriptionNode(channel, tag.getNodeId());
            }

            // 5. Evict from live telemetry cache
            Map<String, Map<String, Object>> chanMap = latestTelemetryCache.get(channel.getId().toString());
            if (chanMap != null) {
                chanMap.remove(tag.getNodeId());
            }
            log.info("Removed monitored tag '{}' ({}) from channel '{}', remaining tags: {}",
                    tag.getTagName(), tag.getNodeId(), channel.getChannelCode(), remaining);
            return true;
        }
        return false;
    }

    @Transactional
    public int removeAllMonitoredTags(NetworkDeviceChannelEntity channel) {
        List<NetworkDeviceTagEntity> tags = tagRepository.findByChannelId(channel.getId());
        if (tags.isEmpty()) {
            return 0;
        }

        List<UUID> tagIds = tags.stream().map(NetworkDeviceTagEntity::getId).toList();
        acquisitionConfigRepository.deleteByTagIdIn(tagIds);
        tagRepository.deleteAll(tags);

        channel.setTagsCount(0);
        channelRepository.save(channel);

        if ("OPC_UA".equalsIgnoreCase(channel.getProtocol())) {
            liveOpcUaDriver.updateSubscriptionNodes(channel, Collections.emptySet());
        }
        latestTelemetryCache.remove(channel.getId().toString());
        log.info("Removed all {} monitored tags for channel '{}'", tags.size(), channel.getChannelCode());
        return tags.size();
    }

    public Optional<NetworkDeviceTagEntity> findTag(UUID channelId, String identifier) {
        try {
            UUID uuid = UUID.fromString(identifier);
            return tagRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            return tagRepository.findByChannelIdAndNodeId(channelId, identifier);
        }
    }
}
