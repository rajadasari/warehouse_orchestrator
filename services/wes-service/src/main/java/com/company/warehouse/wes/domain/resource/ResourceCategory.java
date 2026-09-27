package com.company.warehouse.wes.domain.resource;

public enum ResourceCategory {
    SOFTWARE,
    HARDWARE,
    DEVICE;

    public static ResourceCategory fromString(String val) {
        if (val == null || val.trim().isEmpty()) return SOFTWARE;
        try {
            return ResourceCategory.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return SOFTWARE;
        }
    }
}
