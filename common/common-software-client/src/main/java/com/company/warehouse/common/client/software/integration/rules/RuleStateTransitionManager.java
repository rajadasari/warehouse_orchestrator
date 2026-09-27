package com.company.warehouse.common.client.software.integration.rules;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Rule 5: Rule-Driven State Transition Manager.
 * Maps evaluation outcomes and failure states to determine the final lifecycle status of a transaction.
 */
@Slf4j
@Component
public class RuleStateTransitionManager {

    public record StateTransitionDecision(
            boolean allPassed,
            String finalState,
            String failureReason,
            String failedRuleId
    ) {}

    /**
     * Evaluates the pipeline results and determines the transactional state.
     */
    public StateTransitionDecision resolveState(List<RuleEvaluationResult> results, String defaultSuccessState) {
        String successState = (defaultSuccessState != null && !defaultSuccessState.isBlank())
                ? defaultSuccessState.trim().toUpperCase()
                : "ACCEPTED";

        if (results == null || results.isEmpty()) {
            return new StateTransitionDecision(true, successState, null, null);
        }

        // Find the first failed critical result
        RuleEvaluationResult failed = results.stream()
                .filter(r -> !r.isPassed() && r.isCritical())
                .findFirst()
                .or(() -> results.stream().filter(r -> !r.isPassed()).findFirst())
                .orElse(null);

        if (failed == null) {
            return new StateTransitionDecision(true, successState, null, null);
        }

        String targetFailState = (failed.getOnFailureState() != null && !failed.getOnFailureState().isBlank())
                ? failed.getOnFailureState().trim().toUpperCase()
                : "REJECTED_VALIDATION_FAILURE";

        log.warn("Rule '{}' failed. Transitioning transaction state to '{}' ({})",
                failed.getRuleId(), targetFailState, failed.getFailureMessage());

        return new StateTransitionDecision(
                false,
                targetFailState,
                failed.getFailureMessage(),
                failed.getRuleId()
        );
    }
}
