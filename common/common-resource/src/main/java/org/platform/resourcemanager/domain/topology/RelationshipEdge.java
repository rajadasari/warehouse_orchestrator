package org.platform.resourcemanager.domain.topology;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Directed relational edge between two managed resources in the operational topology graph.
 */
public record RelationshipEdge(
        ResourceId sourceId,
        ResourceId targetId,
        RelationshipType type,
        Map<String, String> metadata
) implements Serializable {

    public RelationshipEdge {
        Objects.requireNonNull(sourceId, "sourceId must not be null");
        Objects.requireNonNull(targetId, "targetId must not be null");
        Objects.requireNonNull(type, "type must not be null");
        metadata = (metadata == null) ? Map.of() : Map.copyOf(metadata);
    }

    public static RelationshipEdge of(ResourceId sourceId, ResourceId targetId, RelationshipType type) {
        return new RelationshipEdge(sourceId, targetId, type, Map.of());
    }

    public static RelationshipEdge of(ResourceId sourceId, ResourceId targetId, RelationshipType type, Map<String, String> metadata) {
        return new RelationshipEdge(sourceId, targetId, type, metadata);
    }
}
