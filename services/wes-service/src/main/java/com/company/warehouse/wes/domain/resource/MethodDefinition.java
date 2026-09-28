package com.company.warehouse.wes.domain.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MethodDefinition implements Serializable {
    private String name;
    private String displayName;
    @Builder.Default
    private String category = "GENERAL";
    private String description;
    @Builder.Default
    private Map<String, Object> parametersSchema = new HashMap<>();
    @Builder.Default
    private Map<String, Object> outputSchema = new HashMap<>();
}
