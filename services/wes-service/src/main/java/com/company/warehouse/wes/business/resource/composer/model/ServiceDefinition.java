package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * Invokable snippet/method definition schema within an Entity Blueprint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceDefinition implements Serializable {

    private String name;

    private String displayName;

    @Builder.Default
    private String category = "GENERAL";

    private String description;

    private String pathTemplate;

    @Builder.Default
    private String httpMethod = "POST";

    private String language;

    private String javaCode;

    private String storeResultToProperty;

    private String outputType;

    @Builder.Default
    private Map<String, Object> parametersSchema = new HashMap<>();

    @Builder.Default
    private Map<String, Object> outputSchema = new HashMap<>();

    @Builder.Default
    private Map<String, String> defaultHeaders = new HashMap<>();

    @Builder.Default
    private Map<String, Object> additionalAttributes = new HashMap<>();
}
