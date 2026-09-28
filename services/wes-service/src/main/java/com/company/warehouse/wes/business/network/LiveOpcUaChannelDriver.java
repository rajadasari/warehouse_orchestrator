package com.company.warehouse.wes.business.network;

import com.company.warehouse.wes.data.entity.NetworkDeviceChannelEntity;
import com.company.warehouse.wes.data.entity.NetworkDeviceTagEntity;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.api.identity.AnonymousProvider;
import org.eclipse.milo.opcua.sdk.client.api.identity.IdentityProvider;
import org.eclipse.milo.opcua.sdk.client.api.identity.UsernameProvider;
import org.eclipse.milo.opcua.stack.core.Identifiers;
import org.eclipse.milo.opcua.stack.core.security.SecurityPolicy;
import org.eclipse.milo.opcua.stack.core.types.builtin.*;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseDirection;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseResultMask;
import org.eclipse.milo.opcua.stack.core.types.enumerated.NodeClass;
import org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn;
import org.eclipse.milo.opcua.stack.core.types.structured.BrowseDescription;
import org.eclipse.milo.opcua.stack.core.types.structured.BrowseResult;
import org.eclipse.milo.opcua.stack.core.types.structured.ReferenceDescription;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaMonitoredItem;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription;
import org.eclipse.milo.opcua.stack.core.AttributeId;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger;
import org.eclipse.milo.opcua.stack.core.types.enumerated.MonitoringMode;
import org.eclipse.milo.opcua.stack.core.types.structured.MonitoredItemCreateRequest;
import org.eclipse.milo.opcua.stack.core.types.structured.MonitoringParameters;
import org.eclipse.milo.opcua.stack.core.types.structured.ReadValueId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import static org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned.uint;

/**
 * High-performance, production-grade OPC UA Driver communicating directly with real industrial PLCs and servers.
 * Connects via Eclipse Milo, browses live address spaces, reads live telemetry, and writes commands.
 */
@Slf4j
@Service
public class LiveOpcUaChannelDriver {

    public interface TagChangeListener {
        void onTagChanged(String channelId, String nodeId, Object value, String quality, String timestamp);
    }

    private final Map<String, OpcUaClient> clientCache = new ConcurrentHashMap<>();
    private final Set<TagChangeListener> listeners = ConcurrentHashMap.newKeySet();
    private final Map<String, UaSubscription> channelSubscriptions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> channelMonitoredNodes = new ConcurrentHashMap<>();
    private final java.util.concurrent.atomic.AtomicInteger clientHandleSequence = new java.util.concurrent.atomic.AtomicInteger(1);

    public void addListener(TagChangeListener listener) {
        listeners.add(listener);
    }

    public void removeListener(TagChangeListener listener) {
        listeners.remove(listener);
    }

    /**
     * Resolves or creates an active, connected Milo OpcUaClient for the target channel.
     */
    public synchronized OpcUaClient getConnectedClient(NetworkDeviceChannelEntity channel) throws Exception {
        String endpointUrl = channel.getEndpointUrl().trim();
        OpcUaClient existing = clientCache.get(endpointUrl);
        if (existing != null) {
            return existing;
        }

        String secPolicyStr = channel.getSecurityPolicy() != null ? channel.getSecurityPolicy().toUpperCase() : "NONE";
        SecurityPolicy targetPolicy = SecurityPolicy.None;
        if (secPolicyStr.contains("BASIC256") || secPolicyStr.contains("BASIC256SHA256")) {
            targetPolicy = SecurityPolicy.Basic256Sha256;
        } else if (secPolicyStr.contains("AES128")) {
            targetPolicy = SecurityPolicy.Aes128_Sha256_RsaOaep;
        }

        String authType = channel.getAuthType() != null ? channel.getAuthType().toUpperCase() : "ANONYMOUS";
        final IdentityProvider identityProvider = (authType.contains("USERNAME") || authType.contains("PASSWORD"))
                ? new UsernameProvider("admin", "")
                : new AnonymousProvider();

        final SecurityPolicy chosenPolicy = targetPolicy;
        OpcUaClient client = OpcUaClient.create(
                endpointUrl,
                endpoints -> endpoints.stream()
                        .filter(e -> e.getSecurityPolicyUri().equals(chosenPolicy.getUri()))
                        .findFirst(),
                configBuilder -> configBuilder
                        .setApplicationName(LocalizedText.english("Warehouse-Orchestrator-WCS"))
                        .setApplicationUri("urn:company:warehouse:wcs:" + channel.getChannelCode())
                        .setIdentityProvider(identityProvider)
                        .setRequestTimeout(uint(channel.getSessionTimeoutMs() != null ? channel.getSessionTimeoutMs() : 60000))
                        .build()
        );

        client.connect().get(5, TimeUnit.SECONDS);
        log.info("Connected Milo OPC-UA Client to channel '{}' at '{}'", channel.getChannelCode(), endpointUrl);
        clientCache.put(endpointUrl, client);
        return client;
    }

