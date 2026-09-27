package com.company.warehouse.common.industrial.opcua.model;

import lombok.Builder;

/**
 * Definition of an industrial OPC UA variable tag node.
 */
@Builder
public record OpcUaTagDefinition(
        String tagKey,
        String nodeIdStr,
        OpcUaDataType dataType,
        String accessLevel,
        Double samplingIntervalMs,
        Double deadband,
        String equipmentCode,
        String description
) {
    public OpcUaTagDefinition {
        if (tagKey == null || tagKey.isBlank()) {
            throw new IllegalArgumentException("tagKey cannot be null or blank");
        }
        if (nodeIdStr == null || nodeIdStr.isBlank()) {
            throw new IllegalArgumentException("nodeIdStr cannot be null or blank");
        }
        if (dataType == null) {
            dataType = OpcUaDataType.STRING;
        }
        if (accessLevel == null || accessLevel.isBlank()) {
            accessLevel = "READ_WRITE";
        }
        if (samplingIntervalMs == null || samplingIntervalMs <= 0) {
            samplingIntervalMs = 250.0;
        }
        if (deadband == null) {
            deadband = 0.0;
        }
    }

    public boolean isReadable() {
        return "READ".equalsIgnoreCase(accessLevel) || "READ_WRITE".equalsIgnoreCase(accessLevel);
    }

    public boolean isWritable() {
        return "WRITE".equalsIgnoreCase(accessLevel) || "READ_WRITE".equalsIgnoreCase(accessLevel);
    }
}
