package com.company.warehouse.wes.api.dto.workflow;

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
public class WorkflowInstanceDto implements Serializable {

    private UUID id;
    private String workflowCode;
    private String entityReference;
    private String status;
    private String currentNodeId;
    private String correlationKey;
    private Map<String, Object> contextData;
    private String errorMessage;
    private Instant createdAt;
    private Instant updatedAt;
}
