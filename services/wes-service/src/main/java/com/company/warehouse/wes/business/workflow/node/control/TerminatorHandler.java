package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Handler for Terminator / End nodes concluding workflow execution.
 */
@Component
public class TerminatorHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "TERMINATOR".equalsIgnoreCase(nodeType) || "END".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        return NodeExecutionResult.success(Map.of(
                "completedAt", Instant.now().toString(),
                "terminalNode", context.nodeId()
        ));
    }
}
