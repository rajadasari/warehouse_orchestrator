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
public class WorkflowExecutionLogDto implements Serializable {

    private UUID id;
    private UUID instanceId;
    private int stepSequence;
    private String nodeId;
    private String nodeType;
    private String nodeName;
    private Map<String, Object> inputData;
    private Map<String, Object> outputData;
    private String status;
    private long durationMs;
    private String errorDetails;
    private Instant executedAt;
}
