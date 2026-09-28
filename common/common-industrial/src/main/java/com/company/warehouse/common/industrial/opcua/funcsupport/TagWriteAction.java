package com.company.warehouse.common.industrial.opcua.funcsupport;

import lombok.Builder;

/**
 * A single write action to execute when rule conditions pass.
 * Writes a predefined static value to the target tag.
 */
@Builder
public record TagWriteAction(
        String targetNodeId,
        Object writeValue
) {
    public TagWriteAction {
        if (targetNodeId == null || targetNodeId.isBlank()) {
            throw new IllegalArgumentException("targetNodeId must not be blank");
        }
    }
}
