package com.company.warehouse.wes.business.workflow.node;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Spring-managed registry dispatching node execution to matching WorkflowNodeHandler beans.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowNodeRegistry {

    private final List<WorkflowNodeHandler> handlers;

    public boolean supports(String nodeType) {
        if (nodeType == null || nodeType.isBlank()) return false;
        return handlers.stream().anyMatch(h -> h.supports(nodeType));
    }

    public NodeExecutionResult executeNode(WorkflowNodeExecutionContext context) {
        String nodeType = context.nodeType();
        for (WorkflowNodeHandler handler : handlers) {
            if (handler.supports(nodeType)) {
                try {
                    return handler.execute(context);
                } catch (Exception e) {
                    log.error("Handler error executing node '{}' ({}): {}",
                            context.nodeLabel(), nodeType, e.getMessage(), e);
                    return NodeExecutionResult.failed(e.getMessage());
                }
            }
        }

        log.warn("No dedicated handler found for node '{}' (type: {}). Rejecting execution.", context.nodeLabel(), nodeType);
        return NodeExecutionResult.failed(String.format("Unsupported workflow node type '%s' on node '%s'", nodeType, context.nodeLabel()));
    }
}
