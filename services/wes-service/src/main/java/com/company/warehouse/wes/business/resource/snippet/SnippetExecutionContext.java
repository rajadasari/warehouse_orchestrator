package com.company.warehouse.wes.business.resource.snippet;

import java.io.Serializable;
import java.util.Collections;
import java.util.Map;

/**
 * Execution context provided to a SystemSnippet when invoked on a resource or workflow node.
 */
public record SnippetExecutionContext(
        String resourceId,
        String methodId,
        Map<String, Object> resourceProperties,
        Map<String, Object> inputParameters
) implements Serializable {

    public SnippetExecutionContext {
        resourceProperties = resourceProperties == null ? Collections.emptyMap() : Collections.unmodifiableMap(resourceProperties);
        inputParameters = inputParameters == null ? Collections.emptyMap() : Collections.unmodifiableMap(inputParameters);
    }
}
