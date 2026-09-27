package com.company.warehouse.wes.domain.resource;

public enum CommunicationProtocol {
    REST,
    GRPC;

    public static CommunicationProtocol fromString(String val) {
        if (val == null || val.trim().isEmpty()) return REST;
        try {
            return CommunicationProtocol.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return REST;
        }
    }
}
