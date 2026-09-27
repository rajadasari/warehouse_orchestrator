package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.util.List;
import java.util.Map;

@Builder
public record StationNodeGenerateResponse(
        String templateCode,
        String stationCode,
        Map<String, Object> node,
        List<String> requiredInputs,
        List<String> outputVariables
) {}
