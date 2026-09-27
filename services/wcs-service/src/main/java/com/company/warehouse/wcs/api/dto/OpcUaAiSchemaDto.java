package com.company.warehouse.wcs.api.dto;

import lombok.Builder;

import java.util.List;
import java.util.Map;

/**
 * Self-describing schema contract exposed to AI configuration agents.
 */
@Builder
public record OpcUaAiSchemaDto(
        String version,
        String description,
        List<String> supportedDataTypes,
        List<String> supportedSecurityPolicies,
        List<String> supportedAuthTypes,
        List<String> handshakeStepTypes,
        Map<String, String> nodeIdFormatExamples,
        Map<String, Object> sampleClientConfig,
        Map<String, Object> sampleServerConfig,
        Map<String, Object> sampleTagGroup,
        Map<String, Object> sampleStationTemplate,
        Map<String, Object> sampleWorkflowNode
) {}
