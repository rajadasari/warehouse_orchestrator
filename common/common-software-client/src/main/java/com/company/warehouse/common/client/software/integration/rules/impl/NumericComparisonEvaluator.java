package com.company.warehouse.common.client.software.integration.rules.impl;

import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluator;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Rule 3: Numeric & Relational Comparison Evaluator.
 * Evaluates range, boundary, and threshold comparisons (>, <, >=, <=, ==, BETWEEN).
 */
@Slf4j
@Component
public class NumericComparisonEvaluator implements RuleEvaluator {

    @Override
    public boolean supports(String ruleType) {
        return "NUMERIC_COMPARISON".equalsIgnoreCase(ruleType) || "RANGE_CHECK".equalsIgnoreCase(ruleType) || "NUMERIC".equalsIgnoreCase(ruleType);
    }

    @Override
    public RuleEvaluationResult evaluate(ValidationRule rule, Map<String, Object> context) {
        String field = rule.getField();
        Object rawVal = (context != null && field != null) ? context.get(field) : null;

        if (rawVal == null || String.valueOf(rawVal).isBlank()) {
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    "Numeric field '" + field + "' is null or missing",
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_MISSING_NUMERIC_FIELD",
                    null
            );
        }

        double val;
        try {
            val = Double.parseDouble(String.valueOf(rawVal).trim());
        } catch (NumberFormatException e) {
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    "Field '" + field + "' value '" + rawVal + "' is not a valid number",
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_INVALID_NUMBER_FORMAT",
                    rawVal
            );
        }

        String op = rule.getOperator() != null ? rule.getOperator().trim().toUpperCase() : "BETWEEN_INCLUSIVE";
        boolean passed = false;
        String failMsg = rule.getFailureMessage();

        Double min = rule.getMin();
        Double max = rule.getMax();

        switch (op) {
            case "BETWEEN_INCLUSIVE", "BETWEEN" -> {
                boolean minOk = (min == null) || (val >= min);
                boolean maxOk = (max == null) || (val <= max);
                passed = minOk && maxOk;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") is not between [" + min + ", " + max + "]";
            }
            case "GREATER_THAN", "GT" -> {
                double target = (min != null) ? min : ((rule.getExpectedValues() != null && !rule.getExpectedValues().isEmpty())
                        ? Double.parseDouble(rule.getExpectedValues().get(0)) : 0.0);
                passed = val > target;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") must be > " + target;
            }
            case "GREATER_THAN_OR_EQUAL", "GTE", "GE" -> {
                double target = (min != null) ? min : ((rule.getExpectedValues() != null && !rule.getExpectedValues().isEmpty())
                        ? Double.parseDouble(rule.getExpectedValues().get(0)) : 0.0);
                passed = val >= target;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") must be >= " + target;
            }
            case "LESS_THAN", "LT" -> {
                double target = (max != null) ? max : ((rule.getExpectedValues() != null && !rule.getExpectedValues().isEmpty())
                        ? Double.parseDouble(rule.getExpectedValues().get(0)) : 0.0);
                passed = val < target;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") must be < " + target;
            }
            case "LESS_THAN_OR_EQUAL", "LTE", "LE" -> {
                double target = (max != null) ? max : ((rule.getExpectedValues() != null && !rule.getExpectedValues().isEmpty())
                        ? Double.parseDouble(rule.getExpectedValues().get(0)) : 0.0);
                passed = val <= target;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") must be <= " + target;
            }
            case "EQUALS", "EQ" -> {
                double target = (min != null) ? min : ((rule.getExpectedValues() != null && !rule.getExpectedValues().isEmpty())
                        ? Double.parseDouble(rule.getExpectedValues().get(0)) : 0.0);
                passed = Math.abs(val - target) < 0.0001;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") must be == " + target;
            }
            case "NOT_EQUALS", "NE" -> {
                double target = (min != null) ? min : ((rule.getExpectedValues() != null && !rule.getExpectedValues().isEmpty())
                        ? Double.parseDouble(rule.getExpectedValues().get(0)) : 0.0);
                passed = Math.abs(val - target) >= 0.0001;
                if (failMsg == null) failMsg = "Field '" + field + "' (" + val + ") cannot be equal to " + target;
            }
            default -> {
                log.warn("NumericComparisonEvaluator: Unsupported operator '{}'", op);
                passed = false;
                failMsg = "Unsupported numeric operator: " + op;
            }
        }

        if (passed) {
            return RuleEvaluationResult.success(rule.getId(), rule.getType(), val);
        } else {
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    failMsg,
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_OUT_OF_SPEC",
                    val
            );
        }
    }
}
