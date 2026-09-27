package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Invokable service or method definition schema within an Entity Blueprint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceDefinition implements Serializable {

    private String name;

    @Builder.Default
    private ServiceType type = ServiceType.EXECUTION;

    @Builder.Default
    private ServiceSafetyTier safetyTier = ServiceSafetyTier.OPERATIONAL;

    private String description;

    @Builder.Default
    private List<String> supportedStrategies = new ArrayList<>();

    private String pathTemplate;

    @Builder.Default
    private String httpMethod = "POST";

    @Builder.Default
    private Map<String, Object> parametersSchema = new HashMap<>();

    @Builder.Default
    private Map<String, Object> samplePayload = new HashMap<>();

    @Builder.Default
    private Map<String, String> defaultHeaders = new HashMap<>();
}
