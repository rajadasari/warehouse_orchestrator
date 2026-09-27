package org.platform.resourcemanager.api.dto;

import java.io.Serializable;
import java.util.Map;
import java.util.Set;

/**
 * Immutable DTO for modifying an existing resource under optimistic CAS versioning.
 */
public record UpdateResourceRequest(
        Double x,
        Double y,
        Double z,
        Set<String> capabilitiesToAdd,
        Set<String> capabilitiesToRemove,
        Map<String, Object> propertiesToSet,
        Set<String> propertyKeysToRemove,
        long expectedVersion
) implements Serializable {

    public UpdateResourceRequest {
        capabilitiesToAdd = (capabilitiesToAdd == null) ? Set.of() : Set.copyOf(capabilitiesToAdd);
        capabilitiesToRemove = (capabilitiesToRemove == null) ? Set.of() : Set.copyOf(capabilitiesToRemove);
        propertiesToSet = (propertiesToSet == null) ? Map.of() : Map.copyOf(propertiesToSet);
        propertyKeysToRemove = (propertyKeysToRemove == null) ? Set.of() : Set.copyOf(propertyKeysToRemove);
    }
}
