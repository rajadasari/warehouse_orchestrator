package com.company.warehouse.wes.business.workflow.node;

import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import lombok.Builder;

import java.util.Map;

/**
 * Execution context passed to each WorkflowNodeHandler.
 */
@Builder
public record WorkflowNodeExecutionContext(
        String nodeId,
        String nodeType,
        String nodeLabel,
        Map<String, Object> nodeConfig,
        Map<String, Object> context,
        WorkflowInstanceEntity instance,
        boolean simulationMode
) {}
