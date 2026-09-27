package com.company.warehouse.common.client.software.integration.rules.impl;

import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluator;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Rule 1: Key-Value Match Evaluator.
 * Handles exact matching, regex verification, required fields, and set membership (IN / NOT_IN).
 */
@Slf4j
@Component
public class KeyValueMatchEvaluator implements RuleEvaluator {

    @Override
    public boolean supports(String ruleType) {
        return "KEY_VALUE_MATCH".equalsIgnoreCase(ruleType) || "MATCH".equalsIgnoreCase(ruleType);
    }

    @Override
    public RuleEvaluationResult evaluate(ValidationRule rule, Map<String, Object> context) {
        String field = rule.getField();
        Object actualVal = (context != null && field != null) ? context.get(field) : null;
        String actualStr = actualVal != null ? String.valueOf(actualVal).trim() : null;

        String operator = rule.getOperator() != null ? rule.getOperator().trim().toUpperCase() : "EQUALS";
        List<String> expected = rule.getExpectedValues();

        boolean passed = false;
        String failMsg = rule.getFailureMessage();

        switch (operator) {
            case "IS_NOT_EMPTY", "REQUIRED" -> {
                passed = actualStr != null && !actualStr.isEmpty();
                if (failMsg == null) failMsg = "Field '" + field + "' is mandatory and cannot be empty";
            }
            case "EQUALS" -> {
                String target = (expected != null && !expected.isEmpty()) ? expected.get(0).trim() : "";
                passed = target.equalsIgnoreCase(actualStr);
                if (failMsg == null) failMsg = "Field '" + field + "' expected '" + target + "' but was '" + actualStr + "'";
            }
            case "NOT_EQUALS" -> {
                String target = (expected != null && !expected.isEmpty()) ? expected.get(0).trim() : "";
                passed = !target.equalsIgnoreCase(actualStr);
                if (failMsg == null) failMsg = "Field '" + field + "' cannot be equal to '" + target + "'";
            }
            case "IN" -> {
                if (expected != null && actualStr != null) {
                    passed = expected.stream().anyMatch(e -> e.trim().equalsIgnoreCase(actualStr));
                }
                if (failMsg == null) failMsg = "Field '" + field + "' value '" + actualStr + "' is not in allowed set " + expected;
            }
            case "NOT_IN" -> {
                if (expected != null && actualStr != null) {
                    passed = expected.stream().noneMatch(e -> e.trim().equalsIgnoreCase(actualStr));
                }
                if (failMsg == null) failMsg = "Field '" + field + "' value '" + actualStr + "' is in forbidden set " + expected;
            }
            case "REGEX", "REGEX_MATCH" -> {
                if (expected != null && !expected.isEmpty() && actualStr != null) {
                    String regex = expected.get(0);
                    passed = Pattern.compile(regex).matcher(actualStr).matches();
                }
                if (failMsg == null) failMsg = "Field '" + field + "' with value '" + actualStr + "' failed regex pattern";
            }
            default -> {
                log.warn("Unknown operator '{}' in KeyValueMatchEvaluator for rule '{}'", operator, rule.getId());
                passed = false;
                failMsg = "Unsupported operator: " + operator;
            }
        }

        if (passed) {
            return RuleEvaluationResult.success(rule.getId(), rule.getType(), actualVal);
        } else {
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    failMsg,
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_VALIDATION_FAILURE",
                    actualVal
            );
        }
    }
}
