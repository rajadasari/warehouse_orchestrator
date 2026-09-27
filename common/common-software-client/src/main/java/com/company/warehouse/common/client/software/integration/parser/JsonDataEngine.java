package com.company.warehouse.common.client.software.integration.parser;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Universal JSON Parsing & Evaluation Engine using Jackson.
 */
@Slf4j
@Component
public class JsonDataEngine implements UniversalDataParser {

    private final ObjectMapper objectMapper;

    public JsonDataEngine(ObjectMapper objectMapper) {
        ObjectMapper mapper = objectMapper != null ? objectMapper.copy() : new ObjectMapper();
        mapper.findAndRegisterModules();
        this.objectMapper = mapper;
    }

    @Override
    public boolean supportsFormat(String format) {
        return "JSON".equalsIgnoreCase(format) || "APPLICATION/JSON".equalsIgnoreCase(format) || "TEXT/JSON".equalsIgnoreCase(format);
    }

    @Override
    public Map<String, Object> parseToMap(String rawPayload) {
        if (rawPayload == null || rawPayload.trim().isEmpty()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(rawPayload.trim(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse JSON to Map: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid JSON payload: " + e.getMessage(), e);
        }
    }

    @Override
    public Object extractValue(String rawPayload, String pathExpression) {
        if (rawPayload == null || pathExpression == null || pathExpression.trim().isEmpty()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(rawPayload.trim());
            return evaluateJsonPath(root, pathExpression.trim());
        } catch (Exception e) {
            log.debug("JSON extraction failed for path '{}': {}", pathExpression, e.getMessage());
            return null;
        }
    }

    /**
     * Resolves dot-notation or JSONPath expressions (e.g. "$.header.id", "pallet.lpn", "items[0].sku").
     */
    public Object evaluateJsonPath(JsonNode root, String path) {
        if (root == null || path == null || path.isBlank()) {
            return null;
        }

        String normalized = path.trim();
        if (normalized.startsWith("$.")) {
            normalized = normalized.substring(2);
        } else if (normalized.startsWith("$")) {
            normalized = normalized.substring(1);
        }
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1).replace('/', '.');
        }

        String[] tokens = normalized.split("\\.");
        JsonNode current = root;

        for (String token : tokens) {
            if (token.isEmpty()) continue;

            // Handle array index like items[0]
            if (token.contains("[") && token.endsWith("]")) {
                int openIdx = token.indexOf('[');
                String fieldName = token.substring(0, openIdx);
                String indexStr = token.substring(openIdx + 1, token.length() - 1);

                if (!fieldName.isEmpty()) {
                    current = current.path(fieldName);
                }
                try {
                    int idx = Integer.parseInt(indexStr);
                    current = current.path(idx);
                } catch (NumberFormatException e) {
                    return null;
                }
            } else {
                current = current.path(token);
            }

            if (current.isMissingNode() || current.isNull()) {
                return null;
            }
        }

        return convertJsonNode(current);
    }

    private Object convertJsonNode(JsonNode node) {
        if (node.isNull() || node.isMissingNode()) return null;
        if (node.isBoolean()) return node.asBoolean();
        if (node.isInt()) return node.asInt();
        if (node.isLong()) return node.asLong();
        if (node.isDouble() || node.isFloat() || node.isBigDecimal()) return node.asDouble();
        if (node.isTextual()) return node.asText();
        if (node.isArray()) {
            List<Object> list = new ArrayList<>();
            for (JsonNode item : node) {
                list.add(convertJsonNode(item));
            }
            return list;
        }
        if (node.isObject()) {
            return objectMapper.convertValue(node, new TypeReference<Map<String, Object>>() {});
        }
        return node.asText();
    }
}
