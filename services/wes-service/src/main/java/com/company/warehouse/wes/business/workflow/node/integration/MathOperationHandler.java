package com.company.warehouse.wes.business.workflow.node.integration;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Handler for industrial telemetry calculations, weight deductions, and tare offset math.
 */
@Slf4j
@Component
public class MathOperationHandler implements WorkflowNodeHandler {

    @Override
    public boolean supports(String nodeType) {
        return "MATH".equalsIgnoreCase(nodeType)
                || "CALCULATION".equalsIgnoreCase(nodeType)
                || "MATH_OPERATION".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        Map<String, Object> ctx = context.context() != null ? context.context() : Map.of();

        String operation = String.valueOf(cfg.getOrDefault("operation", "ADD")).toUpperCase();
        String outputVar = String.valueOf(cfg.getOrDefault("outputVariable", "mathResult")).trim();

        double valA = resolveNumericOperand(cfg.get("operandA"), ctx, 0.0);
        double valB = resolveNumericOperand(cfg.get("operandB"), ctx, 0.0);
        double result;

        switch (operation) {
            case "SUBTRACT":
                result = valA - valB;
                break;
            case "MULTIPLY":
                result = valA * valB;
                break;
            case "DIVIDE":
                result = (valB != 0) ? (valA / valB) : 0.0;
                break;
            case "PERCENTAGE":
                result = (valB != 0) ? ((valA / valB) * 100.0) : 0.0;
                break;
            case "ROUND":
                result = Math.round(valA);
                break;
            case "CEIL":
                result = Math.ceil(valA);
                break;
            case "FLOOR":
                result = Math.floor(valA);
                break;
            case "MIN":
                result = Math.min(valA, valB);
                break;
            case "MAX":
                result = Math.max(valA, valB);
                break;
            case "ADD":
            default:
                result = valA + valB;
                break;
        }

        // Clean precision rounding to 4 decimal places
        result = Math.round(result * 10000.0) / 10000.0;
        log.info("MATH Node: {} {} {} = {} -> '{}'", valA, operation, valB, result, outputVar);

        Map<String, Object> out = new HashMap<>();
        out.put(outputVar, result);
        out.put("mathOperation", operation);
        out.put("operandA", valA);
        out.put("operandB", valB);
        out.put("mathResult", result);

        return NodeExecutionResult.success(out);
    }

    private double resolveNumericOperand(Object operand, Map<String, Object> context, double fallback) {
        if (operand == null) return fallback;
        if (operand instanceof Number num) return num.doubleValue();
        String str = String.valueOf(operand).trim();
        String lookupKey = str.startsWith("context.") ? str.substring(8) : str;
        if (context.containsKey(lookupKey) && context.get(lookupKey) != null) {
            Object ctxVal = context.get(lookupKey);
            if (ctxVal instanceof Number num) return num.doubleValue();
            try {
                return Double.parseDouble(String.valueOf(ctxVal).trim());
            } catch (NumberFormatException ignored) {}
        }
        try {
            return Double.parseDouble(str);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
