package com.company.warehouse.wes.business.workflow.node;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;

/**
 * Universal SPI interface for executing specific workflow node types.
 * Enables modular, extensible node implementations adhering to the file length limit.
 */
public interface WorkflowNodeHandler {

    /**
     * Determines whether this handler supports the given node type (case-insensitive).
     */
    boolean supports(String nodeType);

    /**
     * Executes the specific node logic.
     */
    NodeExecutionResult execute(WorkflowNodeExecutionContext context);
}
