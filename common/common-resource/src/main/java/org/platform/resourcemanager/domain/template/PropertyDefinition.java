package org.platform.resourcemanager.domain.template;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Metadata definition for a property inside a ResourceTemplate.
 * Supports typed validation, required constraints, default values, and auth flags.
 */
public record PropertyDefinition(
        String key,
        String label,
        PropertyType type,
        boolean required,
        Object defaultValue,
        String unit,
        List<String> options,
        String description,
        boolean useForAuth
) implements Serializable {

    public enum PropertyType {
        // Primitive / Scalar types
        STRING,          // java.lang.String
        INTEGER,         // java.lang.Integer, java.lang.Short, java.lang.Byte (32-bit signed)
        LONG,            // java.lang.Long (64-bit integer, counters, epoch timestamps)
        DOUBLE,          // java.lang.Double, java.lang.Float (64-bit IEEE floating-point)
        BOOLEAN,         // java.lang.Boolean (true/false)
        
        // Date / Time types
        DATETIME,        // java.time.Instant, java.time.ZonedDateTime
        
        // Security & Enums
        SECRET,          // Masked credential / auth token
        ENUM,            // Constrained string matching options list
        
        // Composite / Industrial Data Structures
        ARRAY,           // java.util.List<?>
        MAP,             // java.util.Map<String, Object> (JSON object)
        BYTE_ARRAY,      // byte[] / BLOB (raw payload, image, firmware hex)
        LOCATION         // SpatialCoordinate (x, y, z, yaw, floorId) / GPS
    }

    public PropertyDefinition {
        Objects.requireNonNull(key, "key must not be null");
        if (key.isBlank()) {
            throw new IllegalArgumentException("key must not be blank");
        }
        label = (label == null || label.isBlank()) ? key : label.trim();
        type = (type == null) ? PropertyType.STRING : type;
        unit = (unit == null) ? "" : unit.trim();
        options = (options == null) ? List.of() : List.copyOf(options);
        description = (description == null) ? "" : description.trim();
    }

    public static PropertyDefinition of(String key, PropertyType type, boolean required, Object defaultValue) {
        return new PropertyDefinition(key, key, type, required, defaultValue, "", List.of(), "", false);
    }

    public static PropertyDefinition stringProp(String key, boolean required, String defaultValue) {
        return of(key, PropertyType.STRING, required, defaultValue);
    }

    public static PropertyDefinition integerProp(String key, boolean required, Integer defaultValue, String unit) {
        return new PropertyDefinition(key, key, PropertyType.INTEGER, required, defaultValue, unit, List.of(), "", false);
    }

    public static PropertyDefinition longProp(String key, boolean required, Long defaultValue, String unit) {
        return new PropertyDefinition(key, key, PropertyType.LONG, required, defaultValue, unit, List.of(), "", false);
    }

    public static PropertyDefinition doubleProp(String key, boolean required, Double defaultValue, String unit) {
        return new PropertyDefinition(key, key, PropertyType.DOUBLE, required, defaultValue, unit, List.of(), "", false);
    }

    public static PropertyDefinition booleanProp(String key, boolean required, Boolean defaultValue) {
        return new PropertyDefinition(key, key, PropertyType.BOOLEAN, required, defaultValue, "", List.of(), "", false);
    }

    public static PropertyDefinition dateTimeProp(String key, boolean required) {
        return new PropertyDefinition(key, key, PropertyType.DATETIME, required, null, "", List.of(), "", false);
    }

    public static PropertyDefinition secretProp(String key, boolean required, boolean useForAuth) {
        return new PropertyDefinition(key, key, PropertyType.SECRET, required, null, "", List.of(), "", useForAuth);
    }

    public static PropertyDefinition enumProp(String key, boolean required, String defaultValue, List<String> options) {
        return new PropertyDefinition(key, key, PropertyType.ENUM, required, defaultValue, "", options, "", false);
    }

    public static PropertyDefinition mapProp(String key, boolean required) {
        return new PropertyDefinition(key, key, PropertyType.MAP, required, null, "", List.of(), "", false);
    }

    public static PropertyDefinition byteArrayProp(String key, boolean required) {
        return new PropertyDefinition(key, key, PropertyType.BYTE_ARRAY, required, null, "", List.of(), "", false);
    }

    public static PropertyDefinition locationProp(String key, boolean required) {
        return new PropertyDefinition(key, key, PropertyType.LOCATION, required, null, "", List.of(), "", false);
    }

    /**
     * Compatibility alias returning the property key as its name.
     */
    public String name() {
        return key();
    }

    /**
     * Compatibility alias for read-only constraint.
     */
    public boolean readOnly() {
        return false;
    }
}
