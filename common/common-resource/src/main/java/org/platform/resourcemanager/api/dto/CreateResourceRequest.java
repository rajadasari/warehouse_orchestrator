package org.platform.resourcemanager.api.dto;

import java.io.Serializable;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Immutable DTO for requesting registration of a new resource.
 */
public record CreateResourceRequest(
        String tenantId,
        String resourceId,
        String name,
        String resourceClass,
        String category,
        String isa95Path,
        Double x,
        Double y,
        Double z,
        Set<String> capabilities,
        Map<String, Object> initialProperties
) implements Serializable {

    public CreateResourceRequest {
        tenantId = (tenantId == null || tenantId.isBlank()) ? "default" : tenantId.trim();
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        if (resourceId.isBlank()) {
            throw new IllegalArgumentException("resourceId must not be blank");
        }
        name = (name == null || name.isBlank()) ? resourceId : name.trim();
        resourceClass = (resourceClass == null || resourceClass.isBlank()) ? "EQUIPMENT" : resourceClass.trim();
        category = (category == null || category.isBlank()) ? "PHYSICAL" : category.trim();
        isa95Path = (isa95Path == null) ? "" : isa95Path.trim();
        x = (x == null) ? 0.0 : x;
        y = (y == null) ? 0.0 : y;
        z = (z == null) ? 0.0 : z;
        capabilities = (capabilities == null) ? Set.of() : Set.copyOf(capabilities);
        initialProperties = (initialProperties == null) ? Map.of() : Map.copyOf(initialProperties);
    }

    public static CreateResourceRequest of(String resourceId, String resourceClass) {
        return new CreateResourceRequest("default", resourceId, resourceId, resourceClass, "PHYSICAL",
                "", 0.0, 0.0, 0.0, Set.of(), Map.of());
    }

    public static CreateResourceRequest of(String tenantId, String resourceId, String name, String resourceClass) {
        return new CreateResourceRequest(tenantId, resourceId, name, resourceClass, "PHYSICAL",
                "", 0.0, 0.0, 0.0, Set.of(), Map.of());
    }

    public Set<String> getCapabilities() {
        return Collections.unmodifiableSet(capabilities);
    }

    public Map<String, Object> getInitialProperties() {
        return Collections.unmodifiableMap(initialProperties);
    }
}
