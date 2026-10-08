package com.company.warehouse.wes.domain.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MethodExecutionResult implements Serializable {
    private boolean success;
    private String methodName;
    private String resourceId;
    private String message;
    private Integer statusCode;
    private Long executionTimeMs;
    private Object data;
    private String error;
    @Builder.Default
    private java.util.List<com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry> traceLogs = new java.util.ArrayList<>();
    private java.util.Map<String, Object> updatedProperties;
}
