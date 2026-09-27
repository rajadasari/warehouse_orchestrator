package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.util.Map;

@Builder
public record OpcUaValidateRequest(
        String targetType, // CLIENT, SERVER, TAG, GROUP, HANDSHAKE, TEMPLATE
        Map<String, Object> payload
) {}
