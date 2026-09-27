package com.company.warehouse.wes.domain.resource;

public enum ResourceType {
    REST_GENERIC,
    WMS_REST,
    ERP_REST,
    WCS_REST,
    SERVICE_GRPC;

    public static ResourceType fromString(String val) {
        if (val == null || val.trim().isEmpty()) return REST_GENERIC;
        try {
            return ResourceType.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return REST_GENERIC;
        }
    }
}
