package com.company.warehouse.wes.business.workflow.node.equipment;

import com.company.warehouse.wes.business.resource.composer.service.EntityServiceDispatcher;
import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Universal Workflow Node Handler for executing methods on concrete industrial resources.
 * Bridges Workflow Canvas nodes (e.g. Conveyor start, AMR navigation, Crane pickup)
 * directly to target equipment and software adapters via EntityServiceDispatcher.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResourceActionHandler implements WorkflowNodeHandler {

    private final EntityServiceDispatcher entityServiceDispatcher;

    private static final Pattern CONTEXT_REF_PATTERN = Pattern.compile("^#\\{context\\.([a-zA-Z0-9_.-]+)\\}$");

    @Override
    public boolean supports(String nodeType) {
        return "RESOURCE_ACTION".equalsIgnoreCase(nodeType)
                || "RESOURCE_METHOD".equalsIgnoreCase(nodeType)
                || "EQUIPMENT_METHOD".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();

        String resourceId = String.valueOf(cfg.getOrDefault("resourceId", "")).trim();
        String methodName = String.valueOf(cfg.getOrDefault("methodName", "")).trim();
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "actionResult")).trim();

        if (resourceId.isBlank() || methodName.isBlank()) {
            return NodeExecutionResult.failed("RESOURCE_ACTION requires both 'resourceId' and 'methodName' to be configured");
        }

        log.info("Executing ResourceAction: resource='{}', method='{}', node='{}' (simMode={})",
                resourceId, methodName, context.nodeLabel(), context.simulationMode());

        // Resolve input parameter bindings against workflow context
        Map<String, Object> rawParams = new HashMap<>();
        if (cfg.get("parameterBindings") instanceof Map<?, ?> bindingsMap) {
            bindingsMap.forEach((k, v) -> rawParams.put(String.valueOf(k), v));
        } else if (cfg.get("parameters") instanceof Map<?, ?> paramsMap) {
            paramsMap.forEach((k, v) -> rawParams.put(String.valueOf(k), v));
        }

        Map<String, Object> resolvedParams = resolveParameters(rawParams, context.context());

        // In simulation mode, return simulated success unless explicitly executing against live simulator
        if (context.simulationMode() && !Boolean.TRUE.equals(cfg.get("executeInSimulation"))) {
            Map<String, Object> simData = new HashMap<>();
            simData.put("resourceId", resourceId);
            simData.put("methodName", methodName);
            simData.put("status", "SIMULATED_SUCCESS");
            simData.put("parameters", resolvedParams);
            simData.put("simulated", true);
            simData.put("timestamp", java.time.Instant.now().toString());

            Map<String, Object> out = new HashMap<>();
            out.put(outputVar, simData);
            out.put("lastExecutedMethod", methodName);
            out.put("lastExecutedResource", resourceId);
            return NodeExecutionResult.success(out);
        }

        try {
            MethodExecutionResult result = entityServiceDispatcher.execute(resourceId, methodName, resolvedParams);
            if (!result.isSuccess()) {
                String errMsg = result.getMessage() != null ? result.getMessage() : "Resource action failed";
                log.warn("Resource action '{}.{}' failed: {}", resourceId, methodName, errMsg);
                return NodeExecutionResult.failed(errMsg);
            }

            Map<String, Object> out = new HashMap<>();
            Object resultPayload = result.getData() != null ? result.getData() : Map.of();
            out.put(outputVar, resultPayload);
            out.put("lastExecutedMethod", methodName);
            out.put("lastExecutedResource", resourceId);
            out.put("actionStatusCode", result.getStatusCode());

            return NodeExecutionResult.success(out);
        } catch (Exception e) {
            log.error("Unhandled error executing '{}.{}': {}", resourceId, methodName, e.getMessage(), e);
            return NodeExecutionResult.failed("Execution error: " + e.getMessage());
        }
    }

    private Map<String, Object> resolveParameters(Map<String, Object> rawParams, Map<String, Object> workflowContext) {
        Map<String, Object> resolved = new HashMap<>();
        if (rawParams == null || rawParams.isEmpty()) {
            return resolved;
        }

        for (Map.Entry<String, Object> entry : rawParams.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof String strVal) {
                Matcher m = CONTEXT_REF_PATTERN.matcher(strVal.trim());
                if (m.matches() && workflowContext != null) {
                    String ctxKey = m.group(1);
                    resolved.put(entry.getKey(), workflowContext.getOrDefault(ctxKey, strVal));
                } else if (workflowContext != null && workflowContext.containsKey(strVal.trim())) {
                    resolved.put(entry.getKey(), workflowContext.get(strVal.trim()));
                } else {
                    resolved.put(entry.getKey(), strVal);
                }
            } else {
                resolved.put(entry.getKey(), val);
            }
        }
        return resolved;
    }
}
