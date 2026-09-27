package com.company.warehouse.wes.business.resource.composer.model;

import lombok.Getter;

import java.util.Arrays;

/**
 * Supported data shape primitive and complex types for entity properties.
 */
@Getter
public enum PropertyBaseType {
    STRING("String value"),
    NUMBER("Numeric value (integer or floating point)"),
    INTEGER("32-bit signed integer"),
    LONG("64-bit integer / counter"),
    DOUBLE("64-bit floating point"),
    BOOLEAN("Boolean flag (true/false)"),
    DATETIME("Timestamp (Instant / ISO-8601)"),
    ENUM("Enumerated set of discrete values"),
    SECRET("Sensitive masked credential string"),
    JSON("Structured JSON object or document"),
    MAP("Key-value property map"),
    ARRAY("List of values"),
    BYTE_ARRAY("Raw byte payload / binary"),
    LOCATION("Spatial coordinate (x, y, z, yaw, floorId)");

    private final String description;

    PropertyBaseType(String description) {
        this.description = description;
    }

    public static PropertyBaseType fromString(String val) {
        if (val == null || val.trim().isEmpty()) {
            return STRING;
        }
        String clean = val.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(t -> t.name().equals(clean))
                .findFirst()
                .orElse(STRING);
    }
}
