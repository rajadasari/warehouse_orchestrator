package com.company.warehouse.common.industrial.opcua.client;

import com.company.warehouse.common.industrial.opcua.model.*;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.api.identity.AnonymousProvider;
import org.eclipse.milo.opcua.sdk.client.api.identity.IdentityProvider;
import org.eclipse.milo.opcua.sdk.client.api.identity.UsernameProvider;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaMonitoredItem;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription;
import org.eclipse.milo.opcua.stack.core.AttributeId;
import org.eclipse.milo.opcua.stack.core.Identifiers;
import org.eclipse.milo.opcua.stack.core.security.SecurityPolicy;
import org.eclipse.milo.opcua.stack.core.types.builtin.*;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseDirection;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseResultMask;
import org.eclipse.milo.opcua.stack.core.types.enumerated.MonitoringMode;
import org.eclipse.milo.opcua.stack.core.types.enumerated.NodeClass;
import org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn;
import org.eclipse.milo.opcua.stack.core.types.structured.*;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

import static org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned.uint;

/**
 * Concrete high-performance OPC UA Client Engine backed by Eclipse Milo SDK.
 */
@Slf4j
public class MiloOpcUaClientEngine implements OpcUaClientEngine {

    private final Map<String, OpcUaTagDefinition> tagRegistry = new ConcurrentHashMap<>();
    private final Map<String, OpcUaTagGroupDefinition> groupRegistry = new ConcurrentHashMap<>();
    private final Map<String, UaSubscription> activeSubscriptions = new ConcurrentHashMap<>();

    private OpcUaClientConfig config;
    private OpcUaClient client;
    private final AtomicBoolean connected = new AtomicBoolean(false);

