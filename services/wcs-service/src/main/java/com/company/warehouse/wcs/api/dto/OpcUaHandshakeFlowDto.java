package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Builder
public record OpcUaHandshakeFlowDto(
        UUID id,
        String flowCode,
        String name,
        String equipmentCode,
        String clientCode,
        List<Map<String, Object>> steps,
        Long timeoutMs,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
