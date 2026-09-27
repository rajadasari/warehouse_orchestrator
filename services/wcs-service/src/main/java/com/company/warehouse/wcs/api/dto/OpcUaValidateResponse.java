package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record OpcUaValidateResponse(
        boolean valid,
        String message,
        List<String> errors,
        List<String> warnings
) {
    public static OpcUaValidateResponse success(String message) {
        return OpcUaValidateResponse.builder()
                .valid(true)
                .message(message)
                .errors(List.of())
                .warnings(List.of())
                .build();
    }

    public static OpcUaValidateResponse failure(List<String> errors) {
        return OpcUaValidateResponse.builder()
                .valid(false)
                .message("Validation failed with " + errors.size() + " error(s)")
                .errors(errors)
                .warnings(List.of())
                .build();
    }
}
