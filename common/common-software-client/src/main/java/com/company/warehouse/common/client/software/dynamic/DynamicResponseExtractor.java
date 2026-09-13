package com.company.warehouse.common.client.software.dynamic;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

/**
 * Universal extractor to pull fields, tokens, and status codes out of arbitrary JSON responses.
 */
@Slf4j
@Component
public class DynamicResponseExtractor {

    /**
     * Extracts a token from standard paths or user-specified field.
     */
    public Optional<String> extractToken(JsonNode root, String preferredField) {
        if (root == null || !root.isObject()) return Optional.empty();

        if (preferredField != null && !preferredField.trim().isEmpty()) {
            JsonNode direct = findFieldCaseInsensitive(root, preferredField.trim());
            if (direct != null && !direct.isNull() && direct.isValueNode()) {
                return Optional.of(direct.asText());
            }
        }

        // Standard token field fallbacks
        String[] standardFields = {"accessToken", "access_token", "token", "jwt", "id_token", "authToken"};
        for (String f : standardFields) {
            JsonNode val = findFieldCaseInsensitive(root, f);
            if (val != null && !val.isNull() && val.isValueNode()) {
                return Optional.of(val.asText());
            }
        }

        // Check common nested data containers (e.g. data.token, payload.accessToken)
        String[] containers = {"data", "payload", "result", "response"};
        for (String c : containers) {
            JsonNode container = findFieldCaseInsensitive(root, c);
            if (container != null && container.isObject()) {
                Optional<String> nested = extractToken(container, preferredField);
                if (nested.isPresent()) return nested;
            }
        }

        return Optional.empty();
    }

    /**
     * Extracts an identifier (e.g. orderId, preAnnounceId, taskId) from a JSON response.
     */
    public Optional<String> extractId(JsonNode root, String... candidateFields) {
        if (root == null || !root.isObject()) return Optional.empty();

        for (String f : candidateFields) {
            JsonNode node = findFieldCaseInsensitive(root, f);
            if (node != null && !node.isNull() && node.isValueNode()) {
                return Optional.of(node.asText());
            }
        }

        String[] containers = {"data", "payload", "result"};
        for (String c : containers) {
            JsonNode container = findFieldCaseInsensitive(root, c);
            if (container != null && container.isObject()) {
                Optional<String> nested = extractId(container, candidateFields);
                if (nested.isPresent()) return nested;
            }
        }

        return Optional.empty();
    }

    /**
     * Checks if response represents a successful operation.
     */
    public boolean isSuccess(JsonNode root) {
        if (root == null) return false;

        JsonNode successNode = findFieldCaseInsensitive(root, "success");
        if (successNode != null && successNode.isBoolean()) {
            return successNode.asBoolean();
        }

        JsonNode statusNode = findFieldCaseInsensitive(root, "status");
        if (statusNode != null && statusNode.isTextual()) {
            String s = statusNode.asText().toUpperCase();
            return s.equals("SUCCESS") || s.equals("OK") || s.equals("ACCEPTED") || s.equals("COMPLETED");
        }

        // If no explicit failure indicators exist, default to true for HTTP 2xx
        return true;
    }

    private JsonNode findFieldCaseInsensitive(JsonNode node, String fieldName) {
        if (!node.isObject()) return null;
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            if (entry.getKey().equalsIgnoreCase(fieldName)) {
                return entry.getValue();
            }
        }
        return null;
    }
}
