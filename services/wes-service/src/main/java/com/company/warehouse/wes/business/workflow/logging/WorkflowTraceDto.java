package com.company.warehouse.wes.business.workflow.logging;

import lombok.Builder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Diagnostic trace representation of a complete workflow execution tree.
 */
@Builder
public record WorkflowTraceDto(
        UUID instanceId,
        String workflowCode,
        String entityReference,
        String status,
        boolean isSimulated,
        long totalDurationMs,
        List<WorkflowTraceStepDto> steps
) {

    @Builder
    public record WorkflowTraceStepDto(
            int stepSequence,
            String nodeId,
            String nodeType,
            String nodeName,
            String status,
            long durationMs,
            Map<String, Object> inputData,
            Map<String, Object> outputData,
            String errorDetails,
            Instant executedAt
    ) {}
}
