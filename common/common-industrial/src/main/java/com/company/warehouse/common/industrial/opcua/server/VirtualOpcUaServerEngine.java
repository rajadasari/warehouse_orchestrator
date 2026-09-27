package com.company.warehouse.common.industrial.opcua.server;

import com.company.warehouse.common.industrial.opcua.model.*;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * Thread-safe, high-performance in-memory Virtual OPC UA Server.
 * Serves as the digital twin, machine simulator, and address space engine for WCS.
 */
@Slf4j
public class VirtualOpcUaServerEngine implements OpcUaServerEngine {

    private final Map<String, OpcUaTagDefinition> tagRegistry = new ConcurrentHashMap<>();
    private final Map<String, OpcUaTagGroupDefinition> groupRegistry = new ConcurrentHashMap<>();
    private final Map<String, OpcUaTagValue> addressSpace = new ConcurrentHashMap<>();
    private final Map<String, List<Consumer<OpcUaTagValue>>> subscriptions = new ConcurrentHashMap<>();
    private final Map<String, String> subscriptionToNodeMap = new ConcurrentHashMap<>();

    private OpcUaServerConfig config;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Override
    public synchronized void start(OpcUaServerConfig config) {
        this.config = Objects.requireNonNull(config, "Server config cannot be null");
        this.running.set(true);
        log.info("Virtual OPC UA Server '{}' started on port {} (endpoint: {}, namespace: {})",
                config.serverCode(), config.bindPort(), config.endpointPath(), config.namespaceUri());
    }

    @Override
    public synchronized void stop() {
        this.running.set(false);
        this.subscriptions.clear();
        this.subscriptionToNodeMap.clear();
        log.info("Virtual OPC UA Server stopped");
    }

    @Override
    public boolean isRunning() {
        return running.get();
    }

    @Override
    public OpcUaServerConfig getConfig() {
        return config;
    }

    @Override
    public void registerNode(OpcUaTagDefinition tag, Object initialValue) {
        tagRegistry.put(tag.tagKey(), tag);
        Object val = (initialValue != null) ? tag.dataType().coerceValue(initialValue) : null;
        OpcUaTagValue tagValue = OpcUaTagValue.good(tag.tagKey(), tag.nodeIdStr(), val, tag.dataType());
        addressSpace.put(tag.tagKey(), tagValue);
        addressSpace.put(tag.nodeIdStr(), tagValue);
    }

    @Override
    public void registerTagGroup(OpcUaTagGroupDefinition group) {
        groupRegistry.put(group.groupKey(), group);
    }

    @Override
    public Optional<OpcUaTagDefinition> getTagDefinition(String tagKeyOrNodeId) {
        OpcUaTagDefinition def = tagRegistry.get(tagKeyOrNodeId);
        if (def != null) return Optional.of(def);
        return tagRegistry.values().stream()
                .filter(t -> t.nodeIdStr().equalsIgnoreCase(tagKeyOrNodeId))
                .findFirst();
    }

    @Override
    public Optional<OpcUaTagGroupDefinition> getTagGroup(String groupKey) {
        return Optional.ofNullable(groupRegistry.get(groupKey));
    }

    @Override
    public OpcUaTagValue readSingle(String tagKeyOrNodeId) {
        ensureRunning();
        OpcUaTagValue val = addressSpace.get(tagKeyOrNodeId);
        if (val != null) {
            return val;
        }

        // Try lookup by nodeId
        Optional<OpcUaTagDefinition> def = getTagDefinition(tagKeyOrNodeId);
        if (def.isPresent()) {
            return addressSpace.getOrDefault(def.get().tagKey(),
                    OpcUaTagValue.good(def.get().tagKey(), def.get().nodeIdStr(), null, def.get().dataType()));
        }

        return OpcUaTagValue.bad(tagKeyOrNodeId, tagKeyOrNodeId, "Bad_NodeIdUnknown");
    }

    @Override
    public boolean writeSingle(String tagKeyOrNodeId, Object value) {
        ensureRunning();
        Optional<OpcUaTagDefinition> defOpt = getTagDefinition(tagKeyOrNodeId);
        if (defOpt.isEmpty()) {
            OpcUaDataType inferredType = OpcUaDataType.STRING;
            if (value instanceof Boolean) inferredType = OpcUaDataType.BOOLEAN;
            else if (value instanceof Integer || value instanceof Long) inferredType = OpcUaDataType.INT32;
            else if (value instanceof Float || value instanceof Double) inferredType = OpcUaDataType.DOUBLE;

            registerNode(OpcUaTagDefinition.builder()
                    .tagKey(tagKeyOrNodeId)
                    .nodeIdStr(tagKeyOrNodeId)
                    .dataType(inferredType)
                    .accessLevel("READ_WRITE")
                    .build(), value);
            log.info("Auto-registered dynamic node '{}' with initial value '{}'", tagKeyOrNodeId, value);
            return true;
        }

        OpcUaTagDefinition def = defOpt.get();
        if (!def.isWritable()) {
            log.warn("Tag '{}' is read-only. Write rejected.", def.tagKey());
            return false;
        }

        Object coerced = def.dataType().coerceValue(value);
        OpcUaTagValue updated = OpcUaTagValue.good(def.tagKey(), def.nodeIdStr(), coerced, def.dataType());
        addressSpace.put(def.tagKey(), updated);
        addressSpace.put(def.nodeIdStr(), updated);

        // Notify subscribers
        notifySubscribers(def.tagKey(), updated);
        notifySubscribers(def.nodeIdStr(), updated);
        return true;
    }

