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
public class WorkflowDefinitionDto implements Serializable {

    private UUID id;

    @NotBlank(message = "Workflow code is required")
    private String workflowCode;

    @NotBlank(message = "Workflow name is required")
    private String name;

    private String description;

    @Builder.Default
    private String category = "INBOUND";

    @Builder.Default
    private int version = 1;

    private Map<String, Object> canvasGraph;

    @Builder.Default
    private boolean active = true;

    private Instant createdAt;
    private Instant updatedAt;
}
