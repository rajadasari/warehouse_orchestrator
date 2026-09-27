package com.company.warehouse.common.industrial.opcua.server;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.model.OpcUaServerConfig;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagDefinition;

/**
 * High-level server engine SPI for exposing and hosting OPC UA Address Spaces in WCS.
 */
public interface OpcUaServerEngine extends OpcUaOperations {

    void start(OpcUaServerConfig config);

    void stop();

    boolean isRunning();

    OpcUaServerConfig getConfig();

    void registerNode(OpcUaTagDefinition tag, Object initialValue);

    @Override
    default void registerTag(OpcUaTagDefinition tag) {
        registerNode(tag, null);
    }

    @Override
    default void close() {
        stop();
    }
}
