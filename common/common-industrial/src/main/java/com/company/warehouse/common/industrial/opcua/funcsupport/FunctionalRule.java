package com.company.warehouse.common.industrial.opcua.funcsupport;

import lombok.Builder;

import java.util.List;

/**
 * A complete functional support rule: read source tags, evaluate conditions (AND),
 * and write predefined values to target tags when all conditions pass.
 */
@Builder
public record FunctionalRule(
        String ruleId,
        String ruleName,
        RuleTopology topology,
        List<TagCondition> conditions,
        List<TagWriteAction> actions,
        boolean isReactive
) {
    public FunctionalRule {
        if (ruleId == null || ruleId.isBlank()) {
            throw new IllegalArgumentException("ruleId must not be blank");
        }
        if (topology == null) {
            throw new IllegalArgumentException("topology must not be null");
        }
        if (conditions == null || conditions.isEmpty()) {
            throw new IllegalArgumentException("At least one condition is required");
        }
        if (actions == null || actions.isEmpty()) {
            throw new IllegalArgumentException("At least one action is required");
        }
        conditions = List.copyOf(conditions);
        actions = List.copyOf(actions);
    }
}
