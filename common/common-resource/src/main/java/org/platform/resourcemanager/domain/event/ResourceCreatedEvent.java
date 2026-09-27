package org.platform.resourcemanager.domain.event;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Event published when a new resource is registered in the platform.
 */
public record ResourceCreatedEvent(
        String eventId,
        ResourceId resourceId,
        String name,
        String resourceClass,
        Instant timestamp
) implements ResourceEvent {

    public ResourceCreatedEvent {
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        eventId = (eventId == null || eventId.isBlank()) ? UUID.randomUUID().toString() : eventId;
        timestamp = (timestamp == null) ? Instant.now() : timestamp;
    }

    public static ResourceCreatedEvent of(ResourceId id, String name, String resourceClass) {
        return new ResourceCreatedEvent(UUID.randomUUID().toString(), id, name, resourceClass, Instant.now());
    }

    @Override
    public String eventType() {
        return "org.platform.resource.created.v1";
    }
}