    @Override
    public Map<String, OpcUaTagValue> readBatch(List<String> tagKeysOrNodeIds) {
        ensureRunning();
        Map<String, OpcUaTagValue> result = new LinkedHashMap<>();
        if (tagKeysOrNodeIds != null) {
            for (String key : tagKeysOrNodeIds) {
                result.put(key, readSingle(key));
            }
        }
        return result;
    }

    @Override
    public Map<String, OpcUaTagValue> readGroup(String groupKey) {
        OpcUaTagGroupDefinition group = groupRegistry.get(groupKey);
        if (group == null) {
            throw new IllegalArgumentException("Unknown tag group: " + groupKey);
        }
        return readBatch(group.tagKeys());
    }

    @Override
    public Map<String, Boolean> writeBatch(Map<String, Object> values) {
        ensureRunning();
        Map<String, Boolean> result = new LinkedHashMap<>();
        if (values != null) {
            for (Map.Entry<String, Object> entry : values.entrySet()) {
                result.put(entry.getKey(), writeSingle(entry.getKey(), entry.getValue()));
            }
        }
        return result;
    }

    @Override
    public Map<String, Boolean> writeGroup(String groupKey, Map<String, Object> values) {
        OpcUaTagGroupDefinition group = groupRegistry.get(groupKey);
        if (group == null) {
            throw new IllegalArgumentException("Unknown tag group: " + groupKey);
        }
        Map<String, Object> filtered = new LinkedHashMap<>();
        for (String tag : group.tagKeys()) {
            if (values.containsKey(tag)) {
                filtered.put(tag, values.get(tag));
            }
        }
        return writeBatch(filtered);
    }

    @Override
    public String subscribe(String tagKeyOrNodeId, Consumer<OpcUaTagValue> listener) {
        ensureRunning();
        String subId = UUID.randomUUID().toString();
        subscriptions.computeIfAbsent(tagKeyOrNodeId, k -> new CopyOnWriteArrayList<>()).add(listener);
        subscriptionToNodeMap.put(subId, tagKeyOrNodeId);

        // Immediately push current value if present
        OpcUaTagValue current = addressSpace.get(tagKeyOrNodeId);
        if (current != null) {
            listener.accept(current);
        }
        return subId;
    }

    @Override
    public String subscribeGroup(String groupKey, Consumer<Map<String, OpcUaTagValue>> groupListener) {
        OpcUaTagGroupDefinition group = groupRegistry.get(groupKey);
        if (group == null) {
            throw new IllegalArgumentException("Unknown tag group: " + groupKey);
        }

        Map<String, OpcUaTagValue> state = new ConcurrentHashMap<>();
        List<String> subIds = new ArrayList<>();

        for (String tag : group.tagKeys()) {
            String sid = subscribe(tag, val -> {
                state.put(tag, val);
                groupListener.accept(new HashMap<>(state));
            });
            subIds.add(sid);
        }

        return String.join(";", subIds);
    }

    @Override
    public void unsubscribe(String subscriptionId) {
        if (subscriptionId == null) return;
        String[] parts = subscriptionId.split(";");
        for (String pid : parts) {
            String nodeKey = subscriptionToNodeMap.remove(pid.trim());
            if (nodeKey != null) {
                subscriptions.remove(nodeKey);
            }
        }
    }

    @Override
    public List<String> browse(String parentNodeId) {
        ensureRunning();
        List<String> results = new ArrayList<>();
        for (OpcUaTagDefinition tag : tagRegistry.values()) {
            results.add(String.format("%s (Variable) [%s] - %s",
                    tag.tagKey(), tag.nodeIdStr(), tag.dataType()));
        }
        return results;
    }

    private void notifySubscribers(String key, OpcUaTagValue value) {
        List<Consumer<OpcUaTagValue>> listeners = subscriptions.get(key);
        if (listeners != null) {
            for (Consumer<OpcUaTagValue> listener : listeners) {
                try {
                    listener.accept(value);
                } catch (Exception e) {
                    log.error("Subscription listener error on tag '{}': {}", key, e.getMessage());
                }
            }
        }
    }

    private void ensureRunning() {
        if (!isRunning()) {
            start(OpcUaServerConfig.builder()
                    .serverCode("DEFAULT_VIRTUAL_SERVER")
                    .bindPort(4840)
                    .endpointPath("/wcs/opcua")
                    .namespaceUri("urn:company:warehouse:wcs")
                    .build());
        }
    }
}
