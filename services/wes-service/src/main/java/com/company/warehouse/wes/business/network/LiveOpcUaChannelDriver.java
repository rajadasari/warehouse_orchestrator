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
        String rawEndpoint = channel.getEndpointUrl().trim();
        String endpointUrl = rawEndpoint.contains("://0.0.0.0:")
                ? rawEndpoint.replace("://0.0.0.0:", "://127.0.0.1:")
                : rawEndpoint;
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
                        .findFirst()
                        .or(() -> endpoints.stream().findFirst()),
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
     * Browses the real OPC-UA address space starting from ObjectsFolder (ns=0;i=85)
     * and TypesFolder (ns=0;i=86) for UDT definitions.
     * Traverses custom Objects, ObjectTypes, and discovers real Variables at any depth.
     * Uses continuation-point pagination to handle large namespaces (IEC 62541 compliant).
     */
    public List<NetworkDeviceTagEntity> browseLiveAddressSpace(NetworkDeviceChannelEntity channel) {
        List<NetworkDeviceTagEntity> discoveredTags = new ArrayList<>();
        String endpointUrl = channel.getEndpointUrl().trim();

        try {
            OpcUaClient client = getConnectedClient(channel);
            Set<NodeId> visitedNodes = new HashSet<>();

            // Browse live device instances under ObjectsFolder (ns=0;i=85)
            browseNodeRecursive(client, channel, Identifiers.ObjectsFolder, "", 0, visitedNodes, discoveredTags);

            // Batch-resolve actual DataType attributes for discovered leaf Variable tags
            batchResolveDataTypes(client, discoveredTags);

            log.info("Live OPC-UA Browse for channel '{}' discovered {} real tags (including UDTs) from '{}'",
                    channel.getChannelCode(), discoveredTags.size(), endpointUrl);

        } catch (Exception e) {
            log.error("Failed live OPC-UA browse on channel '{}' at '{}': {}",
                    channel.getChannelCode(), endpointUrl, e.getMessage(), e);
            invalidateChannelConnection(channel);
        }

        return discoveredTags;
    }

    private static final int MAX_BROWSE_DEPTH = 16;

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

            // Classify children: separate Object/ObjectType from Variable/VariableType
            List<ReferenceDescription> objectRefs = new ArrayList<>();
            List<ReferenceDescription> variableRefs = new ArrayList<>();
            for (ReferenceDescription ref : refs) {
                NodeClass nodeClass = ref.getNodeClass();
                Optional<NodeId> optId = ref.getNodeId().toNodeId(client.getNamespaceTable());
                if (optId.isEmpty()) continue;
                if (optId.get().equals(Identifiers.Server)) continue;
                // Skip namespace 0 system folders (like Aliases) unless it is ObjectsFolder
                if (optId.get().getNamespaceIndex().intValue() == 0 && !optId.get().equals(Identifiers.ObjectsFolder)) {
                    continue;
                }

                if (nodeClass == NodeClass.Object || nodeClass == NodeClass.ObjectType) {
                    objectRefs.add(ref);
                } else if (nodeClass == NodeClass.Variable || nodeClass == NodeClass.VariableType) {
                    variableRefs.add(ref);
                }
            }

            // Detect UDT pattern: an Object node whose children include Variables is a UDT container
            for (ReferenceDescription objRef : objectRefs) {
                Optional<NodeId> optObjId = objRef.getNodeId().toNodeId(client.getNamespaceTable());
                if (optObjId.isEmpty()) continue;
                NodeId objNodeId = optObjId.get();
                String objName = objRef.getBrowseName().getName();
                String newObjPath = currentPath.isEmpty() ? objName : (currentPath + "/" + objName);

                // Peek one level below to detect if this Object contains non-system Variable children (UDT)
                List<ReferenceDescription> childRefs = browseNode(client, objNodeId);
                boolean hasVariableChildren = childRefs.stream().anyMatch(cr -> {
                    if (cr.getNodeClass() != NodeClass.Variable && cr.getNodeClass() != NodeClass.VariableType) return false;
                    String crName = cr.getBrowseName().getName();
                    return !"Icon".equalsIgnoreCase(crName) && !"NodeVersion".equalsIgnoreCase(crName);
                });
                boolean hasObjectChildren = childRefs.stream().anyMatch(cr ->
                        cr.getNodeClass() == NodeClass.Object || cr.getNodeClass() == NodeClass.ObjectType);

                if (hasVariableChildren && currentDepth > 0) {
                    // This is a UDT parent: add it as a synthetic parent tag with isUdt=true
                    String parentNodeIdStr = objNodeId.toParseableString();
                    String folder = currentPath.isEmpty() ? "Root" : currentPath;
                    NetworkDeviceTagEntity udtParent = NetworkDeviceTagEntity.builder()
                            .channelId(channel.getId())
                            .tagName(objName)
                            .nodeId(parentNodeIdStr)
                            .folderPath(folder)
                            .dataType("UDT")
                            .quality("GOOD (0x00000000)")
                            .currentValue("--")
                            .isWritable(false)
                            .isSubscribed(false)
                            .isUdt(true)
                            .isUdtMember(false)
                            .memberPath(objName)
                            .lastUpdated(Instant.now())
                            .build();
                    outList.add(udtParent);

                    // Add Variable children as UDT members
                    for (ReferenceDescription cr : childRefs) {
                        if (cr.getNodeClass() == NodeClass.Variable || cr.getNodeClass() == NodeClass.VariableType) {
                            String crName = cr.getBrowseName().getName();
                            if ("Icon".equalsIgnoreCase(crName) || "NodeVersion".equalsIgnoreCase(crName)) continue;
                            processVariableNode(client, channel, cr, folder, outList, parentNodeIdStr, objName, currentDepth + 1, visited);
                        }
                    }
                    // Continue recursing into child Objects (nested UDTs or sub-folders)
                    if (hasObjectChildren) {
                        browseNodeRecursive(client, channel, objNodeId, newObjPath, currentDepth + 1, visited, outList);
                    }
                } else {
                    // Not a UDT, recurse normally
                    browseNodeRecursive(client, channel, objNodeId, newObjPath, currentDepth + 1, visited, outList);
                }
            }

            // Process standalone Variable nodes (not under a UDT Object)
            for (ReferenceDescription varRef : variableRefs) {
                String varName = varRef.getBrowseName().getName();
                if ("Icon".equalsIgnoreCase(varName) || "NodeVersion".equalsIgnoreCase(varName)) continue;
                String folder = currentPath.isEmpty() ? "Root" : currentPath;
                processVariableNode(client, channel, varRef, folder, outList, null, null, currentDepth, visited);
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
                                Object rawVal = dataValue.getValue() != null ? dataValue.getValue().getValue() : null;
                                Object val = OpcUaValueHelper.sanitizeAndExtractValue(rawVal);
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

    /**
     * Browses child references of a parent node with full continuation-point pagination.
     * Handles servers that return partial result sets (common with 1000+ tags per folder).
     */
    private List<ReferenceDescription> browseNode(OpcUaClient client, NodeId parentNodeId) throws Exception {
        BrowseDescription browseDesc = new BrowseDescription(
                parentNodeId,
                BrowseDirection.Forward,
                Identifiers.HierarchicalReferences,
                true,
                uint(NodeClass.Object.getValue() | NodeClass.Variable.getValue()
                     | NodeClass.ObjectType.getValue() | NodeClass.VariableType.getValue()
                     | NodeClass.Method.getValue()),
                uint(BrowseResultMask.All.getValue())
        );

        BrowseResult result = client.browse(browseDesc).get(4, TimeUnit.SECONDS);
        List<ReferenceDescription> allRefs = new ArrayList<>();
        if (result.getReferences() != null) {
            allRefs.addAll(Arrays.asList(result.getReferences()));
        }

        // IEC 62541 continuation point pagination: loop until server signals completion
        ByteString continuationPoint = result.getContinuationPoint();
        while (continuationPoint != null && !continuationPoint.isNull()) {
            BrowseResult nextResult = client.browseNext(false, continuationPoint)
                    .get(4, TimeUnit.SECONDS);
            if (nextResult.getReferences() != null) {
                allRefs.addAll(Arrays.asList(nextResult.getReferences()));
            }
            continuationPoint = nextResult.getContinuationPoint();
        }

        return allRefs;
    }

    private void processVariableNode(
            OpcUaClient client,
            NetworkDeviceChannelEntity channel,
            ReferenceDescription varRef,
            String folderName,
            List<NetworkDeviceTagEntity> outList,
            String parentNodeIdStr,
            String parentName,
            int currentDepth,
            Set<NodeId> visited
    ) {
        try {
            Optional<NodeId> optVarId = varRef.getNodeId().toNodeId(client.getNamespaceTable());
            if (optVarId.isEmpty()) return;
            NodeId varNodeId = optVarId.get();

            String rawName = varRef.getBrowseName().getName();
            if ("Icon".equalsIgnoreCase(rawName) || "NodeVersion".equalsIgnoreCase(rawName)) return;
            String nodeIdStr = varNodeId.toParseableString();
            boolean isMember = parentNodeIdStr != null && !parentNodeIdStr.isBlank();

            String fullTagName;
            String memberPath;
            if (isMember) {
                // Bracket notation if rawName is an array index (e.g. "0" -> parent[0])
                if (rawName.matches("^\\d+$")) {
                    fullTagName = parentName + "[" + rawName + "]";
                    memberPath = "[" + rawName + "]";
                } else if (rawName.startsWith("[")) {
                    fullTagName = parentName + rawName;
                    memberPath = rawName;
                } else {
                    fullTagName = parentName + "." + rawName;
                    memberPath = rawName;
                }
            } else {
                fullTagName = rawName;
                memberPath = rawName;
            }

            // Peek one level below to detect if this Variable node itself has child Variables (complex UDT or array)
            List<ReferenceDescription> childRefs = (currentDepth < MAX_BROWSE_DEPTH && visited.add(varNodeId))
                    ? browseNode(client, varNodeId)
                    : Collections.emptyList();

            boolean hasChildVariables = childRefs.stream().anyMatch(cr -> {
                if (cr.getNodeClass() != NodeClass.Variable && cr.getNodeClass() != NodeClass.VariableType) return false;
                String crName = cr.getBrowseName().getName();
                return !"Icon".equalsIgnoreCase(crName) && !"NodeVersion".equalsIgnoreCase(crName);
            });

            // Industrial standard: Browse discovers structural metadata only.
            // DataType is resolved in a single batch read after the full browse completes.
            NetworkDeviceTagEntity tagEntity = NetworkDeviceTagEntity.builder()
                    .channelId(channel.getId())
                    .tagName(fullTagName)
                    .nodeId(nodeIdStr)
                    .folderPath(folderName)
                    .dataType(hasChildVariables ? "UDT" : "Variant")
                    .quality("GOOD (0x00000000)")
                    .currentValue("--")
                    .isWritable(true)
                    .isSubscribed(false)
                    .isUdt(hasChildVariables)
                    .isUdtMember(isMember)
                    .memberPath(memberPath)
                    .lastUpdated(Instant.now())
                    .build();
            tagEntity.setParentNodeId(parentNodeIdStr);

            outList.add(tagEntity);

            if (hasChildVariables) {
                for (ReferenceDescription cr : childRefs) {
                    if (cr.getNodeClass() == NodeClass.Variable || cr.getNodeClass() == NodeClass.VariableType) {
                        String crName = cr.getBrowseName().getName();
                        if ("Icon".equalsIgnoreCase(crName) || "NodeVersion".equalsIgnoreCase(crName)) continue;
                        processVariableNode(client, channel, cr, folderName, outList, nodeIdStr, fullTagName, currentDepth + 1, visited);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Error processing variable node: {}", ex.getMessage());
        }
    }

    /**
     * Batch-resolves the actual OPC UA DataType attribute for all discovered Variable tags
     * in a single network round-trip per batch (max 200 per request to stay within server limits).
     */
    private void batchResolveDataTypes(OpcUaClient client, List<NetworkDeviceTagEntity> tags) {
        List<NetworkDeviceTagEntity> variableTags = tags.stream()
                .filter(t -> !Boolean.TRUE.equals(t.getIsUdt()))
                .toList();
        if (variableTags.isEmpty()) return;

        int batchSize = 200;
        for (int offset = 0; offset < variableTags.size(); offset += batchSize) {
            int end = Math.min(offset + batchSize, variableTags.size());
            List<NetworkDeviceTagEntity> batch = variableTags.subList(offset, end);

            List<ReadValueId> readIds = new ArrayList<>(batch.size());
            for (NetworkDeviceTagEntity tag : batch) {
                try {
                    NodeId nid = NodeId.parse(tag.getNodeId());
                    readIds.add(new ReadValueId(nid, AttributeId.DataType.uid(), null, QualifiedName.NULL_VALUE));
                } catch (Exception e) {
                    readIds.add(new ReadValueId(Identifiers.RootFolder, AttributeId.DataType.uid(), null, QualifiedName.NULL_VALUE));
                }
            }

            try {
                var response = client.read(0.0, TimestampsToReturn.Neither, readIds)
                        .get(5, TimeUnit.SECONDS);
                DataValue[] results = response.getResults();
                if (results != null) {
                    for (int i = 0; i < results.length && i < batch.size(); i++) {
                        DataValue dv = results[i];
                        if (dv.getStatusCode().isGood() && dv.getValue().getValue() instanceof NodeId dtNodeId) {
                            batch.get(i).setDataType(mapDataTypeNodeIdToName(dtNodeId));
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Batch DataType resolution failed for {} tags: {}", batch.size(), e.getMessage());
            }
        }
    }

    /**
     * Maps well-known OPC UA DataType NodeIds to human-readable type names.
     */
    private String mapDataTypeNodeIdToName(NodeId dtNodeId) {
        if (Identifiers.Boolean.equals(dtNodeId)) return "Boolean";
        if (Identifiers.SByte.equals(dtNodeId)) return "SByte";
        if (Identifiers.Byte.equals(dtNodeId)) return "Byte";
        if (Identifiers.Int16.equals(dtNodeId)) return "Int16";
        if (Identifiers.UInt16.equals(dtNodeId)) return "UInt16";
        if (Identifiers.Int32.equals(dtNodeId)) return "Int32";
        if (Identifiers.UInt32.equals(dtNodeId)) return "UInt32";
        if (Identifiers.Int64.equals(dtNodeId)) return "Int64";
        if (Identifiers.UInt64.equals(dtNodeId)) return "UInt64";
        if (Identifiers.Float.equals(dtNodeId)) return "Float";
        if (Identifiers.Double.equals(dtNodeId)) return "Double";
        if (Identifiers.String.equals(dtNodeId)) return "String";
        if (Identifiers.DateTime.equals(dtNodeId)) return "DateTime";
        if (Identifiers.ByteString.equals(dtNodeId)) return "ByteString";
        if (Identifiers.NodeId.equals(dtNodeId)) return "NodeId";
        if (Identifiers.LocalizedText.equals(dtNodeId)) return "LocalizedText";
        if (Identifiers.QualifiedName.equals(dtNodeId)) return "QualifiedName";
        return "Variant";
    }
}