    /**
     * Browses the real OPC-UA address space starting from ObjectsFolder (ns=0;i=85).
     * Traverses custom Objects (e.g. MyDevice) and discovers real Variables (e.g. Temperature, InputValue, OutputValue).
     */
    public List<NetworkDeviceTagEntity> browseLiveAddressSpace(NetworkDeviceChannelEntity channel) {
        List<NetworkDeviceTagEntity> discoveredTags = new ArrayList<>();
        String endpointUrl = channel.getEndpointUrl().trim();

        try {
            OpcUaClient client = getConnectedClient(channel);
            NodeId objectsFolder = Identifiers.ObjectsFolder;

            // Industrial recursive traversal: discovers nested UDT structures (e.g. MyDevice / Motor1 / ...)
            Set<NodeId> visitedNodes = new HashSet<>();
            browseNodeRecursive(client, channel, objectsFolder, "", 0, visitedNodes, discoveredTags);

            log.info("Live OPC-UA Browse for channel '{}' discovered {} real tags (including UDTs) from '{}'",
                    channel.getChannelCode(), discoveredTags.size(), endpointUrl);

        } catch (Exception e) {
            log.error("Failed live OPC-UA browse on channel '{}' at '{}': {}",
                    channel.getChannelCode(), endpointUrl, e.getMessage(), e);
            invalidateChannelConnection(channel);
        }

        return discoveredTags;
    }

    private static final int MAX_BROWSE_DEPTH = 6;

    private void browseNodeRecursive(
            OpcUaClient client,
            NetworkDeviceChannelEntity channel,
            NodeId parentNodeId,
            String currentPath,
            int currentDepth,
            Set<NodeId> visited,
            List<NetworkDeviceTagEntity> outList
    ) {
        if (currentDepth > MAX_BROWSE_DEPTH || !visited.add(parentNodeId)) {
            return;
        }

        try {
            List<ReferenceDescription> refs = browseNode(client, parentNodeId);
            for (ReferenceDescription ref : refs) {
                String name = ref.getBrowseName().getName();
                NodeClass nodeClass = ref.getNodeClass();

                // Skip internal OPC UA server diagnostic objects
                if ("Server".equalsIgnoreCase(name) || "Aliases".equalsIgnoreCase(name)) {
                    continue;
                }

                Optional<NodeId> optId = ref.getNodeId().toNodeId(client.getNamespaceTable());
                if (optId.isEmpty()) continue;
                NodeId childNodeId = optId.get();

                String newPath = currentPath.isEmpty() ? name : (currentPath + "/" + name);

                if (nodeClass == NodeClass.Object) {
                    // Recurse into child Object (UDT structure, device sub-tree, or component)
                    browseNodeRecursive(client, channel, childNodeId, newPath, currentDepth + 1, visited, outList);
                } else if (nodeClass == NodeClass.Variable) {
                    String folder = currentPath.isEmpty() ? "Root" : currentPath;
                    processVariableNode(client, channel, ref, folder, outList);
                }
            }
        } catch (Exception ex) {
            log.warn("Error browsing node {} at path '{}': {}", parentNodeId, currentPath, ex.getMessage());
        }
    }

