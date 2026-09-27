package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.UUID;

@Builder
public record OpcUaClientDto(
        UUID id,
        String clientCode,
        String endpointUrl,
        String securityPolicy,
        String authType,
        String username,
        String password,
        String keystorePath,
        String certificateAlias,
        Long requestTimeoutMs,
        Long sessionTimeoutMs,
        Long reconnectIntervalMs,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
