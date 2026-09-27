package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Handler for Exclusive Decision Gateways (XOR Split).
 */
@Slf4j
@Component
public class GatewayExclusiveHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "GATEWAY_EXCLUSIVE".equalsIgnoreCase(nodeType)
                || "SWITCH".equalsIgnoreCase(nodeType)
                || "DECISION".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        log.info("Evaluating exclusive decision gateway '{}'", context.nodeLabel());
        return NodeExecutionResult.success(Map.of(
                "gatewayType", "EXCLUSIVE",
                "evaluatedNode", context.nodeId()
        ));
    }
}
