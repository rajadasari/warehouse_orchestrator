package com.company.warehouse.wes.domain.resource;

public enum ResourceStatus {
    ACTIVE,
    INACTIVE,
    MAINTENANCE;

    public static ResourceStatus fromString(String val) {
        if (val == null || val.trim().isEmpty()) return ACTIVE;
        try {
            return ResourceStatus.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ACTIVE;
        }
    }
}