    @Override
    public synchronized void connect(OpcUaClientConfig config) {
        if (connected.get() && this.client != null) {
            log.info("OPC UA Client '{}' already connected to {}", config.clientCode(), config.endpointUrl());
            return;
        }

        this.config = Objects.requireNonNull(config, "Client config cannot be null");
        try {
            SecurityPolicy targetPolicy = config.securityPolicy() != null
                    ? config.securityPolicy().getMiloPolicy()
                    : SecurityPolicy.None;

            IdentityProvider identityProvider = switch (config.authType() != null ? config.authType() : OpcUaAuthType.ANONYMOUS) {
                case USERNAME_PASSWORD -> new UsernameProvider(
                        config.username() != null ? config.username() : "",
                        config.password() != null ? config.password() : ""
                );
                default -> new AnonymousProvider();
            };

            this.client = OpcUaClient.create(
                    config.endpointUrl(),
                    endpoints -> endpoints.stream()
                            .filter(e -> e.getSecurityPolicyUri().equals(targetPolicy.getUri()))
                            .findFirst(),
                    configBuilder -> configBuilder
                            .setApplicationName(LocalizedText.english("Warehouse-Orchestrator-WCS"))
                            .setApplicationUri("urn:company:warehouse:wcs:client:" + config.clientCode())
                            .setIdentityProvider(identityProvider)
                            .setRequestTimeout(uint(config.requestTimeoutMs()))
                            .setSessionTimeout(uint(config.sessionTimeoutMs()))
                            .build()
            );

            this.client.connect().get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);
            this.connected.set(true);
            log.info("Successfully connected OPC UA Client '{}' to endpoint '{}'", config.clientCode(), config.endpointUrl());
        } catch (Exception e) {
            this.connected.set(false);
            log.error("Failed to connect OPC UA Client '{}' to '{}': {}", config.clientCode(), config.endpointUrl(), e.getMessage());
            throw new RuntimeException("Could not connect to OPC UA Server: " + e.getMessage(), e);
        }
    }

    @Override
    public synchronized void disconnect() {
        if (client != null) {
            try {
                activeSubscriptions.values().forEach(sub -> {
                    try {
                        client.getSubscriptionManager().deleteSubscription(sub.getSubscriptionId()).get(1, TimeUnit.SECONDS);
                    } catch (Exception ignored) {
                    }
                });
                activeSubscriptions.clear();
                client.disconnect().get(3, TimeUnit.SECONDS);
            } catch (Exception e) {
                log.warn("Error disconnecting OPC UA client: {}", e.getMessage());
            } finally {
                client = null;
                connected.set(false);
            }
        }
    }

    @Override
    public boolean isConnected() {
        return connected.get() && client != null;
    }

    @Override
    public OpcUaClientConfig getConfig() {
        return config;
    }

    @Override
    public void registerTag(OpcUaTagDefinition tag) {
        tagRegistry.put(tag.tagKey(), tag);
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
        ensureConnected();
        NodeId nodeId = resolveNodeId(tagKeyOrNodeId);
        OpcUaDataType dataType = resolveDataType(tagKeyOrNodeId);

        try {
            DataValue dv = client.readValue(0.0, TimestampsToReturn.Both, nodeId)
                    .get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);
            if (dv.getStatusCode().isGood()) {
                Object val = dv.getValue() != null ? dv.getValue().getValue() : null;
                return OpcUaTagValue.good(tagKeyOrNodeId, nodeId.toParseableString(), val, dataType);
            } else {
                return OpcUaTagValue.bad(tagKeyOrNodeId, nodeId.toParseableString(), dv.getStatusCode().toString());
            }
        } catch (Exception e) {
            log.error("Failed to read tag '{}': {}", tagKeyOrNodeId, e.getMessage());
            return OpcUaTagValue.bad(tagKeyOrNodeId, nodeId.toParseableString(), e.getMessage());
        }
    }

    @Override
    public boolean writeSingle(String tagKeyOrNodeId, Object value) {
        ensureConnected();
        NodeId nodeId = resolveNodeId(tagKeyOrNodeId);
        OpcUaDataType dataType = resolveDataType(tagKeyOrNodeId);
        Variant variant = dataType.toVariant(value);

        try {
            StatusCode sc = client.writeValue(nodeId, new DataValue(variant))
                    .get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);
            boolean success = sc.isGood();
            if (!success) {
                log.warn("Write to tag '{}' returned non-good status: {}", tagKeyOrNodeId, sc);
            }
            return success;
        } catch (Exception e) {
            log.error("Failed to write to tag '{}': {}", tagKeyOrNodeId, e.getMessage());
            return false;
        }
    }

    @Override
    public Map<String, OpcUaTagValue> readBatch(List<String> tagKeysOrNodeIds) {
        ensureConnected();
        if (tagKeysOrNodeIds == null || tagKeysOrNodeIds.isEmpty()) {
            return Collections.emptyMap();
        }

        List<ReadValueId> readIds = new ArrayList<>(tagKeysOrNodeIds.size());
        List<NodeId> parsedNodes = new ArrayList<>(tagKeysOrNodeIds.size());

        for (String key : tagKeysOrNodeIds) {
            NodeId nid = resolveNodeId(key);
            parsedNodes.add(nid);
            readIds.add(new ReadValueId(
                    nid,
                    AttributeId.Value.uid(),
                    null,
                    QualifiedName.NULL_VALUE
            ));
        }

        Map<String, OpcUaTagValue> resultMap = new LinkedHashMap<>();
        try {
            ReadResponse response = client.read(0.0, TimestampsToReturn.Both, readIds)
                    .get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);
            DataValue[] values = response.getResults();

            for (int i = 0; i < tagKeysOrNodeIds.size(); i++) {
                String key = tagKeysOrNodeIds.get(i);
                DataValue dv = (values != null && i < values.length) ? values[i] : null;
                OpcUaDataType dt = resolveDataType(key);
                String nidStr = parsedNodes.get(i).toParseableString();

                if (dv != null && dv.getStatusCode().isGood()) {
                    Object val = dv.getValue() != null ? dv.getValue().getValue() : null;
                    resultMap.put(key, OpcUaTagValue.good(key, nidStr, val, dt));
                } else {
                    String sc = dv != null ? dv.getStatusCode().toString() : "NoData";
                    resultMap.put(key, OpcUaTagValue.bad(key, nidStr, sc));
                }
            }
        } catch (Exception e) {
            log.error("Batch read failed for tags {}: {}", tagKeysOrNodeIds, e.getMessage());
            for (int i = 0; i < tagKeysOrNodeIds.size(); i++) {
                String key = tagKeysOrNodeIds.get(i);
                resultMap.put(key, OpcUaTagValue.bad(key, parsedNodes.get(i).toParseableString(), e.getMessage()));
            }
        }
        return resultMap;
    }

    @Override
    public Map<String, OpcUaTagValue> readGroup(String groupKey) {
        OpcUaTagGroupDefinition group = groupRegistry.get(groupKey);
        if (group == null) {
            throw new IllegalArgumentException("Unknown tag group key: " + groupKey);
        }
        return readBatch(group.tagKeys());
    }

    @Override
    public Map<String, Boolean> writeBatch(Map<String, Object> tagValues) {
        ensureConnected();
        if (tagValues == null || tagValues.isEmpty()) {
            return Collections.emptyMap();
        }

        List<String> keys = new ArrayList<>(tagValues.keySet());
        List<WriteValue> writeValues = new ArrayList<>(keys.size());

        for (String key : keys) {
            NodeId nid = resolveNodeId(key);
            OpcUaDataType dt = resolveDataType(key);
            Variant variant = dt.toVariant(tagValues.get(key));

            writeValues.add(new WriteValue(
                    nid,
                    AttributeId.Value.uid(),
                    null,
                    new DataValue(variant)
            ));
        }

        Map<String, Boolean> resultMap = new LinkedHashMap<>();
        try {
            WriteResponse response = client.write(writeValues)
                    .get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);
            StatusCode[] results = response.getResults();

            for (int i = 0; i < keys.size(); i++) {
                String key = keys.get(i);
                StatusCode sc = (results != null && i < results.length) ? results[i] : StatusCode.BAD;
                resultMap.put(key, sc.isGood());
            }
        } catch (Exception e) {
            log.error("Batch write failed: {}", e.getMessage());
            for (String key : keys) {
                resultMap.put(key, false);
            }
        }
        return resultMap;
    }

    @Override
    public Map<String, Boolean> writeGroup(String groupKey, Map<String, Object> values) {
        OpcUaTagGroupDefinition group = groupRegistry.get(groupKey);
        if (group == null) {
            throw new IllegalArgumentException("Unknown tag group key: " + groupKey);
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
        ensureConnected();
        NodeId nodeId = resolveNodeId(tagKeyOrNodeId);
        OpcUaDataType dataType = resolveDataType(tagKeyOrNodeId);

        try {
            UaSubscription subscription = client.getSubscriptionManager()
                    .createSubscription(250.0)
                    .get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);

            ReadValueId readValueId = new ReadValueId(
                    nodeId,
                    AttributeId.Value.uid(),
                    null,
                    QualifiedName.NULL_VALUE
            );

            UInteger clientHandle = uint(System.identityHashCode(listener));
            MonitoringParameters parameters = new MonitoringParameters(
                    clientHandle,
                    250.0,
                    null,
                    uint(10),
                    true
            );

            MonitoredItemCreateRequest request = new MonitoredItemCreateRequest(
                    readValueId,
                    MonitoringMode.Reporting,
                    parameters
            );

            subscription.createMonitoredItems(
                    TimestampsToReturn.Both,
                    List.of(request),
                    (item, id) -> item.setValueConsumer((monitoredItem, dataValue) -> {
                        if (dataValue.getStatusCode().isGood()) {
                            Object val = dataValue.getValue() != null ? dataValue.getValue().getValue() : null;
                            listener.accept(OpcUaTagValue.good(tagKeyOrNodeId, nodeId.toParseableString(), val, dataType));
                        } else {
                            listener.accept(OpcUaTagValue.bad(tagKeyOrNodeId, nodeId.toParseableString(), dataValue.getStatusCode().toString()));
                        }
                    })
            ).get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);

            String subId = UUID.randomUUID().toString();
            activeSubscriptions.put(subId, subscription);
            log.info("Created subscription '{}' for tag '{}' on client '{}'", subId, tagKeyOrNodeId, config.clientCode());
            return subId;
        } catch (Exception e) {
            log.error("Failed to create subscription for tag '{}': {}", tagKeyOrNodeId, e.getMessage());
            throw new RuntimeException("Subscription creation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String subscribeGroup(String groupKey, Consumer<Map<String, OpcUaTagValue>> groupListener) {
        OpcUaTagGroupDefinition group = groupRegistry.get(groupKey);
        if (group == null) {
            throw new IllegalArgumentException("Unknown tag group: " + groupKey);
        }

        // Aggregate listener
        Map<String, OpcUaTagValue> currentGroupState = new ConcurrentHashMap<>();
        List<String> subIds = new ArrayList<>();

        for (String tagKey : group.tagKeys()) {
            String sid = subscribe(tagKey, val -> {
                currentGroupState.put(tagKey, val);
                groupListener.accept(new HashMap<>(currentGroupState));
            });
            subIds.add(sid);
        }

        return String.join(";", subIds);
    }

    @Override
    public void unsubscribe(String subscriptionId) {
        if (subscriptionId == null || client == null) return;
        String[] parts = subscriptionId.split(";");
        for (String pid : parts) {
            UaSubscription sub = activeSubscriptions.remove(pid.trim());
            if (sub != null) {
                try {
                    client.getSubscriptionManager().deleteSubscription(sub.getSubscriptionId())
                            .get(2, TimeUnit.SECONDS);
                } catch (Exception ignored) {
                }
            }
        }
    }

    @Override
    public List<String> browse(String parentNodeId) {
        ensureConnected();
        NodeId targetId = (parentNodeId == null || parentNodeId.isBlank() || "Root".equalsIgnoreCase(parentNodeId))
                ? Identifiers.RootFolder
                : NodeId.parse(parentNodeId);

        try {
            BrowseDescription desc = new BrowseDescription(
                    targetId,
                    BrowseDirection.Forward,
                    Identifiers.References,
                    true,
                    uint(NodeClass.Object.getValue() | NodeClass.Variable.getValue()),
                    uint(BrowseResultMask.All.getValue())
            );

            BrowseResult result = client.browse(desc).get(config.requestTimeoutMs(), TimeUnit.MILLISECONDS);
            ReferenceDescription[] refs = result.getReferences();
            if (refs == null) return Collections.emptyList();

            List<String> nodes = new ArrayList<>(refs.length);
            for (ReferenceDescription r : refs) {
                nodes.add(String.format("%s (%s) [%s]",
                        r.getBrowseName().getName(),
                        r.getNodeClass(),
                        r.getNodeId().toParseableString()));
            }
            return nodes;
        } catch (Exception e) {
            log.error("Browse failed for parent node '{}': {}", parentNodeId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private void ensureConnected() {
        if (!isConnected()) {
            throw new IllegalStateException("OPC UA Client is not connected. Call connect() first.");
        }
    }

    private NodeId resolveNodeId(String tagKeyOrNodeId) {
        OpcUaTagDefinition def = tagRegistry.get(tagKeyOrNodeId);
        if (def != null) {
            return NodeId.parse(def.nodeIdStr());
        }
        return NodeId.parse(tagKeyOrNodeId);
    }

    private OpcUaDataType resolveDataType(String tagKeyOrNodeId) {
        OpcUaTagDefinition def = tagRegistry.get(tagKeyOrNodeId);
        if (def != null && def.dataType() != null) {
            return def.dataType();
        }
        return OpcUaDataType.STRING;
    }
}
