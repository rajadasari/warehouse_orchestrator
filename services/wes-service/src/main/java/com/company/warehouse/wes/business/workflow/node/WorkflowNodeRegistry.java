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

        log.info("No dedicated handler for step '{}' ({}), passing as generic success", context.nodeLabel(), nodeType);
        return NodeExecutionResult.success(Map.of("executed", true, "genericType", nodeType));
    }
}
