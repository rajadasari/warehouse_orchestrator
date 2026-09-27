package com.company.warehouse.common.industrial.opcua;

import com.company.warehouse.common.industrial.opcua.model.OpcUaTagDefinition;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagGroupDefinition;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagValue;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * Common bidirectional OPC UA I/O contract implemented by both Client and Server engines.
 */
public interface OpcUaOperations extends AutoCloseable {

    void registerTag(OpcUaTagDefinition tag);

    void registerTagGroup(OpcUaTagGroupDefinition group);

    Optional<OpcUaTagDefinition> getTagDefinition(String tagKeyOrNodeId);

    Optional<OpcUaTagGroupDefinition> getTagGroup(String groupKey);

    // --- Single Operations ---
    OpcUaTagValue readSingle(String tagKeyOrNodeId);

    boolean writeSingle(String tagKeyOrNodeId, Object value);

    // --- Batch / Group Operations ---
    Map<String, OpcUaTagValue> readBatch(List<String> tagKeysOrNodeIds);

    Map<String, OpcUaTagValue> readGroup(String groupKey);

    Map<String, Boolean> writeBatch(Map<String, Object> values);

    Map<String, Boolean> writeGroup(String groupKey, Map<String, Object> values);

    // --- Subscriptions ---
    String subscribe(String tagKeyOrNodeId, Consumer<OpcUaTagValue> listener);

    String subscribeGroup(String groupKey, Consumer<Map<String, OpcUaTagValue>> groupListener);

    void unsubscribe(String subscriptionId);

    // --- Browsing ---
    List<String> browse(String parentNodeId);
}
