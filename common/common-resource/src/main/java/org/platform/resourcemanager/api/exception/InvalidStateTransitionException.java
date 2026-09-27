package org.platform.resourcemanager.api.exception;

import org.platform.resourcemanager.domain.fsm.ResourceState;
import org.platform.resourcemanager.domain.fsm.StateTrigger;
import org.platform.resourcemanager.domain.model.ResourceId;

/**
 * Thrown when an illegal state transition is attempted on a resource.
 */
public class InvalidStateTransitionException extends ResourceException {

    private final ResourceId resourceId;
    private final ResourceState currentState;
    private final StateTrigger attemptedTrigger;

    public InvalidStateTransitionException(ResourceId resourceId, ResourceState currentState, StateTrigger trigger) {
        super(String.format("Invalid state transition for resource %s from state [%s] via trigger [%s]",
                resourceId, currentState.name(), trigger.name()));
        this.resourceId = resourceId;
        this.currentState = currentState;
        this.attemptedTrigger = trigger;
    }

    public ResourceId getResourceId() {
        return resourceId;
    }

    public ResourceState getCurrentState() {
        return currentState;
    }

    public StateTrigger getAttemptedTrigger() {
        return attemptedTrigger;
    }
}
