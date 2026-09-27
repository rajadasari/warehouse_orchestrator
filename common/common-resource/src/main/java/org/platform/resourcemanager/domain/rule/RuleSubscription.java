package org.platform.resourcemanager.domain.rule;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * Subscription binding a resource and property to a predicate and reactive action.
 */
public record RuleSubscription(
        String subscriptionId,
        ResourceId targetResource,
        String propertyName,
        RulePredicate predicate,
        RuleAction action,
        boolean active,
        Instant createdAt
) implements Serializable {

    public RuleSubscription {
        Objects.requireNonNull(subscriptionId, "subscriptionId must not be null");
        Objects.requireNonNull(propertyName, "propertyName must not be null");
        Objects.requireNonNull(predicate, "predicate must not be null");
        Objects.requireNonNull(action, "action must not be null");
        propertyName = propertyName.trim();
        createdAt = (createdAt == null) ? Instant.now() : createdAt;
    }

    public static RuleSubscription of(
            String subscriptionId,
            ResourceId targetResource,
            String propertyName,
            RulePredicate predicate,
            RuleAction action
    ) {
        return new RuleSubscription(subscriptionId, targetResource, propertyName, predicate, action, true, Instant.now());
    }

    public RuleSubscription withActive(boolean newActive) {
        return new RuleSubscription(subscriptionId, targetResource, propertyName, predicate, action, newActive, createdAt);
    }
}
