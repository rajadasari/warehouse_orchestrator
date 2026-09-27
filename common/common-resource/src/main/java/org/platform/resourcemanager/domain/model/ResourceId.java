package org.platform.resourcemanager.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Immutable composite unique identifier for any managed resource.
 * Enforces canonical ordering to prevent distributed deadlocks during gang allocation.
 */
public record ResourceId(String tenantId, String resourceId) implements Comparable<ResourceId>, Serializable {

    public ResourceId {
        Objects.requireNonNull(tenantId, "tenantId must not be null");
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        if (tenantId.isBlank()) {
            throw new IllegalArgumentException("tenantId must not be blank");
        }
        if (resourceId.isBlank()) {
            throw new IllegalArgumentException("resourceId must not be blank");
        }
    }

    public static ResourceId of(String tenantId, String resourceId) {
        return new ResourceId(tenantId, resourceId);
    }

    public static ResourceId of(String resourceId) {
        return new ResourceId("default", resourceId);
    }

    @Override
    public int compareTo(ResourceId other) {
        Objects.requireNonNull(other, "Cannot compare to null ResourceId");
        int tenantComparison = this.tenantId.compareTo(other.tenantId);
        if (tenantComparison != 0) {
            return tenantComparison;
        }
        return this.resourceId.compareTo(other.resourceId);
    }

    @Override
    public String toString() {
        return tenantId + ":" + resourceId;
    }
}
