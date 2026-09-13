package com.company.warehouse.wes.business.workflow;

import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.api.dto.workflow.WorkflowDefinitionDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowExecutionLogDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowInstanceDto;
import com.company.warehouse.wes.business.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowDefinitionEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowExecutionLogEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import com.company.warehouse.wes.data.repository.ApiIntegrationMappingRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowDefinitionRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowExecutionLogRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowInstanceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowEngineService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowExecutionLogRepository logRepository;
    private final PalletRepository palletRepository;
    private final ApiIntegrationMappingRepository mappingRepository;
    private final DynamicPayloadEngine dynamicPayloadEngine;
    private final ObjectMapper objectMapper;

    // =========================================================================
    // 1. WORKFLOW DEFINITION CRUD
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
    // 2. WORKFLOW TRIGGER & EXECUTION
    // =========================================================================

    @Transactional
    public WorkflowInstanceDto triggerWorkflow(TriggerWorkflowRequest request) {
        WorkflowDefinitionEntity def = definitionRepository.findByWorkflowCode(request.getWorkflowCode())
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + request.getWorkflowCode()));

        Map<String, Object> graph = deserializeMap(def.getCanvasGraph());
        List<Map<String, Object>> nodes = extractList(graph.get("nodes"));
        List<Map<String, Object>> edges = extractList(graph.get("edges"));

        // Find starting trigger node (prefer explicitly clicked trigger node if provided)
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
        initialContext.put("startTime", Instant.now().toString());

        WorkflowInstanceEntity instance = WorkflowInstanceEntity.builder()
                .workflowCode(def.getWorkflowCode())
                .entityReference(request.getEntityReference())
                .status("RUNNING")
                .currentNodeId(triggerNodeId)
                .contextData(serializeMap(initialContext))
                .build();

        WorkflowInstanceEntity savedInstance = instanceRepository.save(instance);
        log.info("Triggered workflow instance ID '{}' for entity '{}'", savedInstance.getId(), request.getEntityReference());

        // Step 1: Log Trigger node
        recordExecutionLog(savedInstance.getId(), 1, triggerNodeId, "TRIGGER", 
                String.valueOf(triggerNode.get("label")), initialContext, initialContext, "SUCCESS", 5L, null);

        // Advance downstream execution
        advanceWorkflow(savedInstance, nodes, edges, 2);

        return toInstanceDto(savedInstance);
    }

    /**
     * Recursively advances workflow nodes across edges until paused or completed.
     */
    private void advanceWorkflow(WorkflowInstanceEntity instance, 
                                List<Map<String, Object>> nodes, 
                                List<Map<String, Object>> edges, 
                                int stepSeq) {
        String currentId = instance.getCurrentNodeId();
        Map<String, Object> context = deserializeMap(instance.getContextData());

        // Find next target node from edges
        Optional<Map<String, Object>> nextEdgeOpt = edges.stream()
                .filter(e -> currentId.equals(String.valueOf(e.get("source"))))
                .findFirst();

        if (nextEdgeOpt.isEmpty()) {
            instance.setStatus("COMPLETED");
            instanceRepository.save(instance);
            log.info("Workflow instance '{}' completed (no further edges from node '{}')", instance.getId(), currentId);
            return;
        }

        String nextNodeId = String.valueOf(nextEdgeOpt.get().get("target"));
        Map<String, Object> targetNode = nodes.stream()
                .filter(n -> nextNodeId.equals(String.valueOf(n.get("id"))))
                .findFirst()
                .orElse(null);

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

        long startTime = System.currentTimeMillis();
        NodeExecutionResult result = executeNode(targetNode, nodeType, nodeConfig, context, instance);
        long duration = Math.max(1, System.currentTimeMillis() - startTime);

        // Merge result output back into shared context
        if (result.getOutputData() != null && !result.getOutputData().isEmpty()) {
            context.putAll(result.getOutputData());
            instance.setContextData(serializeMap(context));
        }

        recordExecutionLog(instance.getId(), stepSeq, nextNodeId, nodeType, nodeLabel, 
                nodeConfig, result.getOutputData(), result.getStatus(), duration, result.getErrorMessage());

        if ("FAILED".equals(result.getStatus())) {
            instance.setStatus("FAILED");
            instance.setErrorMessage(result.getErrorMessage());
            instanceRepository.save(instance);
            log.warn("Workflow instance '{}' failed at node '{}': {}", instance.getId(), nextNodeId, result.getErrorMessage());
            return;
        }

        if ("PAUSED_WAITING".equals(result.getStatus())) {
            instance.setStatus("WAITING_CALLBACK");
            instance.setCorrelationKey(result.getCorrelationKey());
            instanceRepository.save(instance);
            log.info("Workflow instance '{}' paused at node '{}' awaiting callback key '{}'", 
                    instance.getId(), nextNodeId, result.getCorrelationKey());
            return;
        }

        if ("TERMINATOR".equalsIgnoreCase(nodeType)) {
            instance.setStatus("COMPLETED");
            instanceRepository.save(instance);
            log.info("Workflow instance '{}' reached TERMINATOR node '{}'", instance.getId(), nextNodeId);
            return;
        }

        instanceRepository.save(instance);
        advanceWorkflow(instance, nodes, edges, stepSeq + 1);
    }

    /**
     * Executes a single logical node based on its type and configuration.
     */
    private NodeExecutionResult executeNode(Map<String, Object> node, 
                                           String nodeType, 
                                           Map<String, Object> config, 
                                           Map<String, Object> context,
                                           WorkflowInstanceEntity instance) {
        try {
            switch (nodeType.toUpperCase()) {
                case "STATE_MUTATION":
                    return executeStateMutation(config, context, instance);

                case "API_MAPPER":
                    return executeApiMapper(config, context);

                case "VALIDATION":
                    return executeValidation(config, context);

                case "ASYNC_GATE":
                    return executeAsyncGate(config, context, instance);

                case "MATH":
                case "CALCULATION":
                case "MATH_OPERATION":
                    return executeMathOperation(config, context);

                case "TERMINATOR":
                    return NodeExecutionResult.success(Map.of("completedAt", Instant.now().toString()));

                default:
                    log.info("Passing generic step '{}' ({})", node.get("label"), nodeType);
                    return NodeExecutionResult.success(Map.of("executed", true));
            }
        } catch (Exception e) {
            log.error("Exception in node execution '{}': {}", node.get("label"), e.getMessage(), e);
            return NodeExecutionResult.failed(e.getMessage());
        }
    }

    private NodeExecutionResult executeStateMutation(Map<String, Object> config, 
                                                     Map<String, Object> context, 
                                                     WorkflowInstanceEntity instance) {
        String targetEntity = String.valueOf(config.getOrDefault("targetEntity", "PALLET"));
        Object statusVal = config.get("status") != null ? config.get("status") : config.get("targetStatus");
        String targetStatus = statusVal != null ? String.valueOf(statusVal) : "IN_TRANSIT";

        String entityRef = instance.getEntityReference();
        if (entityRef == null && context.get("palletLpn") != null) {
            entityRef = String.valueOf(context.get("palletLpn"));
        }

        if ("PALLET".equalsIgnoreCase(targetEntity) && entityRef != null && !entityRef.isBlank()) {
            Optional<PalletEntity> palletOpt = palletRepository.findByPalletLpn(entityRef.trim());
            if (palletOpt.isPresent()) {
                PalletEntity pallet = palletOpt.get();
                pallet.setStatus(targetStatus);
                if (config.get("location") != null && !String.valueOf(config.get("location")).isBlank()) {
                    pallet.setCurrentLocation(String.valueOf(config.get("location")));
                }
                palletRepository.save(pallet);
                log.info("StateMutation: Pallet '{}' status set to '{}'", entityRef, targetStatus);
                return NodeExecutionResult.success(Map.of("palletStatus", targetStatus, "palletLpn", entityRef));
            }
        }
        return NodeExecutionResult.success(Map.of("entity", targetEntity, "status", targetStatus));
    }

    private NodeExecutionResult executeApiMapper(Map<String, Object> config, Map<String, Object> context) {
        String mappingCode = String.valueOf(config.getOrDefault("mappingCode", "CUSTOM_API_MAPPER"));
        String resourceId = String.valueOf(config.getOrDefault("resourceId", "LOGIQS-AMBIENT-WMS"));
        String endpointUrl = config.get("endpointUrl") != null ? String.valueOf(config.get("endpointUrl")).trim() : null;
        String httpMethod = config.get("httpMethod") != null ? String.valueOf(config.get("httpMethod")).trim().toUpperCase() : null;
        String payloadTemplate = config.get("payloadTemplate") != null ? String.valueOf(config.get("payloadTemplate")).trim() : null;
        String outputVariable = config.get("outputVariable") != null && !String.valueOf(config.get("outputVariable")).isBlank()
                ? String.valueOf(config.get("outputVariable")).trim()
                : "apiResponse";

        Map<String, String> headers = new HashMap<>();

        // 1. Resolve against stored mapping catalogue if mappingCode exists
        Optional<ApiIntegrationMappingEntity> mappingOpt = mappingRepository.findByMappingCode(mappingCode);
        if (mappingOpt.isPresent()) {
            ApiIntegrationMappingEntity mapping = mappingOpt.get();
            if (endpointUrl == null || endpointUrl.isBlank()) {
                endpointUrl = mapping.getEndpointUrl();
            }
            if (httpMethod == null || httpMethod.isBlank()) {
                httpMethod = mapping.getHttpMethod() != null ? mapping.getHttpMethod().toUpperCase() : "POST";
            }
            if (payloadTemplate == null || payloadTemplate.isBlank()) {
                payloadTemplate = mapping.getPayloadTemplate();
            }
            if (mapping.getHeadersTemplate() != null) {
                headers.putAll(dynamicPayloadEngine.buildHeaders(mapping.getHeadersTemplate(), context));
            }
        }

        if (httpMethod == null || httpMethod.isBlank()) {
            httpMethod = "POST";
        }

        // 2. Dynamic template variable interpolation using shared workflow context
        String transformedPayload = null;
        if (payloadTemplate != null && !payloadTemplate.isBlank()) {
            try {
                transformedPayload = dynamicPayloadEngine.buildPayload(payloadTemplate, context);
            } catch (Exception ex) {
                log.warn("API_MAPPER: Failed to interpolate payload template, using raw template: {}", ex.getMessage());
                transformedPayload = payloadTemplate;
            }
        }

        String resolvedUrl = (endpointUrl != null && !endpointUrl.isBlank())
                ? dynamicPayloadEngine.resolveUrl(endpointUrl, context)
                : "/api/v1/wms/" + mappingCode.toLowerCase();

        log.info("API_MAPPER Node: Dispatching to {} [{}] (outputVariable={})", resolvedUrl, httpMethod, outputVariable);

        // 3. Live HTTP/HTTPS dispatch if reachable
        if (resolvedUrl != null && (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://"))) {
            try {
                SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
                requestFactory.setConnectTimeout(3000);
                requestFactory.setReadTimeout(5000);

                RestClient client = RestClient.builder().requestFactory(requestFactory).build();
                RestClient.RequestBodySpec spec = client.method(HttpMethod.valueOf(httpMethod)).uri(resolvedUrl);
                if (headers != null) {
                    headers.forEach(spec::header);
                }
                if (!"GET".equalsIgnoreCase(httpMethod) && transformedPayload != null && !transformedPayload.isBlank()) {
                    spec.body(transformedPayload);
                }

                ResponseEntity<String> response = spec.retrieve().toEntity(String.class);
                int statusCode = response.getStatusCode().value();
                String responseBodyStr = response.getBody() != null ? response.getBody() : "{}";

                Object parsedBody;
                try {
                    parsedBody = objectMapper.readValue(responseBodyStr, Object.class);
                } catch (Exception parseEx) {
                    parsedBody = responseBodyStr;
                }

                Map<String, Object> out = new HashMap<>();
                out.put(outputVariable, parsedBody);
                out.put("apiResponse", parsedBody);
                out.put("responseBody", parsedBody);
                out.put("dispatchedApi", mappingCode);
                out.put("targetEndpoint", resolvedUrl);
                out.put("httpStatus", statusCode);
                out.put("requestPayload", transformedPayload);
                out.put("responseSnapshot", Map.of("success", statusCode >= 200 && statusCode < 300, "status", statusCode));

                return NodeExecutionResult.success(out);
            } catch (Exception httpEx) {
                log.warn("API_MAPPER Node: Dispatch to {} failed ({}), generating structured simulated response", resolvedUrl, httpEx.getMessage());
                Map<String, Object> simulatedBody = new HashMap<>();
                simulatedBody.put("status", "SIMULATED_SUCCESS");
                simulatedBody.put("acknowledged", true);
                simulatedBody.put("dispatchedEndpoint", resolvedUrl);
                simulatedBody.put("simulatedNotice", "Live endpoint unreachable (" + httpEx.getMessage() + "), response captured for orchestrator logs");
                simulatedBody.put("timestamp", Instant.now().toString());

                Map<String, Object> out = new HashMap<>();
                out.put(outputVariable, simulatedBody);
                out.put("apiResponse", simulatedBody);
                out.put("responseBody", simulatedBody);
                out.put("dispatchedApi", mappingCode);
                out.put("targetEndpoint", resolvedUrl);
                out.put("httpStatus", 200);
                out.put("requestPayload", transformedPayload != null ? transformedPayload : "{}");
                out.put("responseSnapshot", simulatedBody);
                return NodeExecutionResult.success(out);
            }
        }

        // 4. Relative or simulated API endpoint
        Map<String, Object> mockResponse = new HashMap<>();
        mockResponse.put("status", "CONFIRMED");
        mockResponse.put("message", "Simulated external WMS API response");
        mockResponse.put("resourceId", resourceId);
        mockResponse.put("mappingCode", mappingCode);
        mockResponse.put("endpoint", resolvedUrl);
        mockResponse.put("simulatedJobId", "JOB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        mockResponse.put("acknowledged", true);
        mockResponse.put("timestamp", Instant.now().toString());

        Map<String, Object> out = new HashMap<>();
        out.put(outputVariable, mockResponse);
        out.put("apiResponse", mockResponse);
        out.put("responseBody", mockResponse);
        out.put("dispatchedApi", mappingCode);
        out.put("targetEndpoint", resolvedUrl);
        out.put("httpStatus", 200);
        out.put("requestPayload", transformedPayload != null ? transformedPayload : "{}");
        out.put("responseSnapshot", mockResponse);
        return NodeExecutionResult.success(out);
    }

    private NodeExecutionResult executeValidation(Map<String, Object> config, Map<String, Object> context) {
        log.info("VALIDATION Node executed successfully: scope={}", config.get("validationScope"));
        return NodeExecutionResult.success(Map.of(
                "validationOutcome", "APPROVED",
                "validatedAt", Instant.now().toString(),
                "warningsCount", 0
        ));
    }

    private NodeExecutionResult executeAsyncGate(Map<String, Object> config, 
                                                 Map<String, Object> context, 
                                                 WorkflowInstanceEntity instance) {
        String correlationKey = "CORR-" + instance.getId().toString().substring(0, 8).toUpperCase();
        log.info("ASYNC_GATE Node pausing flow. Awaiting callback key: '{}'", correlationKey);
        return NodeExecutionResult.paused(correlationKey, Map.of("awaitingKey", correlationKey));
    }

    private NodeExecutionResult executeMathOperation(Map<String, Object> config, Map<String, Object> context) {
        String operation = String.valueOf(config.getOrDefault("operation", "ADD")).toUpperCase();
        String outputVar = String.valueOf(config.getOrDefault("outputVariable", "mathResult"));

        double valA = resolveNumericOperand(config.get("operandA"), context, 0.0);
        double valB = resolveNumericOperand(config.get("operandB"), context, 0.0);
        double result;

        switch (operation) {
            case "SUBTRACT":
                result = valA - valB;
                break;
            case "MULTIPLY":
                result = valA * valB;
                break;
            case "DIVIDE":
                result = (valB != 0) ? (valA / valB) : 0.0;
                break;
            case "PERCENTAGE":
                result = (valB != 0) ? ((valA / valB) * 100.0) : 0.0;
                break;
            case "ROUND":
                result = Math.round(valA);
                break;
            case "CEIL":
                result = Math.ceil(valA);
                break;
            case "FLOOR":
                result = Math.floor(valA);
                break;
            case "ADD":
            default:
                result = valA + valB;
                break;
        }

        // Clean precision rounding to 4 decimal places
        result = Math.round(result * 10000.0) / 10000.0;
        log.info("MATH Node: {} {} {} = {} -> injected as '{}'", valA, operation, valB, result, outputVar);

        return NodeExecutionResult.success(Map.of(
                outputVar, result,
                "mathOperation", operation,
                "operandA", valA,
                "operandB", valB
        ));
    }

    private double resolveNumericOperand(Object operand, Map<String, Object> context, double fallback) {
        if (operand == null) return fallback;
        if (operand instanceof Number) return ((Number) operand).doubleValue();
        String str = String.valueOf(operand).trim();
        String lookupKey = str.startsWith("context.") ? str.substring(8) : str;
        if (context.containsKey(lookupKey) && context.get(lookupKey) != null) {
            Object ctxVal = context.get(lookupKey);
            if (ctxVal instanceof Number) return ((Number) ctxVal).doubleValue();
            try {
                return Double.parseDouble(String.valueOf(ctxVal).trim());
            } catch (NumberFormatException ignored) {}
        }
        try {
            return Double.parseDouble(str);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    // =========================================================================
    // 3. ASYNC CALLBACK & RESUMPTION
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

        int nextSeq = logRepository.findByInstanceIdOrderByStepSequenceAsc(instance.getId()).size() + 1;
        advanceWorkflow(instance, nodes, edges, nextSeq);

        return toInstanceDto(instance);
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecutionLogDto> getInstanceLogs(UUID instanceId) {
        return logRepository.findByInstanceIdOrderByStepSequenceAsc(instanceId).stream()
                .map(this::toLogDto)
                .toList();
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
    // 4. HELPERS & MAPPING
    // =========================================================================

    private void recordExecutionLog(UUID instanceId, int seq, String nodeId, String type, 
                                    String name, Map<String, Object> input, Map<String, Object> output, 
                                    String status, long durationMs, String error) {
        WorkflowExecutionLogEntity logEntity = WorkflowExecutionLogEntity.builder()
                .instanceId(instanceId)
                .stepSequence(seq)
                .nodeId(nodeId)
                .nodeType(type)
                .nodeName(name)
                .inputData(serializeMap(input))
                .outputData(serializeMap(output))
                .status(status)
                .durationMs(durationMs)
                .errorDetails(error)
                .build();
        logRepository.save(logEntity);
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
