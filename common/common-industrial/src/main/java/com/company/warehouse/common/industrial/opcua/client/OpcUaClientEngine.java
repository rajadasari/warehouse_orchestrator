package com.company.warehouse.common.industrial.opcua.client;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.model.OpcUaClientConfig;

/**
 * High-level, type-safe client engine for communicating with shop-floor PLCs via OPC UA.
 */
public interface OpcUaClientEngine extends OpcUaOperations {

    void connect(OpcUaClientConfig config);

    void disconnect();

    boolean isConnected();

    OpcUaClientConfig getConfig();

    @Override
    default void close() {
        disconnect();
    }
}
