package org.platform.resourcemanager.api.exception;

import org.platform.resourcemanager.domain.model.ResourceId;

/**
 * Thrown when an optimistic concurrency control (OCC) CAS version check fails.
 */
public class ConcurrencyConflictException extends ResourceException {

    private final ResourceId resourceId;
    private final long expectedVersion;
    private final long actualVersion;

    public ConcurrencyConflictException(ResourceId resourceId, long expectedVersion, long actualVersion) {
        super(String.format("Optimistic locking conflict on resource %s: expected version %d, but actual version is %d",
                resourceId, expectedVersion, actualVersion));
        this.resourceId = resourceId;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }

    public ResourceId getResourceId() {
        return resourceId;
    }

    public long getExpectedVersion() {
        return expectedVersion;
    }

    public long getActualVersion() {
        return actualVersion;
    }
}
