package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Explicit handler for TRIGGER nodes to record event initialization.
 */
@Slf4j
@Component
public class TriggerHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "TRIGGER".equalsIgnoreCase(nodeType)
                || "START".equalsIgnoreCase(nodeType)
                || "EVENT_TRIGGER".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        log.info("Trigger handler executed for node '{}' [{}]", context.nodeLabel(), context.nodeId());
        java.util.Map<String, Object> out = new java.util.HashMap<>();
        out.put("triggerNodeId", context.nodeId());
        out.put("triggerType", context.nodeType());
        out.put("executed", true);

        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String mode = String.valueOf(cfg.getOrDefault("triggerPayloadMode", "CONFIGURED_INPUTS"));
        if (!"SIMPLE_START".equalsIgnoreCase(mode)) {
            if (cfg.get("initialPayload") instanceof Map<?, ?> payloadMap) {
                payloadMap.forEach((k, v) -> out.put(String.valueOf(k), v));
            }
        }
        return NodeExecutionResult.success(out);
    }
}
