package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Handler for Asynchronous Gates pausing execution awaiting an external callback.
 */
@Slf4j
@Component
public class AsyncGateHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "ASYNC_GATE".equalsIgnoreCase(nodeType) || "WAIT_CALLBACK".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String correlationPrefix = String.valueOf(cfg.getOrDefault("correlationPrefix", "CORR"));

        String uniqueId = (context.instance() != null && context.instance().getId() != null)
                ? context.instance().getId().toString().substring(0, 8).toUpperCase()
                : UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        String correlationKey = correlationPrefix + "-" + uniqueId;
        log.info("ASYNC_GATE Node pausing flow. Awaiting callback key: '{}' (simMode={})", correlationKey, context.simulationMode());

        if (context.simulationMode()) {
            // In simulation mode, optionally auto-resolve or return waiting
            return NodeExecutionResult.success(Map.of(
                    "gateResolved", true,
                    "simulatedCallbackKey", correlationKey
            ));
        }

        return NodeExecutionResult.pausedWaiting(correlationKey, Map.of("awaitingKey", correlationKey));
    }
}
