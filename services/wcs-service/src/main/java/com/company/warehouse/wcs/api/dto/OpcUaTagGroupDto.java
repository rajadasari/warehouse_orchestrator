package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Builder
public record OpcUaTagGroupDto(
        UUID id,
        String groupKey,
        String description,
        String equipmentCode,
        List<String> tagKeys,
        Instant createdAt,
        Instant updatedAt
) {}
