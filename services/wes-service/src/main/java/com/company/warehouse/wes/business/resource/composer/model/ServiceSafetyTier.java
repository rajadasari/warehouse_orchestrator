package com.company.warehouse.wes.business.resource.composer.model;

import lombok.Getter;

import java.util.Arrays;

/**
 * IEC 62443 aligned industrial safety tier for entity operations.
 */
@Getter
public enum ServiceSafetyTier {
    READ_ONLY("Non-intrusive, read-only telemetry or diagnostic query"),
    OPERATIONAL("Standard industrial or software workflow command"),
    SAFETY_CRITICAL("High-impact physical machinery actuation or critical authorization");

    private final String description;

    ServiceSafetyTier(String description) {
        this.description = description;
    }

    public static ServiceSafetyTier fromString(String val) {
        if (val == null || val.trim().isEmpty()) {
            return OPERATIONAL;
        }
        String clean = val.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(t -> t.name().equals(clean))
                .findFirst()
                .orElse(OPERATIONAL);
    }
}
