package com.company.warehouse.wes.api.dto.workflow;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowNodeTemplateDto implements Serializable {

    private UUID id;

    @NotBlank(message = "Template code is required")
    private String templateCode;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "Node type is required")
    private String nodeType;

    @Builder.Default
    private String category = "EQUIPMENT";

    @Builder.Default
    private String icon = "Cpu";

    @Builder.Default
    private String color = "emerald";

    @Builder.Default
    private boolean isSystem = false;

    private String resourceCode;

    private String targetMethod;

    private Map<String, Object> configuration;

    private Map<String, Object> inputSchema;

    private Map<String, Object> outputSchema;

    private String createdBy;

    private Instant createdAt;

    private Instant updatedAt;
}
