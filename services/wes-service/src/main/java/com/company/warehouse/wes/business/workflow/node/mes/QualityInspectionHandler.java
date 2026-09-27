package com.company.warehouse.wes.business.workflow.node.mes;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Handler for Quality Inspection, Allergen Segregation, and QA Hold decisions (WES/MES ISA-95 Level 3).
 */
@Slf4j
@Component
public class QualityInspectionHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "QUALITY_INSPECTION".equalsIgnoreCase(nodeType)
                || "QA_CHECK".equalsIgnoreCase(nodeType)
                || "ALLERGEN_GATE".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        Map<String, Object> ctx = context.context() != null ? context.context() : Map.of();

        String inspectionType = String.valueOf(cfg.getOrDefault("inspectionType", "STANDARD_QA"));
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "qaResult"));

        // Evaluate QA criteria
        String verdict = "PASS";
        String failureReason = null;

        // 1. Temperature Check (if configured)
        if (cfg.containsKey("maxTemperatureC") && ctx.containsKey("measuredTempC")) {
            double maxTemp = Double.parseDouble(String.valueOf(cfg.get("maxTemperatureC")));
            double measuredTemp = Double.parseDouble(String.valueOf(ctx.get("measuredTempC")));
            if (measuredTemp > maxTemp) {
                verdict = "HOLD";
                failureReason = "Temperature " + measuredTemp + "C exceeds threshold " + maxTemp + "C";
            }
        }

        // 2. Allergen check (if configured)
        if ("PASS".equals(verdict) && cfg.containsKey("disallowedAllergens") && ctx.containsKey("allergenProfile")) {
            String profile = String.valueOf(ctx.get("allergenProfile")).toUpperCase();
            String disallowed = String.valueOf(cfg.get("disallowedAllergens")).toUpperCase();
            if (profile.contains(disallowed)) {
                verdict = "REJECT";
                failureReason = "Contains restricted allergen: " + disallowed;
            }
        }

        // 3. Simulated/Explicit override from config
        if (cfg.containsKey("forcedVerdict")) {
            verdict = String.valueOf(cfg.get("forcedVerdict")).toUpperCase();
        }

        log.info("QualityInspection: Type '{}' evaluated with verdict '{}' (reason={})",
                inspectionType, verdict, failureReason);

        Map<String, Object> qaData = new HashMap<>();
        qaData.put("verdict", verdict);
        qaData.put("inspectionType", inspectionType);
        qaData.put("failureReason", failureReason);
        qaData.put("inspectedAt", Instant.now().toString());

        Map<String, Object> out = new HashMap<>();
        out.put(outputVar, qaData);
        out.put("qaVerdict", verdict);
        out.put("qaStatus", verdict);
        out.put("qcInspectionOutcome", "PASS".equalsIgnoreCase(verdict) ? "PASSED" : verdict);
        if (failureReason != null) {
            out.put("qaFailureReason", failureReason);
        }

        return NodeExecutionResult.success(out);
    }
}