    /**
     * Checks if the target OPC-UA channel is currently alive and responsive.
     * Performs a fast 2000ms browse of ObjectsFolder (ns=0;i=85), which is mandatory
     * on every compliant OPC-UA server (including Python asyncua/freeopcua).
     */
    public boolean isChannelReachable(NetworkDeviceChannelEntity channel) {
        String endpointUrl = channel.getEndpointUrl().trim();
        try {
            OpcUaClient client = getConnectedClient(channel);
            BrowseDescription browseDesc = new BrowseDescription(
                    Identifiers.ObjectsFolder,
                    BrowseDirection.Forward,
                    Identifiers.HierarchicalReferences,
                    true,
                    uint(NodeClass.Object.getValue() | NodeClass.Variable.getValue()),
                    uint(BrowseResultMask.None.getValue())
            );
            BrowseResult result = client.browse(browseDesc).get(2, TimeUnit.SECONDS);
            boolean ok = result != null && result.getStatusCode() != null && result.getStatusCode().isGood();
            if (!ok) {
                invalidateChannelConnection(channel);
            }
            return ok;
        } catch (Exception e) {
            log.debug("Heartbeat check failed for channel '{}' at '{}': {}",
                    channel.getChannelCode(), endpointUrl, e.getMessage());
            invalidateChannelConnection(channel);
            return false;
        }
    }

    /**
     * Reads the live value of a specific node from the connected OPC-UA server.
     */
    public DataValue readLiveValue(NetworkDeviceChannelEntity channel, String nodeIdStr) {
        try {
            OpcUaClient client = getConnectedClient(channel);
            NodeId nodeId = NodeId.parse(nodeIdStr);
            return client.readValue(0.0, TimestampsToReturn.Both, nodeId).get(3, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Live read error for tag '{}': {}", nodeIdStr, e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("connection") || msg.contains("timeout") || msg.contains("closed") || msg.contains("refused")) {
                invalidateChannelConnection(channel);
            }
            return null;
        }
    }

