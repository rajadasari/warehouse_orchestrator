package com.company.warehouse.wes.business.workflow.node.mes;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Handler for Material Staging, WIP Buffer Staging, and Production Kitting (MES Level 3).
 */
@Slf4j
@Component
public class MaterialStageHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "MATERIAL_STAGE".equalsIgnoreCase(nodeType)
                || "WIP_STAGING".equalsIgnoreCase(nodeType)
                || "KITTING".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String stageZone = String.valueOf(cfg.getOrDefault("stageZone", "PRODUCTION_BUFFER_01"));
        String workOrder = String.valueOf(cfg.getOrDefault("workOrder", "WO-DEFAULT"));
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "stagingResult"));

        String stageBatchId = "STAGE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("MaterialStage: Staged batch '{}' for workOrder '{}' in buffer '{}'",
                stageBatchId, workOrder, stageZone);

        Map<String, Object> stageData = new HashMap<>();
        stageData.put("stageBatchId", stageBatchId);
        stageData.put("stageZone", stageZone);
        stageData.put("workOrder", workOrder);
        stageData.put("status", "STAGED");
        stageData.put("stagedAt", Instant.now().toString());

        Map<String, Object> out = new HashMap<>();
        out.put(outputVar, stageData);
        out.put("stagedBuffer", stageZone);

        return NodeExecutionResult.success(out);
    }
}
