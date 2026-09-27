package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.UUID;

@Builder
public record OpcUaTagMappingDto(
        UUID id,
        String tagKey,
        String nodeId,
        String dataType,
        String accessLevel,
        String equipmentCode,
        String clientCode,
        String serverCode,
        Double samplingIntervalMs,
        Double deadband,
        String description,
        Instant createdAt,
        Instant updatedAt
) {}
