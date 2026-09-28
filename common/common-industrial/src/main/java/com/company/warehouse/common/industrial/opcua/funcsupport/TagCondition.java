package com.company.warehouse.common.industrial.opcua.funcsupport;

import lombok.Builder;

/**
 * A single conditional predicate: sourceNodeId [operator] thresholdValue.
 * Example: "ns=2;s=Motor.Temp" GREATER_THAN 75.0
 */
@Builder
public record TagCondition(
        String sourceNodeId,
        ComparisonOperator operator,
        Object thresholdValue
) {
    public TagCondition {
        if (sourceNodeId == null || sourceNodeId.isBlank()) {
            throw new IllegalArgumentException("sourceNodeId must not be blank");
        }
        if (operator == null) {
            throw new IllegalArgumentException("operator must not be null");
        }
    }

    /**
     * Evaluates this condition against the given actual value read from the source tag.
     */
    public boolean test(Object actualValue) {
        return operator.evaluate(actualValue, thresholdValue);
    }
}
