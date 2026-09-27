package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

@Builder
public record StationNodeGenerateRequest(
        String templateCode,
        String stationCode,
        String stationLabel,
        String tagPrefix,
        String clientCode,
        String outputVariable
) {}
