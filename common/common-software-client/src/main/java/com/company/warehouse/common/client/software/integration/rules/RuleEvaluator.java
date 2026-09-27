package com.company.warehouse.common.client.software.integration.rules;

import java.util.Map;

/**
 * Extensible SPI for evaluating a specific category of validation rules.
 * Enables zero-code-modification extensions (Open-Closed Principle).
 */
public interface RuleEvaluator {

    /**
     * Identifies which rule type this evaluator handles (e.g. "KEY_VALUE_MATCH", "NUMERIC_COMPARISON").
     */
    boolean supports(String ruleType);

    /**
     * Executes the rule logic against the provided canonical data context.
     */
    RuleEvaluationResult evaluate(ValidationRule rule, Map<String, Object> context);
}
