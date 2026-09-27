package com.company.warehouse.common.client.software.integration.rules;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * Declarative specification for a single validation or business rule.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationRule implements Serializable {

    private String id;
    private String name;

    /**
     * Rule Type:
     * - KEY_VALUE_MATCH
     * - DATABASE_LOOKUP
     * - NUMERIC_COMPARISON
     * - CALCULATED_EXPRESSION
     * - CUSTOM
     */
    private String type;

    /**
     * Target field in the canonical context to evaluate.
     */
    private String field;

    /**
     * Comparison operator:
     * EQUALS, NOT_EQUALS, IN, NOT_IN, REGEX, IS_NOT_EMPTY,
     * GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, BETWEEN_INCLUSIVE
     */
    private String operator;

    /**
     * Expected values for equality, IN sets, or REGEX pattern.
     */
    private List<String> expectedValues;

    /**
     * Target lookup table or specification for DATABASE_LOOKUP (e.g. SKU_EXISTS, LOCATION_EXISTS, TAG_EXISTS).
     */
    private String lookupTarget;

    /**
     * Minimum boundary for range checks.
     */
    private Double min;

    /**
     * Maximum boundary for range checks.
     */
    private Double max;

    /**
     * Math / logical expression for CALCULATED_EXPRESSION.
     * Example: "actualWeightKg >= (unitWeightKg * quantity * 0.90)"
     */
    private String expression;

    /**
     * State to assign to the transaction if this rule fails.
     * Example: "QUARANTINE_UNKNOWN_SKU", "REJECTED_OUT_OF_BOUNDS", "HELD_DISCREPANCY"
     */
    private String onFailureState;

    /**
     * Detailed failure description for audit logs and partner responses.
     */
    private String failureMessage;

    /**
     * If false, rule failure logs a warning without blocking or transitioning to error state.
     */
    @Builder.Default
    private boolean critical = true;
}
