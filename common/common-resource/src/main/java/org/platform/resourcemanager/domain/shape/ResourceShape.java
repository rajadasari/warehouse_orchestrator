package org.platform.resourcemanager.domain.shape;

import org.platform.resourcemanager.domain.template.MethodDefinition;
import org.platform.resourcemanager.domain.template.PropertyDefinition;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Universal Resource Shape Domain Aggregate.
 * Represents a reusable package of property definitions, default values, and method signatures
 * that can be composed into multiple ResourceTemplates without deep inheritance hierarchy.
 */
public record ResourceShape(
        String shapeCode,
        String shapeName,
        String description,
        Map<String, Object> defaultProperties,
        List<PropertyDefinition> properties,
        List<MethodDefinition> methods,
        Instant createdAt,
        Instant updatedAt
) implements Serializable {

    public ResourceShape {
        Objects.requireNonNull(shapeCode, "shapeCode must not be null");
        if (shapeCode.isBlank()) {
            throw new IllegalArgumentException("shapeCode must not be blank");
        }
        shapeCode = shapeCode.trim().toUpperCase();
        shapeName = (shapeName == null || shapeName.isBlank()) ? shapeCode : shapeName.trim();
        description = (description == null) ? "" : description.trim();
        defaultProperties = (defaultProperties == null) ? Map.of() : Map.copyOf(defaultProperties);
        properties = (properties == null) ? List.of() : List.copyOf(properties);
        methods = (methods == null) ? List.of() : List.copyOf(methods);
        createdAt = (createdAt == null) ? Instant.now() : createdAt;
        updatedAt = (updatedAt == null) ? createdAt : updatedAt;
    }

    public static ResourceShape of(String shapeCode, String shapeName, List<PropertyDefinition> properties, List<MethodDefinition> methods) {
        return new ResourceShape(shapeCode, shapeName, "", Map.of(), properties, methods, Instant.now(), Instant.now());
    }
}
