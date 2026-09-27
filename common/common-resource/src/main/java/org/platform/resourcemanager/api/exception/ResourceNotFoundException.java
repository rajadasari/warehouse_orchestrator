package org.platform.resourcemanager.api.exception;

import org.platform.resourcemanager.domain.model.ResourceId;

/**
 * Thrown when a requested resource does not exist in the repository.
 */
public class ResourceNotFoundException extends ResourceException {

    private final ResourceId resourceId;

    public ResourceNotFoundException(ResourceId resourceId) {
        super("Resource not found: " + resourceId);
        this.resourceId = resourceId;
    }

    public ResourceNotFoundException(String message) {
        super(message);
        this.resourceId = null;
    }

    public ResourceId getResourceId() {
        return resourceId;
    }
}
