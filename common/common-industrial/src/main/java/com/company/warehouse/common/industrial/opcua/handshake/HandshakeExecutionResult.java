package com.company.warehouse.common.industrial.opcua.handshake;

import lombok.Builder;

import java.util.Map;

/**
 * Result of an executed PLC handshake sequence.
 */
@Builder
public record HandshakeExecutionResult(
        boolean success,
        String state,
        Map<String, Object> outputData,
        String errorMessage,
        long durationMs
) {
    public static HandshakeExecutionResult success(Map<String, Object> outputData, long durationMs) {
        return HandshakeExecutionResult.builder()
                .success(true)
                .state("COMPLETED")
                .outputData(outputData != null ? outputData : Map.of())
                .durationMs(durationMs)
                .build();
    }

    public static HandshakeExecutionResult fault(String state, String errorMessage, long durationMs) {
        return HandshakeExecutionResult.builder()
                .success(false)
                .state(state != null ? state : "TIMEOUT_FAULT")
                .errorMessage(errorMessage)
                .outputData(Map.of())
                .durationMs(durationMs)
                .build();
    }
}
