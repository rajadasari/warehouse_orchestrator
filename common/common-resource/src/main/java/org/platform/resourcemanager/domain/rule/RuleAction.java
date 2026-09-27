package org.platform.resourcemanager.domain.rule;

import org.platform.resourcemanager.domain.model.ResourceId;

/**
 * Functional action executed when a rule predicate matches.
 */
@FunctionalInterface
public interface RuleAction {

    /**
     * Executes the reactive action.
     *
     * @param targetResource the resource aggregate identity whose property triggered the rule
     * @param propertyName the name of the triggering property
     * @param triggeredValue the value that met the predicate
     */
    void execute(ResourceId targetResource, String propertyName, Object triggeredValue);
}