    /**
     * High-speed batch read of multiple live node IDs in a single OPC-UA request packet.
     */
    public Map<String, DataValue> readLiveValues(NetworkDeviceChannelEntity channel, List<String> nodeIdsStr) {
        if (nodeIdsStr == null || nodeIdsStr.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, DataValue> results = new LinkedHashMap<>();
        try {
            OpcUaClient client = getConnectedClient(channel);
            List<NodeId> parsedNodeIds = new ArrayList<>();
            List<String> validIdsStr = new ArrayList<>();
            for (String str : nodeIdsStr) {
                try {
                    parsedNodeIds.add(NodeId.parse(str));
                    validIdsStr.add(str);
                } catch (Exception ignored) {
                }
            }

            if (parsedNodeIds.isEmpty()) {
                return Collections.emptyMap();
            }

            List<DataValue> values = client.readValues(0.0, TimestampsToReturn.Both, parsedNodeIds).get(2, TimeUnit.SECONDS);
            for (int i = 0; i < values.size() && i < validIdsStr.size(); i++) {
                results.put(validIdsStr.get(i), values.get(i));
            }
        } catch (Exception e) {
            log.warn("Batch read error for channel '{}': {}", channel.getChannelCode(), e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("connection") || msg.contains("timeout") || msg.contains("closed") || msg.contains("refused")) {
                invalidateChannelConnection(channel);
            }
        }
        return results;
    }

    /**
     * Writes a value to a live tag on the connected OPC-UA server with intelligent type resolution and StatusCode.
     */
    public StatusCode writeLiveValueWithStatus(NetworkDeviceChannelEntity channel, String nodeIdStr, Object value) {
        try {
            OpcUaClient client = getConnectedClient(channel);
            NodeId nodeId = NodeId.parse(nodeIdStr);

            Variant variant = buildVariant(value);
            StatusCode status = client.writeValue(nodeId, new DataValue(variant)).get(3, TimeUnit.SECONDS);

            // If TypeMismatch occurred, query the target node's DataType attribute and dynamically coerce
            if (status.getValue() == 0x80740000L || "Bad_TypeMismatch".equalsIgnoreCase(status.toString())) {
                log.info("Write to '{}' returned Bad_TypeMismatch with type {}. Resolving target DataType...",
                        nodeIdStr, variant.getDataType());
                try {
                    ReadValueId rvid = new ReadValueId(nodeId, AttributeId.DataType.uid(), null, QualifiedName.NULL_VALUE);
                    DataValue dtVal = client.read(0.0, TimestampsToReturn.Neither, List.of(rvid)).get(2, TimeUnit.SECONDS).getResults()[0];
                    if (dtVal.getStatusCode().isGood() && dtVal.getValue().getValue() instanceof NodeId targetDt) {
                        Variant coerced = coerceVariant(value, targetDt);
                        if (coerced != null) {
                            status = client.writeValue(nodeId, new DataValue(coerced)).get(3, TimeUnit.SECONDS);
                            log.info("Coerced write to '{}' with dataType {} returned status: {}", nodeIdStr, targetDt, status);
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Dynamic type resolution failed for '{}': {}", nodeIdStr, ex.getMessage());
                }
            }

            if (status.isGood()) {
                String chIdStr = channel.getId() != null ? channel.getId().toString() : "";
                for (TagChangeListener l : listeners) {
                    try {
                        l.onTagChanged(chIdStr, nodeIdStr, value, "GOOD (0x00000000)", Instant.now().toString());
                    } catch (Exception ignored) {}
                }
            }

            log.info("Live OPC-UA write to tag '{}' returned status: {}", nodeIdStr, status);
            return status;
        } catch (Exception e) {
            log.error("Failed writing live value to tag '{}' on channel '{}': {}",
                    nodeIdStr, channel.getChannelCode(), e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("connection") || msg.contains("timeout") || msg.contains("closed") || msg.contains("refused")) {
                invalidateChannelConnection(channel);
            }
            return new StatusCode(0x80050000L); // Bad_CommunicationFailure
        }
    }

    public boolean writeLiveValue(NetworkDeviceChannelEntity channel, String nodeIdStr, Object value) {
        StatusCode sc = writeLiveValueWithStatus(channel, nodeIdStr, value);
        return sc != null && sc.isGood();
    }

    private Variant buildVariant(Object value) {
        if (value == null) return new Variant(null);
        if (value instanceof Boolean b) return new Variant(b);
        if (value instanceof Integer i) return new Variant(i);
        if (value instanceof Long l) return new Variant(l);
        if (value instanceof Double d) return new Variant(d);
        if (value instanceof Float f) return new Variant(f);

        String strVal = String.valueOf(value).trim();
        if ("true".equalsIgnoreCase(strVal) || "false".equalsIgnoreCase(strVal)) {
            return new Variant(Boolean.parseBoolean(strVal));
        }

        // Integer numbers without decimal point -> Long (matches 64-bit integer, standard default)
        if (strVal.matches("^-?\\d+$")) {
            try {
                return new Variant(Long.parseLong(strVal));
            } catch (NumberFormatException ignored) {}
        }

        // Floating point with decimal point
        if (strVal.matches("^-?\\d+\\.\\d+$")) {
            try {
                return new Variant(Double.parseDouble(strVal));
            } catch (NumberFormatException ignored) {}
        }

        return new Variant(strVal);
    }

    private Variant coerceVariant(Object value, NodeId targetDt) {
        String s = String.valueOf(value).trim();
        try {
            if (Identifiers.Int64.equals(targetDt)) {
                return new Variant(Long.parseLong(s));
            } else if (Identifiers.Int32.equals(targetDt)) {
                return new Variant(Integer.parseInt(s));
            } else if (Identifiers.Int16.equals(targetDt)) {
                return new Variant(Short.parseShort(s));
            } else if (Identifiers.UInt32.equals(targetDt)) {
                return new Variant(org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned.uint(Long.parseLong(s)));
            } else if (Identifiers.UInt16.equals(targetDt)) {
                return new Variant(org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned.ushort(Integer.parseInt(s)));
            } else if (Identifiers.Byte.equals(targetDt)) {
                return new Variant(org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned.ubyte(Short.parseShort(s)));
            } else if (Identifiers.Double.equals(targetDt)) {
                return new Variant(Double.parseDouble(s));
            } else if (Identifiers.Float.equals(targetDt)) {
                return new Variant(Float.parseFloat(s));
            } else if (Identifiers.Boolean.equals(targetDt)) {
                return new Variant(Boolean.parseBoolean(s));
            } else if (Identifiers.String.equals(targetDt)) {
                return new Variant(s);
            }
        } catch (Exception e) {
            log.warn("Cannot coerce '{}' to dataType {}: {}", s, targetDt, e.getMessage());
        }
        return null;
    }

    public synchronized void invalidateChannelConnection(NetworkDeviceChannelEntity channel) {
        if (channel == null) return;
        String endpointUrl = channel.getEndpointUrl() != null ? channel.getEndpointUrl().trim() : null;
        if (endpointUrl != null) {
            clientCache.remove(endpointUrl);
        }
        if (channel.getId() != null) {
            String chId = channel.getId().toString();
            channelSubscriptions.remove(chId);
            channelMonitoredNodes.remove(chId);
        }
    }

    /**
     * Updates the set of node IDs actively monitored on the OPC-UA subscription for the channel.
     * Pushes live DataChangeNotification events to registered listeners in real time.
     */
    public synchronized void updateSubscriptionNodes(NetworkDeviceChannelEntity channel, Collection<String> targetNodeIds) {
        if (targetNodeIds == null) return;
        try {
            OpcUaClient client = getConnectedClient(channel);
            String channelIdStr = channel.getId().toString();

            UaSubscription subscription = channelSubscriptions.get(channelIdStr);
            boolean recreate = (subscription == null);
            if (!recreate) {
                try {
                    UInteger subId = subscription.getSubscriptionId();
                    recreate = client.getSubscriptionManager().getSubscriptions().stream()
                            .noneMatch(s -> s.getSubscriptionId().equals(subId));
                } catch (Exception ex) {
                    recreate = true;
                }
            }
            if (recreate) {
                subscription = client.getSubscriptionManager().createSubscription(250.0).get(3, TimeUnit.SECONDS);
                channelSubscriptions.put(channelIdStr, subscription);
                channelMonitoredNodes.remove(channelIdStr);
            }

            Set<String> currentNodes = channelMonitoredNodes.computeIfAbsent(channelIdStr, k -> ConcurrentHashMap.newKeySet());

            // 1. Add newly monitored nodes
            List<String> toAdd = targetNodeIds.stream().filter(id -> !currentNodes.contains(id)).toList();
            if (!toAdd.isEmpty()) {
                List<MonitoredItemCreateRequest> requests = new ArrayList<>();
                for (String nidStr : toAdd) {
                    try {
                        NodeId nid = NodeId.parse(nidStr);
                        ReadValueId readValueId = new ReadValueId(nid, AttributeId.Value.uid(), null, QualifiedName.NULL_VALUE);
                        UInteger clientHandle = uint(clientHandleSequence.getAndIncrement());
                        MonitoringParameters parameters = new MonitoringParameters(clientHandle, 250.0, null, uint(10), true);
                        requests.add(new MonitoredItemCreateRequest(readValueId, MonitoringMode.Reporting, parameters));
                    } catch (Exception ex) {
                        log.warn("Invalid nodeId for subscription '{}': {}", nidStr, ex.getMessage());
                    }
                }

                if (!requests.isEmpty()) {
                    subscription.createMonitoredItems(
                            TimestampsToReturn.Both,
                            requests,
                            (item, id) -> item.setValueConsumer((monitoredItem, dataValue) -> {
                                NodeId readNodeId = monitoredItem.getReadValueId().getNodeId();
                                String nodeStr = readNodeId.toParseableString();
                                Object val = dataValue.getValue() != null ? dataValue.getValue().getValue() : null;
                                String quality = (dataValue.getStatusCode() != null && dataValue.getStatusCode().isGood())
                                        ? "GOOD (0x00000000)"
                                        : (dataValue.getStatusCode() != null ? dataValue.getStatusCode().toString() : "UNCERTAIN");
                                String ts = dataValue.getSourceTime() != null ? dataValue.getSourceTime().getJavaInstant().toString() : Instant.now().toString();

                                for (TagChangeListener l : listeners) {
                                    try {
                                        l.onTagChanged(channelIdStr, nodeStr, val, quality, ts);
                                    } catch (Exception ignored) {}
                                }
                            })
                    ).get(3, TimeUnit.SECONDS);

                    toAdd.forEach(currentNodes::add);
                    log.info("Subscribed to {} tags on channel '{}'", toAdd.size(), channel.getChannelCode());
                }
            }

            // 2. Remove nodes that are no longer in subscription mode
            List<String> toRemove = currentNodes.stream().filter(id -> !targetNodeIds.contains(id)).toList();
            if (!toRemove.isEmpty()) {
                List<UaMonitoredItem> itemsToRemove = subscription.getMonitoredItems().stream()
                        .filter(item -> toRemove.contains(item.getReadValueId().getNodeId().toParseableString()))
                        .toList();
                if (!itemsToRemove.isEmpty()) {
                    subscription.deleteMonitoredItems(itemsToRemove).get(2, TimeUnit.SECONDS);
                }
                toRemove.forEach(currentNodes::remove);
                log.info("Unsubscribed {} tags on channel '{}'", toRemove.size(), channel.getChannelCode());
            }

        } catch (Exception e) {
            log.error("Failed to update subscription for channel '{}': {}", channel.getChannelCode(), e.getMessage());
        }
    }

    public synchronized void addSubscriptionNode(NetworkDeviceChannelEntity channel, String nodeIdStr) {
        String channelIdStr = channel.getId().toString();
        Set<String> set = channelMonitoredNodes.computeIfAbsent(channelIdStr, k -> ConcurrentHashMap.newKeySet());
        Set<String> target = new HashSet<>(set);
        target.add(nodeIdStr);
        updateSubscriptionNodes(channel, target);
    }

    public synchronized void removeSubscriptionNode(NetworkDeviceChannelEntity channel, String nodeIdStr) {
        String channelIdStr = channel.getId().toString();
        Set<String> set = channelMonitoredNodes.get(channelIdStr);
        if (set != null && set.contains(nodeIdStr)) {
            Set<String> target = new HashSet<>(set);
            target.remove(nodeIdStr);
            updateSubscriptionNodes(channel, target);
        }
    }

    private List<ReferenceDescription> browseNode(OpcUaClient client, NodeId parentNodeId) throws Exception {
        BrowseDescription browseDesc = new BrowseDescription(
                parentNodeId,
                BrowseDirection.Forward,
                Identifiers.HierarchicalReferences,
                true,
                uint(NodeClass.Object.getValue() | NodeClass.Variable.getValue()),
                uint(BrowseResultMask.All.getValue())
        );

        BrowseResult result = client.browse(browseDesc).get(4, TimeUnit.SECONDS);
        ReferenceDescription[] refs = result.getReferences();
        return refs != null ? Arrays.asList(refs) : Collections.emptyList();
    }

    private void processVariableNode(
            OpcUaClient client,
            NetworkDeviceChannelEntity channel,
            ReferenceDescription varRef,
            String folderName,
            List<NetworkDeviceTagEntity> outList
    ) {
        try {
            Optional<NodeId> optVarId = varRef.getNodeId().toNodeId(client.getNamespaceTable());
            if (optVarId.isEmpty()) return;
            NodeId varNodeId = optVarId.get();

            String tagName = varRef.getBrowseName().getName();
            String nodeIdStr = varNodeId.toParseableString();

            // Industrial standard: Browse discovers structural metadata only.
            // Zero read requests sent to the server; subscription push events populate live values.
            NetworkDeviceTagEntity tagEntity = NetworkDeviceTagEntity.builder()
                    .channelId(channel.getId())
                    .tagName(tagName)
                    .nodeId(nodeIdStr)
                    .folderPath(folderName)
                    .dataType("Variant")
                    .quality("GOOD (0x00000000)")
                    .currentValue("--")
                    .isWritable(true)
                    .isSubscribed(false)
                    .lastUpdated(Instant.now())
                    .build();

            outList.add(tagEntity);
        } catch (Exception ex) {
            log.warn("Error processing variable node: {}", ex.getMessage());
        }
    }
}
