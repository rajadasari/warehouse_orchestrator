package com.company.warehouse.wes.business.resource.snippet;

import java.util.Map;

/**
 * Common contract for standard industrial execution snippets.
 * Snippets can be bound to:
 * 1. Resource Template Methods (OOP inheritance across instances)
 * 2. Resource Instance Methods (concrete machine custom overrides)
 * 3. Canvas Workflow Nodes (data transformation and pipeline logic)
 */
public interface SystemSnippet {

    /**
     * Unique identifier for the snippet (e.g. "OPC_UA_WRITE_TAG", "REST_DISPATCH").
     */
    String getSnippetId();

    /**
     * Human-readable display name.
     */
    String getDisplayName();

    /**
     * Functional category (HARDWARE, API, CALCULATION, TRANSFORM, DIAGNOSTIC).
     */
    String getCategory();

    /**
     * Functional description for engineers and operators.
     */
    String getDescription();

    /**
     * Input schema describing expected parameters, types, defaults, and requirements.
     */
    Map<String, Object> getParametersSchema();

    /**
     * Output schema describing return fields, types, and sample data.
     */
    Map<String, Object> getOutputSchema();

    /**
     * Executes the snippet logic against the provided context.
     */
    SnippetExecutionResult execute(SnippetExecutionContext context);
}
