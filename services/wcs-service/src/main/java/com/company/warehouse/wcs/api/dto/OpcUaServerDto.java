package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.UUID;

@Builder
public record OpcUaServerDto(
        UUID id,
        String serverCode,
        Integer bindPort,
        String endpointPath,
        String namespaceUri,
        String supportedSecurityPolicies,
        String supportedAuthTypes,
        boolean autoStart,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
