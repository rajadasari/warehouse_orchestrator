package com.company.warehouse.common.client.software.integration.handshake;

public enum HandshakeMode {
    SYNC_IMMEDIATE,
    ASYNC_CALLBACK,
    ASYNC_POLLING,
    ASYNC_EVENT;

    public static HandshakeMode fromString(String val) {
        if (val == null || val.trim().isEmpty()) return SYNC_IMMEDIATE;
        try {
            return HandshakeMode.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return SYNC_IMMEDIATE;
        }
    }
}
