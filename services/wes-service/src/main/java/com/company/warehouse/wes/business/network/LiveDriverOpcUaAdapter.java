package com.company.warehouse.wes.business.network;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagDefinition;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagGroupDefinition;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagValue;
import com.company.warehouse.wes.data.entity.NetworkDeviceChannelEntity;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode;

import java.util.*;
import java.util.function.Consumer;

/**
 * Adapter bridging {@link LiveOpcUaChannelDriver} to the common
 * {@link OpcUaOperations} interface for functional rule evaluation.
 */
public class LiveDriverOpcUaAdapter implements OpcUaOperations {

    private final LiveOpcUaChannelDriver driver;
    private final NetworkDeviceChannelEntity channel;

    public LiveDriverOpcUaAdapter(LiveOpcUaChannelDriver driver, NetworkDeviceChannelEntity channel) {
        this.driver = driver;
        this.channel = channel;
    }

    @Override
    public void registerTag(OpcUaTagDefinition tag) {
        // Tag definitions are persisted in PostgreSQL
    }

    @Override
    public void registerTagGroup(OpcUaTagGroupDefinition group) {
        // Tag groups are persisted in PostgreSQL
    }

    @Override
    public Optional<OpcUaTagDefinition> getTagDefinition(String tagKeyOrNodeId) {
        return Optional.empty();
    }

    @Override
    public Optional<OpcUaTagGroupDefinition> getTagGroup(String groupKey) {
        return Optional.empty();
    }

    @Override
    public OpcUaTagValue readSingle(String tagKeyOrNodeId) {
        DataValue dv = driver.readLiveValue(channel, tagKeyOrNodeId);
        if (dv != null && dv.getStatusCode() != null && dv.getStatusCode().isGood()) {
            Object val = dv.getValue() != null ? dv.getValue().getValue() : null;
            return OpcUaTagValue.good(tagKeyOrNodeId, tagKeyOrNodeId, val, null);
        }
        return OpcUaTagValue.bad(tagKeyOrNodeId, tagKeyOrNodeId, "Bad");
    }

    @Override
    public boolean writeSingle(String tagKeyOrNodeId, Object value) {
        StatusCode sc = driver.writeLiveValueWithStatus(channel, tagKeyOrNodeId, value);
        return sc != null && sc.isGood();
    }

    @Override
    public Map<String, OpcUaTagValue> readBatch(List<String> tagKeysOrNodeIds) {
        Map<String, DataValue> dataValues = driver.readLiveValues(channel, tagKeysOrNodeIds);
        Map<String, OpcUaTagValue> result = new LinkedHashMap<>();
        for (String nodeId : tagKeysOrNodeIds) {
            DataValue dv = dataValues.get(nodeId);
            if (dv != null && dv.getStatusCode() != null && dv.getStatusCode().isGood()) {
                Object val = dv.getValue() != null ? dv.getValue().getValue() : null;
                result.put(nodeId, OpcUaTagValue.good(nodeId, nodeId, val, null));
            } else {
                result.put(nodeId, OpcUaTagValue.bad(nodeId, nodeId, "Bad"));
            }
        }
        return result;
    }

    @Override
    public Map<String, OpcUaTagValue> readGroup(String groupKey) {
        return Collections.emptyMap();
    }

    @Override
    public Map<String, Boolean> writeBatch(Map<String, Object> values) {
        Map<String, Boolean> results = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            results.put(entry.getKey(), writeSingle(entry.getKey(), entry.getValue()));
        }
        return results;
    }

    @Override
    public Map<String, Boolean> writeGroup(String groupKey, Map<String, Object> values) {
        return writeBatch(values);
    }

    @Override
    public String subscribe(String tagKeyOrNodeId, Consumer<OpcUaTagValue> listener) {
        String subId = UUID.randomUUID().toString();
        driver.addListener((chId, nodeId, value, quality, timestamp) -> {
            if (tagKeyOrNodeId.equalsIgnoreCase(nodeId)) {
                OpcUaTagValue tv = "GOOD (0x00000000)".equals(quality)
                        ? OpcUaTagValue.good(nodeId, nodeId, value, null)
                        : OpcUaTagValue.bad(nodeId, nodeId, quality);
                listener.accept(tv);
            }
        });
        driver.updateSubscriptionNodes(channel, List.of(tagKeyOrNodeId));
        return subId;
    }

    @Override
    public String subscribeGroup(String groupKey, Consumer<Map<String, OpcUaTagValue>> groupListener) {
        return UUID.randomUUID().toString();
    }

    @Override
    public void unsubscribe(String subscriptionId) {
        // Managed via driver
    }

    @Override
    public List<String> browse(String parentNodeId) {
        return Collections.emptyList();
    }

    @Override
    public void close() {
        // Lifecycle managed by Spring
    }
}
