package org.platform.resourcemanager.domain.model;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * Dynamically typed property or live telemetry metric with schema reference and update timestamp.
 */
public record DynamicProperty(
        String key,
        Object value,
        Instant timestamp,
        String schemaRef
) implements Serializable {

    public DynamicProperty {
        Objects.requireNonNull(key, "key must not be null");
        if (key.isBlank()) {
            throw new IllegalArgumentException("key must not be blank");
        }
        timestamp = (timestamp == null) ? Instant.now() : timestamp;
        schemaRef = (schemaRef == null || schemaRef.isBlank()) ? "urn:schema:generic" : schemaRef;
    }

    public static DynamicProperty of(String key, Object value) {
        return new DynamicProperty(key, value, Instant.now(), "urn:schema:generic");
    }

    public static DynamicProperty of(String key, Object value, String schemaRef) {
        return new DynamicProperty(key, value, Instant.now(), schemaRef);
    }
}
