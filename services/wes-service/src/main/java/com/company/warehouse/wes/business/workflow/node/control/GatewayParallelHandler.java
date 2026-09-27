package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Handler for Parallel Fork/Join Gateways (AND Split).
 */
@Slf4j
@Component
public class GatewayParallelHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "GATEWAY_PARALLEL".equalsIgnoreCase(nodeType)
                || "FORK".equalsIgnoreCase(nodeType)
                || "JOIN".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        log.info("Executing parallel gateway '{}'", context.nodeLabel());
        return NodeExecutionResult.success(Map.of(
                "gatewayType", "PARALLEL",
                "evaluatedNode", context.nodeId()
        ));
    }
}
