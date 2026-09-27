package org.platform.resourcemanager.domain.arbitration;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.time.Duration;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Request specification for atomic gang allocation across multiple resources.
 */
public record AllocationRequest(
        String requestId,
        Set<ResourceId> resourceIds,
        String requesterId,
        Duration leaseDuration,
        int priority
) implements Serializable {

    public AllocationRequest {
        requestId = (requestId == null || requestId.isBlank()) ? UUID.randomUUID().toString() : requestId;
        Objects.requireNonNull(resourceIds, "resourceIds must not be null");
        if (resourceIds.isEmpty()) {
            throw new IllegalArgumentException("resourceIds must not be empty");
        }
        requesterId = (requesterId == null || requesterId.isBlank()) ? "DEFAULT_REQUESTER" : requesterId;
        leaseDuration = (leaseDuration == null || leaseDuration.isNegative() || leaseDuration.isZero())
                ? Duration.ofMinutes(5) : leaseDuration;
        resourceIds = Set.copyOf(resourceIds);
    }

    public static AllocationRequest of(Set<ResourceId> resourceIds, String requesterId, Duration duration) {
        return new AllocationRequest(UUID.randomUUID().toString(), resourceIds, requesterId, duration, 0);
    }

    public Set<ResourceId> getResourceIds() {
        return Collections.unmodifiableSet(resourceIds);
    }
}
