package com.company.warehouse.wes.business.resource.snippet;

import java.io.Serializable;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * Standard execution result returned by all System Snippets.
 */
public record SnippetExecutionResult(
        boolean success,
        String snippetId,
        int statusCode,
        String message,
        Map<String, Object> data,
        Instant timestamp,
        long executionDurationMs
) implements Serializable {

    public SnippetExecutionResult {
        data = data == null ? Collections.emptyMap() : Collections.unmodifiableMap(data);
        timestamp = timestamp == null ? Instant.now() : timestamp;
    }

    public static SnippetExecutionResult success(String snippetId, String message, Map<String, Object> data, long durationMs) {
        return new SnippetExecutionResult(true, snippetId, 200, message, data, Instant.now(), durationMs);
    }

    public static SnippetExecutionResult failure(String snippetId, int statusCode, String message, long durationMs) {
        return new SnippetExecutionResult(false, snippetId, statusCode, message, Collections.emptyMap(), Instant.now(), durationMs);
    }
}
