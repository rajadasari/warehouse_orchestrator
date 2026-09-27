package com.company.warehouse.wes.business.workflow.node.equipment;

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
 * Handler for dispatching physical equipment missions (AGVs/AMRs, AS/RS cranes, sorters).
 */
@Slf4j
@Component
public class EquipmentDispatchHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "EQUIPMENT_DISPATCH".equalsIgnoreCase(nodeType)
                || "AMR_MISSION".equalsIgnoreCase(nodeType)
                || "CRANE_PUTAWAY".equalsIgnoreCase(nodeType)
                || "CRANE_RETRIEVE".equalsIgnoreCase(nodeType)
                || "ASRS_ACTION".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String eqType = String.valueOf(cfg.getOrDefault("equipmentType", "AMR"));
        String targetLoc = String.valueOf(cfg.getOrDefault("targetLocation", "AISLE-01-BAY-05"));
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "equipmentMission"));

        String missionId = "MSN-" + eqType + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("EquipmentDispatch: Dispatching mission '{}' (type={}, targetLoc={}, simMode={})",
                missionId, eqType, targetLoc, context.simulationMode());

        Map<String, Object> missionData = new HashMap<>();
        missionData.put("missionId", missionId);
        missionData.put("equipmentType", eqType);
        missionData.put("targetLocation", targetLoc);
        missionData.put("status", "MISSION_COMPLETED");
        missionData.put("simulated", context.simulationMode());
        missionData.put("dispatchedAt", Instant.now().toString());

        Map<String, Object> out = new HashMap<>();
        out.put(outputVar, missionData);
        out.put("currentMissionId", missionId);
        out.put("equipmentStatus", "MISSION_COMPLETED");

        return NodeExecutionResult.success(out);
    }
}
