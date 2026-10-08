package com.company.warehouse.wes.api.dto.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MethodTestRequestDto implements Serializable {
    private String methodName;
    @Builder.Default
    private String language = "JAVA";
    private String javaCode;
    private String script;
    private Map<String, Object> parameters;
    private Map<String, Object> properties;
    private String storeResultToProperty;

    public String getEffectiveScript() {
        if (script != null && !script.isBlank()) {
            return script;
        }
        return javaCode;
    }
}
