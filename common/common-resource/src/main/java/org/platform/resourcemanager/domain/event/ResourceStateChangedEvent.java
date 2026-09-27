package org.platform.resourcemanager.domain.event;

import org.platform.resourcemanager.domain.fsm.ResourceState;
import org.platform.resourcemanager.domain.fsm.StateTrigger;
import org.platform.resourcemanager.domain.model.ResourceId;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Event published when a resource undergoes a state transition.
 */
public record ResourceStateChangedEvent(
        String eventId,
        ResourceId resourceId,
        ResourceState oldState,
        ResourceState newState,
        StateTrigger trigger,
        Instant timestamp
) implements ResourceEvent {

    public ResourceStateChangedEvent {
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        Objects.requireNonNull(oldState, "oldState must not be null");
        Objects.requireNonNull(newState, "newState must not be null");
        Objects.requireNonNull(trigger, "trigger must not be null");
        eventId = (eventId == null || eventId.isBlank()) ? UUID.randomUUID().toString() : eventId;
        timestamp = (timestamp == null) ? Instant.now() : timestamp;
    }

    public static ResourceStateChangedEvent of(
            ResourceId id,
            ResourceState oldState,
            ResourceState newState,
            StateTrigger trigger
    ) {
        return new ResourceStateChangedEvent(UUID.randomUUID().toString(), id, oldState, newState, trigger, Instant.now());
    }

    @Override
    public String eventType() {
        return "org.platform.resource.state_changed.v1";
    }
}
