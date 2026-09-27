package com.company.warehouse.wes.business.workflow.logging;

import com.company.warehouse.wes.data.entity.workflow.WorkflowExecutionLogEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowExecutionLogRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Structured MDC logger and audit recorder for shop-floor workflow execution.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowStructuredLogger {

    private final WorkflowExecutionLogRepository logRepository;
    private final ObjectMapper objectMapper;

    public void logStep(
            UUID instanceId,
            String workflowCode,
            String entityRef,
            int stepSeq,
            String nodeId,
            String nodeType,
            String nodeLabel,
            Map<String, Object> inputConfig,
            Map<String, Object> outputData,
            String status,
            long durationMs,
            String errorMessage) {

        String inputJson = serialize(inputConfig);
        String outputJson = serialize(outputData);

        // Populate MDC for distributed tracing in ELK / Grafana
        MDC.put("workflowId", String.valueOf(instanceId));
        MDC.put("workflowCode", workflowCode != null ? workflowCode : "UNKNOWN");
        MDC.put("entityRef", entityRef != null ? entityRef : "NONE");
        MDC.put("stepSeq", String.valueOf(stepSeq));
        MDC.put("nodeId", nodeId);
        MDC.put("nodeType", nodeType);

        try {
            if ("FAILED".equalsIgnoreCase(status)) {
                log.error("[WORKFLOW-TRACE] Step #{}: '{}' ({}) FAILED in {}ms | Error: {}",
                        stepSeq, nodeLabel, nodeType, durationMs, errorMessage);
            } else if ("PAUSED_WAITING".equalsIgnoreCase(status)) {
                log.info("[WORKFLOW-TRACE] Step #{}: '{}' ({}) PAUSED (awaiting callback) in {}ms",
                        stepSeq, nodeLabel, nodeType, durationMs);
            } else {
                log.info("[WORKFLOW-TRACE] Step #{}: '{}' ({}) completed successfully in {}ms",
                        stepSeq, nodeLabel, nodeType, durationMs);
            }

            WorkflowExecutionLogEntity entity = WorkflowExecutionLogEntity.builder()
                    .instanceId(instanceId)
                    .stepSequence(stepSeq)
                    .nodeId(nodeId)
                    .nodeType(nodeType)
                    .nodeName(nodeLabel != null ? nodeLabel : nodeId)
                    .inputData(inputJson)
                    .outputData(outputJson)
                    .status(status != null ? status : "SUCCESS")
                    .durationMs(durationMs)
                    .errorDetails(errorMessage)
                    .build();

            logRepository.save(entity);
        } finally {
            MDC.remove("workflowId");
            MDC.remove("workflowCode");
            MDC.remove("entityRef");
            MDC.remove("stepSeq");
            MDC.remove("nodeId");
            MDC.remove("nodeType");
        }
    }

    @Transactional(readOnly = true)
    public WorkflowTraceDto getExecutionTrace(WorkflowInstanceEntity instance) {
        List<WorkflowExecutionLogEntity> logEntities = logRepository.findByInstanceIdOrderByStepSequenceAsc(instance.getId());

        long totalDuration = 0;
        List<WorkflowTraceDto.WorkflowTraceStepDto> stepDtos = new ArrayList<>();

        for (WorkflowExecutionLogEntity le : logEntities) {
            totalDuration += le.getDurationMs();
            stepDtos.add(WorkflowTraceDto.WorkflowTraceStepDto.builder()
                    .stepSequence(le.getStepSequence())
                    .nodeId(le.getNodeId())
                    .nodeType(le.getNodeType())
                    .nodeName(le.getNodeName())
                    .status(le.getStatus())
                    .durationMs(le.getDurationMs())
                    .inputData(deserialize(le.getInputData()))
                    .outputData(deserialize(le.getOutputData()))
                    .errorDetails(le.getErrorDetails())
                    .executedAt(le.getExecutedAt())
                    .build());
        }

        return WorkflowTraceDto.builder()
                .instanceId(instance.getId())
                .workflowCode(instance.getWorkflowCode())
                .entityReference(instance.getEntityReference())
                .status(instance.getStatus())
                .isSimulated("SIMULATION".equalsIgnoreCase(instance.getWorkflowCode()))
                .totalDurationMs(totalDuration)
                .steps(stepDtos)
                .build();
    }

    private String serialize(Map<String, Object> data) {
        if (data == null || data.isEmpty()) return "{}";
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Object> deserialize(String json) {
        if (json == null || json.isBlank() || "{}".equals(json)) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
