package com.company.warehouse.wes.business.workflow;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NodeExecutionResult {

    private String status; // 'SUCCESS', 'PAUSED_WAITING', 'FAILED'
    
    @Builder.Default
    private Map<String, Object> outputData = Collections.emptyMap();
    
    private String nextNodeId;
    private String correlationKey;
    private String errorMessage;

    public static NodeExecutionResult success(Map<String, Object> outputData) {
        return NodeExecutionResult.builder()
                .status("SUCCESS")
                .outputData(outputData != null ? outputData : Collections.emptyMap())
                .build();
    }

    public static NodeExecutionResult paused(String correlationKey, Map<String, Object> intermediateData) {
        return NodeExecutionResult.builder()
                .status("PAUSED_WAITING")
                .correlationKey(correlationKey)
                .outputData(intermediateData != null ? intermediateData : Collections.emptyMap())
                .build();
    }

    public static NodeExecutionResult pausedWaiting(String correlationKey, Map<String, ?> intermediateData) {
        Map<String, Object> copy = intermediateData != null ? new HashMap<>(intermediateData) : Collections.emptyMap();
        return paused(correlationKey, copy);
    }

    public static NodeExecutionResult failed(String error) {
        return NodeExecutionResult.builder()
                .status("FAILED")
                .errorMessage(error)
                .build();
    }
}
