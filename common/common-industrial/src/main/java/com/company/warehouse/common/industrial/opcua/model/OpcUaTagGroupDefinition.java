package com.company.warehouse.common.industrial.opcua.model;

import lombok.Builder;

import java.util.List;

/**
 * Definition of a named group of tags for atomic batch machine operations.
 */
@Builder
public record OpcUaTagGroupDefinition(
        String groupKey,
        String description,
        String equipmentCode,
        List<String> tagKeys
) {
    public OpcUaTagGroupDefinition {
        if (groupKey == null || groupKey.isBlank()) {
            throw new IllegalArgumentException("groupKey cannot be null or blank");
        }
        if (tagKeys == null) {
            tagKeys = List.of();
        }
    }
}
