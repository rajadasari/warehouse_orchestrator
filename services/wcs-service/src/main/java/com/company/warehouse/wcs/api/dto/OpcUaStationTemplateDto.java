package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Builder
public record OpcUaStationTemplateDto(
        UUID id,
        String templateCode,
        String name,
        String description,
        List<Map<String, Object>> relativeTags,
        List<Map<String, Object>> sequenceSteps,
        String outputVariable,
        Instant createdAt,
        Instant updatedAt
) {}
