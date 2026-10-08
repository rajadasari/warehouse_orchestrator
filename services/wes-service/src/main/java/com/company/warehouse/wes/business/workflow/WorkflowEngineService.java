package com.company.warehouse.wes.business.workflow;

import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.api.dto.workflow.WorkflowDefinitionDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowExecutionLogDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowInstanceDto;
import com.company.warehouse.wes.business.workflow.logging.WorkflowStructuredLogger;
import com.company.warehouse.wes.business.workflow.logging.WorkflowTraceDto;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeRegistry;
import com.company.warehouse.wes.business.workflow.routing.WorkflowEdgeRouter;
import com.company.warehouse.wes.data.entity.workflow.WorkflowDefinitionEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowExecutionLogEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowDefinitionRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowExecutionLogRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowInstanceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Modular Enterprise Workflow Engine Service for WES and MES shop-floor orchestration.
 * Supports dual REAL and SIMULATION execution modes, dynamic SpEL branching,
 * and comprehensive structured logging.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowEngineService {

    private static final int MAX_WORKFLOW_STEPS = 100;

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowExecutionLogRepository logRepository;
    private final WorkflowNodeRegistry nodeRegistry;
    private final WorkflowEdgeRouter edgeRouter;
    private final WorkflowStructuredLogger structuredLogger;
    private final com.company.warehouse.wes.business.workflow.validation.WorkflowGraphValidator graphValidator;
    private final ObjectMapper objectMapper;

    private final AtomicReference<WorkflowExecutionMode> executionMode =
            new AtomicReference<>(WorkflowExecutionMode.REAL);

    // =========================================================================
    // 1. EXECUTION MODE MANAGEMENT
    // =========================================================================

    public WorkflowExecutionMode getExecutionMode() {
        return this.executionMode.get();
    }

    public void setExecutionMode(WorkflowExecutionMode mode) {
        log.info("Switching Workflow Engine execution mode to: {}", mode);
        this.executionMode.set(mode != null ? mode : WorkflowExecutionMode.REAL);
    }

    // =========================================================================
    // 2. WORKFLOW DEFINITION CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<WorkflowDefinitionDto> getAllDefinitions() {
        return definitionRepository.findAll().stream()
                .map(this::toDefinitionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkflowDefinitionDto getDefinitionByCode(String workflowCode) {
        return definitionRepository.findByWorkflowCode(workflowCode)
                .map(this::toDefinitionDto)
                .orElseThrow(() -> new IllegalArgumentException("Workflow definition not found: " + workflowCode));
    }

    @Transactional
    public WorkflowDefinitionDto saveDefinition(WorkflowDefinitionDto dto) {
        if (dto.getCanvasGraph() != null) {
            List<String> validationErrors = graphValidator.validate(dto.getCanvasGraph());
            if (!validationErrors.isEmpty()) {
                throw new IllegalArgumentException("Workflow validation failed: " + String.join("; ", validationErrors));
            }
        }

        Optional<WorkflowDefinitionEntity> existingOpt = definitionRepository.findByWorkflowCode(dto.getWorkflowCode());
        WorkflowDefinitionEntity entity;

        String graphJson = serializeMap(dto.getCanvasGraph());

        if (existingOpt.isPresent()) {
            entity = existingOpt.get();
            entity.setName(dto.getName());
            entity.setDescription(dto.getDescription());
            entity.setCategory(dto.getCategory() != null ? dto.getCategory() : "GENERAL");
            entity.setCanvasGraph(graphJson);
            entity.setActive(dto.isActive());
        } else {
            entity = WorkflowDefinitionEntity.builder()
                    .workflowCode(dto.getWorkflowCode().trim())
                    .name(dto.getName().trim())
                    .description(dto.getDescription())
                    .category(dto.getCategory() != null ? dto.getCategory() : "GENERAL")
                    .canvasGraph(graphJson)
                    .active(dto.isActive())
                    .build();
        }

        WorkflowDefinitionEntity saved = definitionRepository.save(entity);
        log.info("Saved workflow definition '{}' ({})", saved.getWorkflowCode(), saved.getName());
        return toDefinitionDto(saved);
    }

    // =========================================================================
    // 3. WORKFLOW TRIGGER & EXECUTION
    // =========================================================================

    @Transactional
    public WorkflowInstanceDto triggerWorkflow(TriggerWorkflowRequest request) {
        WorkflowDefinitionEntity def = definitionRepository.findByWorkflowCode(request.getWorkflowCode())
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + request.getWorkflowCode()));

        Map<String, Object> graph = deserializeMap(def.getCanvasGraph());
        List<Map<String, Object>> nodes = extractList(graph.get("nodes"));
        List<Map<String, Object>> edges = extractList(graph.get("edges"));

        // Determine execution mode (request override or engine-level mode)
        boolean simulationMode = request.getSimulationMode() != null
                ? request.getSimulationMode()
                : (this.executionMode.get() == WorkflowExecutionMode.SIMULATION);

        // Find trigger node
        String requestedTriggerNodeId = (request.getInitialContext() != null && request.getInitialContext().get("triggeredByNodeId") != null)
                ? String.valueOf(request.getInitialContext().get("triggeredByNodeId"))
                : null;

        Map<String, Object> triggerNode = null;
        if (requestedTriggerNodeId != null && !requestedTriggerNodeId.isBlank() && !"null".equals(requestedTriggerNodeId)) {
            triggerNode = nodes.stream()
                    .filter(n -> requestedTriggerNodeId.equals(String.valueOf(n.get("id"))))
                    .findFirst()
                    .orElse(null);
        }
        if (triggerNode == null) {
            triggerNode = nodes.stream()
                    .filter(n -> "TRIGGER".equalsIgnoreCase(String.valueOf(n.get("type"))))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Workflow has no TRIGGER node: " + request.getWorkflowCode()));
        }

        String triggerNodeId = String.valueOf(triggerNode.get("id"));

        Map<String, Object> initialContext = new HashMap<>();
        if (request.getInitialContext() != null) {
            initialContext.putAll(request.getInitialContext());
        }
        if (request.getEntityReference() != null) {
            initialContext.put("entityReference", request.getEntityReference());
        }
        initialContext.put("workflowCode", def.getWorkflowCode());
        initialContext.put("isSimulated", simulationMode);
        initialContext.put("startTime", Instant.now().toString());

        WorkflowInstanceEntity instance = WorkflowInstanceEntity.builder()
                .workflowCode(def.getWorkflowCode())
                .entityReference(request.getEntityReference())
                .status("RUNNING")
                .currentNodeId(triggerNodeId)
                .contextData(serializeMap(initialContext))
                .build();

        WorkflowInstanceEntity savedInstance = instanceRepository.save(instance);
        log.info("Triggered workflow instance ID '{}' (mode={}) for entity '{}'",
                savedInstance.getId(), simulationMode ? "SIMULATION" : "REAL", request.getEntityReference());

        // Step 1: Record Trigger node
        structuredLogger.logStep(
                savedInstance.getId(),
                def.getWorkflowCode(),
                savedInstance.getEntityReference(),
                1,
                triggerNodeId,
                "TRIGGER",
                String.valueOf(triggerNode.get("label")),
                initialContext,
                initialContext,
                "SUCCESS",
                5L,
                null
        );

        // Advance downstream execution
        advanceWorkflow(savedInstance, nodes, edges, 2, simulationMode);

        return toInstanceDto(savedInstance);
    }

    /**
     * Recursively advances workflow nodes across edges until paused or completed.
     */
    private void advanceWorkflow(
            WorkflowInstanceEntity instance,
            List<Map<String, Object>> nodes,
            List<Map<String, Object>> edges,
            int stepSeq,
            boolean simulationMode) {

        if (stepSeq > MAX_WORKFLOW_STEPS) {
            instance.setStatus("FAILED");
            instance.setErrorMessage("Execution depth exceeded limit (" + MAX_WORKFLOW_STEPS + " steps) - cycle detected");
            instanceRepository.save(instance);
            log.error("Workflow instance '{}' aborted: cycle detected at step {}", instance.getId(), stepSeq);
            return;
        }

        String currentId = instance.getCurrentNodeId();
        Map<String, Object> currentNode = findNode(nodes, currentId);
        String currentNodeType = currentNode != null ? String.valueOf(currentNode.get("type")) : "UNKNOWN";
        Map<String, Object> context = deserializeMap(instance.getContextData());

        // Resolve next target node using smart edge router
        Optional<String> nextNodeIdOpt = edgeRouter.resolveNextNode(currentId, currentNodeType, "SUCCESS", edges, context);

        if (nextNodeIdOpt.isEmpty()) {
            instance.setStatus("COMPLETED");
            instanceRepository.save(instance);
            log.info("Workflow instance '{}' completed (no outgoing edges from node '{}')", instance.getId(), currentId);
            return;
        }

        String nextNodeId = nextNodeIdOpt.get();
        Map<String, Object> targetNode = findNode(nodes, nextNodeId);

        if (targetNode == null) {
            instance.setStatus("FAILED");
            instance.setErrorMessage("Edge points to non-existent node: " + nextNodeId);
            instanceRepository.save(instance);
            return;
        }

        instance.setCurrentNodeId(nextNodeId);
        String nodeType = String.valueOf(targetNode.get("type"));
        String nodeLabel = String.valueOf(targetNode.get("label"));
        Map<String, Object> nodeConfig = extractMap(targetNode.get("config"));

        WorkflowNodeExecutionContext nodeCtx = WorkflowNodeExecutionContext.builder()
                .nodeId(nextNodeId)
                .nodeType(nodeType)
                .nodeLabel(nodeLabel)
                .nodeConfig(nodeConfig)
                .context(context)
                .instance(instance)
                .simulationMode(simulationMode)
                .build();

        long startTime = System.currentTimeMillis();
        NodeExecutionResult result = nodeRegistry.executeNode(nodeCtx);
        long duration = Math.max(1, System.currentTimeMillis() - startTime);

        // Merge node output into context
        if (result.getOutputData() != null && !result.getOutputData().isEmpty()) {
            context.putAll(result.getOutputData());
            instance.setContextData(serializeMap(context));
        }

        // Structured MDC logging and audit record
        structuredLogger.logStep(
                instance.getId(),
                instance.getWorkflowCode(),
                instance.getEntityReference(),
                stepSeq,
                nextNodeId,
                nodeType,
                nodeLabel,
                nodeConfig,
                result.getOutputData(),
                result.getStatus(),
                duration,
                result.getErrorMessage()
        );

        // Defensive failure handling with fallback routing
        if ("FAILED".equalsIgnoreCase(result.getStatus())) {
            Optional<String> failureBranchOpt = edgeRouter.resolveNextNode(nextNodeId, nodeType, "FAILED", edges, context);
            if (failureBranchOpt.isPresent()) {
                String failureTarget = failureBranchOpt.get();
                log.warn("Node '{}' failed ({}), diverting to failure fallback edge target '{}'",
                        nextNodeId, result.getErrorMessage(), failureTarget);
                instance.setCurrentNodeId(failureTarget);
                instanceRepository.save(instance);
                advanceWorkflow(instance, nodes, edges, stepSeq + 1, simulationMode);
                return;
            }

            instance.setStatus("FAILED");
            instance.setErrorMessage(result.getErrorMessage());
            instanceRepository.save(instance);
            log.warn("Workflow instance '{}' failed at node '{}': {}", instance.getId(), nextNodeId, result.getErrorMessage());
            return;
        }

        if ("PAUSED_WAITING".equalsIgnoreCase(result.getStatus())) {
            instance.setStatus("WAITING_CALLBACK");
            instance.setCorrelationKey(result.getCorrelationKey());
            instanceRepository.save(instance);
            log.info("Workflow instance '{}' paused at node '{}' awaiting callback key '{}'",
                    instance.getId(), nextNodeId, result.getCorrelationKey());
            return;
        }

        if ("TERMINATOR".equalsIgnoreCase(nodeType)) {
            String completionStatus = String.valueOf(nodeConfig.getOrDefault("completionStatus", "COMPLETED")).trim().toUpperCase();
            instance.setStatus(completionStatus.isEmpty() ? "COMPLETED" : completionStatus);
            instanceRepository.save(instance);
            log.info("Workflow instance '{}' reached TERMINATOR node '{}' with status '{}'",
                    instance.getId(), nextNodeId, instance.getStatus());
            return;
        }

        instanceRepository.save(instance);
        advanceWorkflow(instance, nodes, edges, stepSeq + 1, simulationMode);
    }

    // =========================================================================
    // 4. ASYNC CALLBACK & RESUMPTION
    // =========================================================================

    @Transactional
    public WorkflowInstanceDto handleCallback(String correlationKey, Map<String, Object> callbackPayload) {
        WorkflowInstanceEntity instance = instanceRepository.findByCorrelationKey(correlationKey)
                .orElseThrow(() -> new IllegalArgumentException("No waiting workflow instance with correlation key: " + correlationKey));

        log.info("Received callback for key '{}', resuming instance '{}'", correlationKey, instance.getId());

        WorkflowDefinitionEntity def = definitionRepository.findByWorkflowCode(instance.getWorkflowCode())
                .orElseThrow(() -> new IllegalStateException("Workflow definition missing: " + instance.getWorkflowCode()));

        Map<String, Object> graph = deserializeMap(def.getCanvasGraph());
        List<Map<String, Object>> nodes = extractList(graph.get("nodes"));
        List<Map<String, Object>> edges = extractList(graph.get("edges"));

        Map<String, Object> context = deserializeMap(instance.getContextData());
        if (callbackPayload != null) {
            context.put("callbackPayload", callbackPayload);
            context.put("callbackReceivedAt", Instant.now().toString());
        }
        instance.setContextData(serializeMap(context));
        instance.setStatus("RUNNING");
        instance.setCorrelationKey(null);
        instanceRepository.save(instance);

        boolean simulationMode = Boolean.parseBoolean(String.valueOf(context.getOrDefault("isSimulated", false)));
        int nextSeq = logRepository.findByInstanceIdOrderByStepSequenceAsc(instance.getId()).size() + 1;
        advanceWorkflow(instance, nodes, edges, nextSeq, simulationMode);

        return toInstanceDto(instance);
    }

    // =========================================================================
    // 5. OBSERVABILITY & DIAGNOSTICS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<WorkflowExecutionLogDto> getInstanceLogs(UUID instanceId) {
        return logRepository.findByInstanceIdOrderByStepSequenceAsc(instanceId).stream()
                .map(this::toLogDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkflowTraceDto getExecutionTrace(UUID instanceId) {
        WorkflowInstanceEntity instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow instance not found: " + instanceId));
        return structuredLogger.getExecutionTrace(instance);
    }

    @Transactional(readOnly = true)
    public List<WorkflowInstanceDto> getInstances(String workflowCode) {
        List<WorkflowInstanceEntity> list;
        if (workflowCode != null && !workflowCode.isBlank()) {
            list = instanceRepository.findByWorkflowCodeOrderByCreatedAtDesc(workflowCode.trim());
        } else {
            list = instanceRepository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(this::toInstanceDto).toList();
    }

    // =========================================================================
    // 6. HELPERS & MAPPING
    // =========================================================================

    private Map<String, Object> findNode(List<Map<String, Object>> nodes, String nodeId) {
        if (nodes == null || nodeId == null) return null;
        return nodes.stream()
                .filter(n -> nodeId.equals(String.valueOf(n.get("id"))))
                .findFirst()
                .orElse(null);
    }

    private WorkflowDefinitionDto toDefinitionDto(WorkflowDefinitionEntity entity) {
        return WorkflowDefinitionDto.builder()
                .id(entity.getId())
                .workflowCode(entity.getWorkflowCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .category(entity.getCategory())
                .version(entity.getVersion())
                .canvasGraph(deserializeMap(entity.getCanvasGraph()))
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private WorkflowInstanceDto toInstanceDto(WorkflowInstanceEntity entity) {
        return WorkflowInstanceDto.builder()
                .id(entity.getId())
                .workflowCode(entity.getWorkflowCode())
                .entityReference(entity.getEntityReference())
                .status(entity.getStatus())
                .currentNodeId(entity.getCurrentNodeId())
                .correlationKey(entity.getCorrelationKey())
                .contextData(deserializeMap(entity.getContextData()))
                .errorMessage(entity.getErrorMessage())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private WorkflowExecutionLogDto toLogDto(WorkflowExecutionLogEntity entity) {
        return WorkflowExecutionLogDto.builder()
                .id(entity.getId())
                .instanceId(entity.getInstanceId())
                .stepSequence(entity.getStepSequence())
                .nodeId(entity.getNodeId())
                .nodeType(entity.getNodeType())
                .nodeName(entity.getNodeName())
                .inputData(deserializeMap(entity.getInputData()))
                .outputData(deserializeMap(entity.getOutputData()))
                .status(entity.getStatus())
                .durationMs(entity.getDurationMs())
                .errorDetails(entity.getErrorDetails())
                .executedAt(entity.getExecutedAt())
                .build();
    }

    private String serializeMap(Object map) {
        if (map == null) return "{}";
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Object> deserializeMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractList(Object obj) {
        if (obj instanceof List) {
            return (List<Map<String, Object>>) obj;
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractMap(Object obj) {
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        return Collections.emptyMap();
    }
}
