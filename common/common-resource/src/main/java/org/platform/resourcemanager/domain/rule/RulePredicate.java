package org.platform.resourcemanager.domain.rule;

/**
 * Functional predicate evaluating property mutations.
 */
@FunctionalInterface
public interface RulePredicate {

    /**
     * Evaluates whether the given property value satisfies the condition.
     *
     * @param propertyValue the current property value being inspected
     * @return true if the condition triggers
     */
    boolean test(Object propertyValue);
}
