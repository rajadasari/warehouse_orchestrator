package org.platform.resourcemanager.api.dto;

import org.platform.resourcemanager.domain.model.Resource;

import java.io.Serializable;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Immutable response DTO representing current resource state and metadata.
 */
public record ResourceResponse(
        String tenantId,
        String resourceId,
        String name,
        String resourceClass,
        String category,
        String status,
        String state,
        String isa95Path,
        double x,
        double y,
        double z,
        Set<String> capabilities,
        Map<String, Object> properties,
        long version,
        String createdAt,
        String lastModifiedAt
) implements Serializable {

    public static ResourceResponse fromResource(Resource resource) {
        if (resource == null) {
            return null;
        }
        Map<String, Object> props = new HashMap<>();
        resource.getProperties().forEach((k, v) -> props.put(k, v.value()));

        return new ResourceResponse(
                resource.getId().tenantId(),
                resource.getId().resourceId(),
                resource.getName(),
                resource.getResourceClass().code(),
                resource.getCategory().name(),
                resource.getStatus().name(),
                resource.getState().name(),
                resource.getHierarchyPath().toPathString(),
                resource.getCoordinate().x(),
                resource.getCoordinate().y(),
                resource.getCoordinate().z(),
                resource.getCapabilities(),
                Collections.unmodifiableMap(props),
                resource.getVersion(),
                resource.getCreatedAt().toString(),
                resource.getLastModifiedAt().toString()
        );
    }
}
