package org.platform.resourcemanager.domain.rule;

import org.platform.resourcemanager.domain.model.ResourceId;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Thread-safe Reactive Rule Subscription Engine.
 * Evaluates predicates on property mutations in sub-microseconds and dispatches reactive actions.
 * Supports exact resource subscriptions or wildcard subscriptions across all resources for a property.
 */
public class RuleSubscriptionEngine {

    private static final Logger log = LoggerFactory.getLogger(RuleSubscriptionEngine.class);

    // Key: targetResource (or null for wildcard), Sub-Key: propertyName -> List of subscriptions
    private final Map<String, List<RuleSubscription>> subscriptionsByProperty = new ConcurrentHashMap<>();
    private final Map<String, RuleSubscription> subscriptionsById = new ConcurrentHashMap<>();

    private String buildKey(ResourceId resourceId, String propertyName) {
        String resKey = (resourceId != null) ? resourceId.toString() : "*";
        return resKey + ":" + propertyName.trim();
    }

    /**
     * Registers a new reactive rule subscription.
     */
    public void register(RuleSubscription subscription) {
        Objects.requireNonNull(subscription, "subscription must not be null");
        subscriptionsById.put(subscription.subscriptionId(), subscription);

        String key = buildKey(subscription.targetResource(), subscription.propertyName());
        subscriptionsByProperty.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(subscription);
    }

    /**
     * Unregisters a subscription by ID.
     */
    public boolean unregister(String subscriptionId) {
        if (subscriptionId == null) return false;
        RuleSubscription sub = subscriptionsById.remove(subscriptionId);
        if (sub != null) {
            String key = buildKey(sub.targetResource(), sub.propertyName());
            List<RuleSubscription> list = subscriptionsByProperty.get(key);
            if (list != null) {
                list.remove(sub);
            }
            return true;
        }
        return false;
    }

    /**
     * Evaluates all matching subscriptions when a property changes.
     * Evaluates both specific (targetResource, propertyName) and wildcard (*, propertyName) subscriptions.
     *
     * @param resourceId the resource whose property updated
     * @param propertyName the name of the property
     * @param newValue the newly assigned property value
     * @return count of rules fired
     */
    public int evaluate(ResourceId resourceId, String propertyName, Object newValue) {
        if (propertyName == null || resourceId == null) {
            return 0;
        }

        int firedCount = 0;

        // 1. Evaluate resource-specific rules
        String specificKey = buildKey(resourceId, propertyName);
        List<RuleSubscription> specificList = subscriptionsByProperty.get(specificKey);
        if (specificList != null && !specificList.isEmpty()) {
            for (RuleSubscription sub : specificList) {
                if (sub.active() && sub.predicate().test(newValue)) {
                    dispatchActionSafely(sub, resourceId, propertyName, newValue);
                    firedCount++;
                }
            }
        }

        // 2. Evaluate wildcard rules (*:propertyName)
        String wildcardKey = buildKey(null, propertyName);
        List<RuleSubscription> wildcardList = subscriptionsByProperty.get(wildcardKey);
        if (wildcardList != null && !wildcardList.isEmpty()) {
            for (RuleSubscription sub : wildcardList) {
                if (sub.active() && sub.predicate().test(newValue)) {
                    dispatchActionSafely(sub, resourceId, propertyName, newValue);
                    firedCount++;
                }
            }
        }

        return firedCount;
    }

    private void dispatchActionSafely(RuleSubscription sub, ResourceId resourceId, String propertyName, Object newValue) {
        try {
            sub.action().execute(resourceId, propertyName, newValue);
        } catch (Exception ex) {
            // Defensive execution: user action error must never corrupt core engine state
            log.error("Rule action failed subscriptionId={}, resourceId={}, property={}",
                    sub.subscriptionId(), resourceId, propertyName, ex);
        }
    }

    public int activeSubscriptionCount() {
        return subscriptionsById.size();
    }

    public void clear() {
        subscriptionsById.clear();
        subscriptionsByProperty.clear();
    }
}
