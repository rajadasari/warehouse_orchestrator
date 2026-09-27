package org.platform.resourcemanager.domain.rule;

import java.util.Objects;

/**
 * Numeric comparison predicate for analog properties (temperature, battery, speed).
 */
public record NumericComparisonPredicate(
        Operator operator,
        double threshold
) implements RulePredicate {

    public enum Operator {
        LESS_THAN,
        LESS_THAN_OR_EQUAL,
        GREATER_THAN,
        GREATER_THAN_OR_EQUAL,
        EQUAL,
        NOT_EQUAL
    }

    public NumericComparisonPredicate {
        Objects.requireNonNull(operator, "operator must not be null");
    }

    public static NumericComparisonPredicate lt(double threshold) {
        return new NumericComparisonPredicate(Operator.LESS_THAN, threshold);
    }

    public static NumericComparisonPredicate lte(double threshold) {
        return new NumericComparisonPredicate(Operator.LESS_THAN_OR_EQUAL, threshold);
    }

    public static NumericComparisonPredicate gt(double threshold) {
        return new NumericComparisonPredicate(Operator.GREATER_THAN, threshold);
    }

    public static NumericComparisonPredicate gte(double threshold) {
        return new NumericComparisonPredicate(Operator.GREATER_THAN_OR_EQUAL, threshold);
    }

    public static NumericComparisonPredicate eq(double threshold) {
        return new NumericComparisonPredicate(Operator.EQUAL, threshold);
    }

    public static NumericComparisonPredicate neq(double threshold) {
        return new NumericComparisonPredicate(Operator.NOT_EQUAL, threshold);
    }

    @Override
    public boolean test(Object propertyValue) {
        if (!(propertyValue instanceof Number num)) {
            return false;
        }
        double val = num.doubleValue();
        return switch (operator) {
            case LESS_THAN -> val < threshold;
            case LESS_THAN_OR_EQUAL -> val <= threshold;
            case GREATER_THAN -> val > threshold;
            case GREATER_THAN_OR_EQUAL -> val >= threshold;
            case EQUAL -> Double.compare(val, threshold) == 0;
            case NOT_EQUAL -> Double.compare(val, threshold) != 0;
        };
    }
}
