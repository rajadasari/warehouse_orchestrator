package org.platform.resourcemanager.domain.arbitration;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Distributed lease record representing atomic, time-bound reservation of resources.
 * Protected against NTP step adjustments using monotonic clock deadlines (System.nanoTime).
 */
public record Lease(
        String leaseId,
        Set<ResourceId> resourceIds,
        String holderId,
        Instant grantedAt,
        Instant expiresAt,
        long nanoDeadline
) implements Serializable {

    public Lease {
        leaseId = (leaseId == null || leaseId.isBlank()) ? UUID.randomUUID().toString() : leaseId;
        Objects.requireNonNull(resourceIds, "resourceIds must not be null");
        holderId = (holderId == null || holderId.isBlank()) ? "ANONYMOUS" : holderId;
        grantedAt = (grantedAt == null) ? Instant.now() : grantedAt;
        Objects.requireNonNull(expiresAt, "expiresAt must not be null");
        resourceIds = Set.copyOf(resourceIds);
    }

    public Lease(
            String leaseId,
            Set<ResourceId> resourceIds,
            String holderId,
            Instant grantedAt,
            Instant expiresAt
    ) {
        this(leaseId, resourceIds, holderId, grantedAt, expiresAt, 0L);
    }

    public static Lease of(Set<ResourceId> resourceIds, String holderId, Duration duration) {
        Instant now = Instant.now();
        long deadline = System.nanoTime() + duration.toNanos();
        return new Lease(UUID.randomUUID().toString(), resourceIds, holderId, now, now.plus(duration), deadline);
    }

    public boolean isExpired() {
        if (nanoDeadline > 0L) {
            return (System.nanoTime() - nanoDeadline) >= 0;
        }
        return Instant.now().isAfter(expiresAt);
    }

    public Lease renew(Duration additionalDuration) {
        long newDeadline = (nanoDeadline > 0L) ? nanoDeadline + additionalDuration.toNanos() : System.nanoTime() + additionalDuration.toNanos();
        return new Lease(leaseId, resourceIds, holderId, grantedAt, expiresAt.plus(additionalDuration), newDeadline);
    }

    public Set<ResourceId> getResourceIds() {
        return Collections.unmodifiableSet(resourceIds);
    }
}
