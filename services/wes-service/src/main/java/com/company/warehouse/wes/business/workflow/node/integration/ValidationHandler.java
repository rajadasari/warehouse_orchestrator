package com.company.warehouse.wes.business.workflow.node.integration;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/**
 * Handler for business validation, MES compliance checks, and payload sanity assertions.
 */
@Slf4j
@Component
public class ValidationHandler implements WorkflowNodeHandler {

    private final ExpressionParser parser = new SpelExpressionParser();

    @Override
    public boolean supports(String nodeType) {
        return "VALIDATION".equalsIgnoreCase(nodeType)
                || "RULE_CHECK".equalsIgnoreCase(nodeType)
                || "SCHEMA_VALIDATION".equalsIgnoreCase(nodeType)
                || "SANITY_CHECK".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        Map<String, Object> ctx = context.context() != null ? context.context() : Map.of();

        String scope = String.valueOf(cfg.getOrDefault("validationScope", "GENERAL"));
        boolean failOnError = Boolean.parseBoolean(String.valueOf(cfg.getOrDefault("failOnError", "true")));

        List<String> violations = new ArrayList<>();

        // 1. Required fields check
        Object reqFieldsObj = cfg.get("requiredFields");
        if (reqFieldsObj instanceof List<?> list) {
            for (Object field : list) {
                String fieldName = String.valueOf(field).trim();
                if (!ctx.containsKey(fieldName) || ctx.get(fieldName) == null || String.valueOf(ctx.get(fieldName)).isBlank()) {
                    violations.add("Missing required context field: " + fieldName);
                }
            }
        }

        // 2. Custom SpEL validation rule expression
        Object ruleExprObj = cfg.get("ruleExpression");
        if (ruleExprObj != null && !String.valueOf(ruleExprObj).isBlank()) {
            String rule = String.valueOf(ruleExprObj).trim();
            try {
                StandardEvaluationContext evalCtx = new StandardEvaluationContext();
                evalCtx.setVariables(ctx);
                evalCtx.setVariable("context", ctx);
                evalCtx.setVariable("config", cfg);

                Boolean valid = parser.parseExpression(rule).getValue(evalCtx, Boolean.class);
                if (!Boolean.TRUE.equals(valid)) {
                    violations.add("Rule assertion failed: " + rule);
                }
            } catch (Exception ex) {
                log.warn("Error evaluating validation rule '{}': {}", rule, ex.getMessage());
                violations.add("Rule evaluation error: " + ex.getMessage());
            }
        }

        boolean passed = violations.isEmpty();
        String outcome = passed ? "APPROVED" : "REJECTED";

        log.info("VALIDATION Node executed [scope={}]: outcome={}, violations={}", scope, outcome, violations.size());

        if (!passed && failOnError) {
            return NodeExecutionResult.failed("Validation failed for scope " + scope + ": " + String.join("; ", violations));
        }

        Map<String, Object> out = new HashMap<>();
        out.put("validationOutcome", outcome);
        out.put("validationPassed", passed);
        out.put("validationScope", scope);
        out.put("violations", violations);
        out.put("validatedAt", Instant.now().toString());

        return NodeExecutionResult.success(out);
    }
}
