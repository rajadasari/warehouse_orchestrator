package com.company.warehouse.common.client.software.integration.rules;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Result of a single rule evaluation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleEvaluationResult implements Serializable {

    private String ruleId;
    private String ruleType;
    private boolean passed;
    private boolean critical;
    private String failureMessage;
    private String onFailureState;
    private Object evaluatedValue;

    public static RuleEvaluationResult success(String ruleId, String ruleType, Object evaluatedValue) {
        return RuleEvaluationResult.builder()
                .ruleId(ruleId)
                .ruleType(ruleType)
                .passed(true)
                .critical(false)
                .evaluatedValue(evaluatedValue)
                .build();
    }

    public static RuleEvaluationResult failure(String ruleId, String ruleType, boolean critical,
                                               String failureMessage, String onFailureState, Object evaluatedValue) {
        return RuleEvaluationResult.builder()
                .ruleId(ruleId)
                .ruleType(ruleType)
                .passed(false)
                .critical(critical)
                .failureMessage(failureMessage)
                .onFailureState(onFailureState)
                .evaluatedValue(evaluatedValue)
                .build();
    }
}
