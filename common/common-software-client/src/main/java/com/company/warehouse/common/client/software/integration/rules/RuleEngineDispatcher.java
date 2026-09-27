package com.company.warehouse.common.client.software.integration.rules;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Orchestrator and Pipeline Dispatcher for the 5-Tier Rule Engine.
 * Discovers and delegates to registered RuleEvaluator implementations.
 */
@Slf4j
@Component
public class RuleEngineDispatcher {

    private final List<RuleEvaluator> evaluators;

    public RuleEngineDispatcher(List<RuleEvaluator> evaluators) {
        this.evaluators = evaluators != null ? evaluators : List.of();
        log.info("Initialized RuleEngineDispatcher with {} evaluators", this.evaluators.size());
    }

    public List<RuleEvaluationResult> evaluateAll(List<ValidationRule> rules, Map<String, Object> context) {
        List<RuleEvaluationResult> results = new ArrayList<>();
        if (rules == null || rules.isEmpty()) {
            return results;
        }

        for (ValidationRule rule : rules) {
            String rType = rule.getType() != null ? rule.getType().trim() : "KEY_VALUE_MATCH";

            RuleEvaluator matched = evaluators.stream()
                    .filter(e -> e.supports(rType))
                    .findFirst()
                    .orElse(null);

            if (matched == null) {
                log.warn("No RuleEvaluator found for rule type '{}' (Rule ID: {})", rType, rule.getId());
                results.add(RuleEvaluationResult.failure(
                        rule.getId(),
                        rType,
                        rule.isCritical(),
                        "No evaluator registered for rule type '" + rType + "'",
                        rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_UNSUPPORTED_RULE_TYPE",
                        null
                ));
            } else {
                RuleEvaluationResult res = matched.evaluate(rule, context);
                results.add(res);

                // Stop immediately if a critical rule fails
                if (!res.isPassed() && rule.isCritical()) {
                    log.info("Critical rule '{}' failed. Halting rule pipeline.", rule.getId());
                    break;
                }
            }
        }

        return results;
    }
}
