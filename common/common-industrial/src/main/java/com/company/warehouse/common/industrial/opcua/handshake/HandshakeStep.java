package com.company.warehouse.common.industrial.opcua.handshake;

import lombok.Builder;

import java.util.Map;

/**
 * An individual step in an automated industrial PLC handshake sequence.
 */
@Builder
public record HandshakeStep(
        int stepOrder,
        HandshakeStepType stepType,
        String tagKey,
        String groupKey,
        Object expectedValue,
        Object writeValue,
        Map<String, Object> groupWriteValues,
        String outputVariable,
        Long timeoutMs
) {
    public HandshakeStep {
        if (stepType == null) {
            throw new IllegalArgumentException("stepType cannot be null");
        }
        if (timeoutMs == null || timeoutMs <= 0) {
            timeoutMs = 5000L;
        }
    }
}
