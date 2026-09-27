package com.company.warehouse.wes.domain.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MethodDefinition implements Serializable {
    private String name;
    private String type; // AUTHENTICATION, DIAGNOSTIC, EXECUTION
    private String description;
    private List<String> supportedStrategies;
    private String safetyTier; // READ_ONLY, OPERATIONAL, SAFETY_CRITICAL
    private Map<String, Object> parametersSchema;
    private Map<String, Object> samplePayload;
}
