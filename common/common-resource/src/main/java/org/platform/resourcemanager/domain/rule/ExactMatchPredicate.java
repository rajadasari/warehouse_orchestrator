package org.platform.resourcemanager.domain.rule;

import java.util.Objects;

/**
 * Equality predicate matching any object value or enum representation.
 */
public record ExactMatchPredicate(
        Object expectedValue,
        boolean matchExpected
) implements RulePredicate {

    public static ExactMatchPredicate is(Object expected) {
        return new ExactMatchPredicate(expected, true);
    }

    public static ExactMatchPredicate isNot(Object expected) {
        return new ExactMatchPredicate(expected, false);
    }

    @Override
    public boolean test(Object propertyValue) {
        boolean equals = Objects.equals(propertyValue, expectedValue);
        return equals == matchExpected;
    }
}
