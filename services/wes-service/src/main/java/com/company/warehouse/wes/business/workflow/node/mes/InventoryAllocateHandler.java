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
 * Handler for Inventory Allocation and Bin Reservation in WMS/WES.
 */
@Slf4j
@Component
public class InventoryAllocateHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "INVENTORY_ALLOCATE".equalsIgnoreCase(nodeType)
                || "BIN_ALLOCATION".equalsIgnoreCase(nodeType)
                || "RESERVE_LOCATION".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();

        String zone = String.valueOf(cfg.getOrDefault("zone", "DEFAULT_ZONE"));
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "allocatedLocation"));

        String allocatedBin;
        if (cfg.containsKey("targetLocation")) {
            allocatedBin = String.valueOf(cfg.get("targetLocation"));
        } else if (context.simulationMode()) {
            allocatedBin = "BIN-SIM-" + zone + "-01-08";
        } else {
            allocatedBin = "LOC-" + zone + "-R01-B04";
        }

        log.info("InventoryAllocate: Allocated bin '{}' in zone '{}' (simMode={})",
                allocatedBin, zone, context.simulationMode());

        Map<String, Object> allocData = new HashMap<>();
        allocData.put("allocatedBin", allocatedBin);
        allocData.put("zone", zone);
        allocData.put("allocationId", "ALC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        allocData.put("allocatedAt", Instant.now().toString());

        Map<String, Object> out = new HashMap<>();
        out.put(outputVar, allocData);
        out.put("allocatedBin", allocatedBin);
        out.put("targetLocation", allocatedBin);

        return NodeExecutionResult.success(out);
    }
}
