package com.company.warehouse.wes.business.resource.composer.model;

import lombok.Getter;

import java.util.Arrays;

/**
 * Functional categorization of an entity service/method.
 */
@Getter
public enum ServiceType {
    AUTHENTICATION("Authentication and credential verification"),
    DIAGNOSTIC("Health checks, ping, and diagnostic telemetry"),
    EXECUTION("State-changing operational commands and tasks"),
    QUERY("Data retrieval and read-only telemetry queries");

    private final String description;

    ServiceType(String description) {
        this.description = description;
    }

    public static ServiceType fromString(String val) {
        if (val == null || val.trim().isEmpty()) {
            return EXECUTION;
        }
        String clean = val.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(t -> t.name().equals(clean))
                .findFirst()
                .orElse(EXECUTION);
    }
}
