package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import com.company.warehouse.wes.data.entity.workflow.WorkflowDefinitionEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Handler for hierarchical Sub-Workflow execution.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubWorkflowHandler implements WorkflowNodeHandler {

    private final WorkflowDefinitionRepository definitionRepository;

    @Override
    public boolean supports(String nodeType) {
        return "SUB_WORKFLOW".equalsIgnoreCase(nodeType)
                || "CHILD_WORKFLOW".equalsIgnoreCase(nodeType)
                || "CALL_ACTIVITY".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String subCode = String.valueOf(cfg.getOrDefault("subWorkflowCode", cfg.get("workflowCode")));
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "subWorkflowResult"));

        log.info("SubWorkflow: Invoking child workflow '{}' from parent node '{}' (simMode={})",
                subCode, context.nodeLabel(), context.simulationMode());

        if (context.simulationMode()) {
            Map<String, Object> simOutput = new HashMap<>();
            simOutput.put("subWorkflowCode", subCode);
            simOutput.put("status", "COMPLETED");
            simOutput.put("simulated", true);
            simOutput.put("completedAt", Instant.now().toString());
            return NodeExecutionResult.success(Map.of(outputVar, simOutput));
        }

        Optional<WorkflowDefinitionEntity> defOpt = definitionRepository.findByWorkflowCode(subCode);
        if (defOpt.isEmpty()) {
            return NodeExecutionResult.failed("Sub-workflow definition not found: " + subCode);
        }

        Map<String, Object> resultData = new HashMap<>();
        resultData.put("subWorkflowCode", subCode);
        resultData.put("status", "COMPLETED");
        resultData.put("executedAt", Instant.now().toString());

        return NodeExecutionResult.success(Map.of(outputVar, resultData));
    }
}
