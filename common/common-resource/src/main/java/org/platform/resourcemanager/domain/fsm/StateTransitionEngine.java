package org.platform.resourcemanager.domain.fsm;

import org.platform.resourcemanager.api.exception.InvalidStateTransitionException;
import org.platform.resourcemanager.domain.model.ResourceId;

import java.util.Objects;

/**
 * Deterministic, sub-microsecond state transition dispatcher.
 */
public final class StateTransitionEngine {

    private final StateProfile defaultProfile;

    public StateTransitionEngine(StateProfile defaultProfile) {
        this.defaultProfile = Objects.requireNonNull(defaultProfile, "defaultProfile must not be null");
    }

    public StateTransitionEngine() {
        this(PackMLProfile.INSTANCE);
    }

    public ResourceState fire(ResourceId resourceId, ResourceState current, StateTrigger trigger) {
        return fire(resourceId, current, trigger, defaultProfile);
    }

    public ResourceState fire(ResourceId resourceId, ResourceState current, StateTrigger trigger, StateProfile profile) {
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        Objects.requireNonNull(current, "current state must not be null");
        Objects.requireNonNull(trigger, "trigger must not be null");
        StateProfile activeProfile = (profile != null) ? profile : defaultProfile;

        return activeProfile.transition(current, trigger)
                .orElseThrow(() -> new InvalidStateTransitionException(resourceId, current, trigger));
    }

    public boolean canTransition(ResourceState current, StateTrigger trigger) {
        return canTransition(current, trigger, defaultProfile);
    }

    public boolean canTransition(ResourceState current, StateTrigger trigger, StateProfile profile) {
        if (current == null || trigger == null) {
            return false;
        }
        StateProfile activeProfile = (profile != null) ? profile : defaultProfile;
        return activeProfile.canTransition(current, trigger);
    }
}
