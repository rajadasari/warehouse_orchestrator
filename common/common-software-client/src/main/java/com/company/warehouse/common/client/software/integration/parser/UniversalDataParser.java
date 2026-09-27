package com.company.warehouse.common.client.software.integration.parser;

import java.util.Map;

/**
 * Universal data parser interface for extracting structured fields from arbitrary document payloads.
 */
public interface UniversalDataParser {

    /**
     * Determines whether this parser supports the given format name (e.g. "XML", "JSON").
     */
    boolean supportsFormat(String format);

    /**
     * Parses the raw string into a hierarchical Map structure.
     */
    Map<String, Object> parseToMap(String rawPayload);

    /**
     * Evaluates a path expression (e.g. XPath or JSONPath) against the raw payload.
     */
    Object extractValue(String rawPayload, String pathExpression);
}
