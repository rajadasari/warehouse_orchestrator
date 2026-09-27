package com.company.warehouse.common.industrial.opcua.model;

import lombok.Builder;

import java.time.Instant;

/**
 * Value container for an industrial OPC UA tag read.
 */
@Builder
public record OpcUaTagValue(
        String tagKey,
        String nodeIdStr,
        Object value,
        OpcUaDataType dataType,
        String statusCode,
        boolean isGood,
        Instant sourceTimestamp
) {
    public static OpcUaTagValue good(String tagKey, String nodeIdStr, Object value, OpcUaDataType dataType) {
        return OpcUaTagValue.builder()
                .tagKey(tagKey)
                .nodeIdStr(nodeIdStr)
                .value(dataType != null ? dataType.coerceValue(value) : value)
                .dataType(dataType)
                .statusCode("Good")
                .isGood(true)
                .sourceTimestamp(Instant.now())
                .build();
    }

    public static OpcUaTagValue bad(String tagKey, String nodeIdStr, String statusCode) {
        return OpcUaTagValue.builder()
                .tagKey(tagKey)
                .nodeIdStr(nodeIdStr)
                .value(null)
                .dataType(null)
                .statusCode(statusCode != null ? statusCode : "Bad")
                .isGood(false)
                .sourceTimestamp(Instant.now())
                .build();
    }
}
