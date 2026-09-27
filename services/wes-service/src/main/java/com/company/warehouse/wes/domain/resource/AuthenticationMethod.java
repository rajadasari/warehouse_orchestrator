package com.company.warehouse.wes.domain.resource;

public enum AuthenticationMethod {
    OAUTH2_BEARER,
    API_KEY,
    BASIC_AUTH,
    NONE;

    public static AuthenticationMethod fromString(String val) {
        if (val == null || val.trim().isEmpty()) return NONE;
        try {
            return AuthenticationMethod.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return NONE;
        }
    }
}
