package com.company.warehouse.common.industrial.opcua.funcsupport;

import lombok.Builder;

import java.util.List;
import java.util.Map;

/**
 * Result of executing a functional rule: condition evaluation results and write outcomes.
 */
@Builder
public record FunctionalRuleResult(
        String ruleId,
        boolean allConditionsPassed,
        List<ConditionResult> conditionResults,
        Map<String, Boolean> writeResults,
        boolean executed,
        long durationMs,
        String errorMessage
) {

    @Builder
    public record ConditionResult(
            String sourceNodeId,
            Object actualValue,
            ComparisonOperator operator,
            Object threshold,
            boolean passed
    ) {}

    public static FunctionalRuleResult success(
            String ruleId,
            List<ConditionResult> conditionResults,
            Map<String, Boolean> writeResults,
            long durationMs
    ) {
        boolean allPassed = conditionResults.stream().allMatch(ConditionResult::passed);
        return FunctionalRuleResult.builder()
                .ruleId(ruleId)
                .allConditionsPassed(allPassed)
                .conditionResults(conditionResults)
                .writeResults(writeResults)
                .executed(allPassed)
                .durationMs(durationMs)
                .build();
    }

    public static FunctionalRuleResult error(String ruleId, String errorMessage, long durationMs) {
        return FunctionalRuleResult.builder()
                .ruleId(ruleId)
                .allConditionsPassed(false)
                .conditionResults(List.of())
                .writeResults(Map.of())
                .executed(false)
                .durationMs(durationMs)
                .errorMessage(errorMessage)
                .build();
    }
}
