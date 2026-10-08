package com.company.warehouse.common.client.software.dynamic;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.BooleanNode;
import com.fasterxml.jackson.databind.node.DoubleNode;
import com.fasterxml.jackson.databind.node.LongNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Universal Dynamic Payload and Header Engine.
 * Evaluates template expressions {{ path | defaultValue }} and built-ins (fn.now, fn.uuid)
 * against arbitrary context data.
 */
@Slf4j
@Component("commonDynamicPayloadEngine")
public class DynamicPayloadEngine {

    private final ObjectMapper objectMapper;

    public DynamicPayloadEngine(ObjectMapper objectMapper) {
        ObjectMapper mapper = objectMapper != null ? objectMapper.copy() : new ObjectMapper();
        mapper.findAndRegisterModules();
        this.objectMapper = mapper;
    }

    // Pattern to match {{ path | defaultValue }} or {{ path }}
    private static final Pattern TOKEN_PATTERN = Pattern.compile("\\{\\{\\s*([^}|]+?)(?:\\s*\\|\\s*([^}]+?))?\\s*\\}\\}");
    // Pattern to match single-brace path variables like {palletId}, {orderId}, {id}
    private static final Pattern PATH_VAR_PATTERN = Pattern.compile("\\{([a-zA-Z0-9_.-]+)\\}");
    private static final int MAX_TEMPLATE_CACHE_SIZE = 500;

    // In-memory cache for compiled/parsed template structures (bounded)
    private final Map<String, JsonNode> templateCache = new ConcurrentHashMap<>();

    /**
     * Resolves dynamic variables in an endpoint URL or query string.
     * Supports both OpenAPI path variables: /api/orders/{orderId}
     * and Handlebars expressions: /api/orders/{{order.id}}?filter={{status}}
     * Automatically URL-encodes substituted values to prevent malformed requests.
     */
    public String resolveUrl(String urlTemplate, Map<String, Object> context) {
        if (urlTemplate == null || urlTemplate.trim().isEmpty()) {
            return "";
        }

        JsonNode contextNode = objectMapper.valueToTree(context != null ? context : Map.of());
        String url = urlTemplate.trim();
        // Strip leading HTTP method if user included it (e.g. "GET /api/pallets/{palletId}" -> "/api/pallets/{palletId}")
        url = url.replaceFirst("^(?i)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\\s+", "");

        // 1. Resolve {{ path | defaultValue }} Handlebars expressions
        Matcher hbMatcher = TOKEN_PATTERN.matcher(url);
        StringBuilder sb = new StringBuilder();
        while (hbMatcher.find()) {
            String path = hbMatcher.group(1).trim();
            String defaultValue = hbMatcher.group(2) != null ? cleanQuotes(hbMatcher.group(2).trim()) : "";
            JsonNode valNode = resolveValue(path, defaultValue, contextNode);
            String rawVal = (!valNode.isNull() && !valNode.isMissingNode())
                    ? (valNode.isTextual() ? valNode.asText() : valNode.toString())
                    : defaultValue;
            String encoded = urlEncode(rawVal);
            hbMatcher.appendReplacement(sb, Matcher.quoteReplacement(encoded));
        }
        hbMatcher.appendTail(sb);
        url = sb.toString();

        // 2. Resolve single-brace {pathVariable} OpenAPI variables
        Matcher pvMatcher = PATH_VAR_PATTERN.matcher(url);
        sb = new StringBuilder();
        while (pvMatcher.find()) {
            String varName = pvMatcher.group(1).trim();
            JsonNode valNode = resolveValue(varName, null, contextNode);
            // If not found at root, try case-insensitive and generic container lookups
            if (valNode.isNull() || valNode.isMissingNode()) {
                valNode = findGenericAlias(varName, contextNode);
            }

            if (!valNode.isNull() && !valNode.isMissingNode()) {
                String rawVal = valNode.isTextual() ? valNode.asText() : valNode.toString();
                String encoded = urlEncode(rawVal);
                pvMatcher.appendReplacement(sb, Matcher.quoteReplacement(encoded));
            } else {
                // If not in context, leave variable template unchanged
                pvMatcher.appendReplacement(sb, Matcher.quoteReplacement("{" + varName + "}"));
            }
        }
        pvMatcher.appendTail(sb);
        return sb.toString();
    }

    private JsonNode findGenericAlias(String key, JsonNode context) {
        if (context == null || !context.isObject()) return NullNode.getInstance();

        // 1. Direct root search case-insensitive
        JsonNode direct = findFieldCaseInsensitive(context, key);
        if (direct != null && !direct.isNull() && !direct.isMissingNode()) return direct;

        // 2. Normalized root search (e.g. pallet_id matches palletId or pallet-id)
        String normKey = key.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        Iterator<Map.Entry<String, JsonNode>> rootFields = context.fields();
        while (rootFields.hasNext()) {
            Map.Entry<String, JsonNode> entry = rootFields.next();
            if (entry.getKey().replaceAll("[^a-zA-Z0-9]", "").equalsIgnoreCase(normKey)) {
                return entry.getValue();
            }
        }

        // 3. Search inside top-level object containers (e.g. context.pallet, context.order, context.entity)
        Iterator<Map.Entry<String, JsonNode>> fields = context.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            if (entry.getValue().isObject()) {
                JsonNode child = findFieldCaseInsensitive(entry.getValue(), key);
                if (child != null && !child.isNull() && !child.isMissingNode()) return child;

                // Child normalized search
                Iterator<Map.Entry<String, JsonNode>> childFields = entry.getValue().fields();
                while (childFields.hasNext()) {
                    Map.Entry<String, JsonNode> childEntry = childFields.next();
                    if (childEntry.getKey().replaceAll("[^a-zA-Z0-9]", "").equalsIgnoreCase(normKey)) {
                        return childEntry.getValue();
                    }
                }

                // If key is or ends with "id" (e.g. {id}, {palletId}, {orderId})
                if (normKey.endsWith("id")) {
                    JsonNode idChild = findFieldCaseInsensitive(entry.getValue(), "id");
                    if (idChild != null && !idChild.isNull() && !idChild.isMissingNode()) {
                        String containerName = entry.getKey().replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                        if (normKey.equals("id") || normKey.startsWith(containerName)) {
                            return idChild;
                        }
                    }
                    // Check identifier fields like "lpn", "palletLpn", "code", "no"
                    String containerName = entry.getKey().replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                    if (normKey.startsWith(containerName) || normKey.equals("id")) {
                        for (String candidate : List.of("lpn", "palletLpn", "code", "skuCode", "itemCode", "number")) {
                            JsonNode candNode = findFieldCaseInsensitive(entry.getValue(), candidate);
                            if (candNode != null && !candNode.isNull() && !candNode.isMissingNode()) {
                                return candNode;
                            }
                        }
                    }
                }
            }
        }
        return NullNode.getInstance();
    }

    private String urlEncode(String value) {
        if (value == null || value.isEmpty()) return "";
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /**
     * Resolves and builds a JSON payload from a mapping template given context data.
     */
    public String buildPayload(String templateJson, Map<String, Object> context) {
        return buildPayload(templateJson, context, false);
    }

    /**
     * Resolves and builds a JSON payload with optional pretty-printing.
     */
    public String buildPayload(String templateJson, Map<String, Object> context, boolean prettyPrint) {
        if (templateJson == null || templateJson.trim().isEmpty() || "{}".equals(templateJson.trim())) {
            return "{}";
        }

        try {
            JsonNode rootTemplate = getOrParseTemplate(templateJson);
            JsonNode contextNode = objectMapper.valueToTree(context != null ? context : Map.of());
            JsonNode evaluatedNode = evaluateNode(rootTemplate.deepCopy(), contextNode);

            String result = prettyPrint
                    ? objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(evaluatedNode)
                    : objectMapper.writeValueAsString(evaluatedNode);

            if (log.isDebugEnabled()) {
                log.debug("[DynamicPayloadEngine] Payload generated successfully (size: {} chars, contextKeys: {})",
                        result.length(), context != null ? context.keySet() : "[]");
            }
            return result;
        } catch (Exception e) {
            log.error("[DynamicPayloadEngine] Template evaluation failed! Available context keys: {}, Error: {}, Template: '{}'",
                    context != null ? context.keySet() : "[]", e.getMessage(), templateJson, e);
            throw new RuntimeException("Payload template resolution failed: " + e.getMessage(), e);
        }
    }

    /**
     * Evaluates headers template given context data.
     */
    public Map<String, String> buildHeaders(String headersTemplateJson, Map<String, Object> context) {
        if (headersTemplateJson == null || headersTemplateJson.trim().isEmpty()) {
            return new HashMap<>(Map.of("Content-Type", "application/json"));
        }

        try {
            String resolvedJson = buildPayload(headersTemplateJson, context);
            Map<String, String> headers = objectMapper.readValue(resolvedJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
            Map<String, String> result = new HashMap<>();

            String activeToken = "";
            if (context != null) {
                if (context.containsKey("token") && context.get("token") != null) {
                    activeToken = String.valueOf(context.get("token"));
                } else if (context.containsKey("auth") && context.get("auth") instanceof Map) {
                    Object t = ((Map<?, ?>) context.get("auth")).get("token");
                    if (t != null) activeToken = String.valueOf(t);
                }
            }

            for (Map.Entry<String, String> entry : headers.entrySet()) {
                String val = entry.getValue();
                if (val != null && !activeToken.isEmpty()) {
                    val = val.replace("{{auth.bearerToken}}", "Bearer " + activeToken)
                             .replace("<token>", activeToken)
                             .replace("{token}", activeToken)
                             .replace("{{token}}", activeToken)
                             .replace("{{auth.token}}", activeToken);
                }
                result.put(entry.getKey(), val);
            }
            return result;
        } catch (Exception e) {
            log.warn("[DynamicPayloadEngine] Could not parse headers template: '{}'. Error: {}. Defaulting to application/json.",
                    headersTemplateJson, e.getMessage());
            return new HashMap<>(Map.of("Content-Type", "application/json"));
        }
    }

    /**
     * Clears in-memory template cache.
     */
    public void invalidateCache() {
        templateCache.clear();
        log.info("[DynamicPayloadEngine] Template cache invalidated");
    }

    private JsonNode getOrParseTemplate(String templateJson) throws JsonProcessingException {
        JsonNode cached = templateCache.get(templateJson);
        if (cached != null) {
            return cached;
        }

        if (templateCache.size() >= MAX_TEMPLATE_CACHE_SIZE) {
            log.debug("[DynamicPayloadEngine] Template cache capacity reached ({}), purging cache", MAX_TEMPLATE_CACHE_SIZE);
            templateCache.clear();
        }

        JsonNode parsed = objectMapper.readTree(templateJson);
        templateCache.put(templateJson, parsed);
        return parsed;
    }

    /**
     * Recursively evaluates a JSON tree node replacing {{...}} tokens.
     */
    private JsonNode evaluateNode(JsonNode node, JsonNode context) {
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                entry.setValue(evaluateNode(entry.getValue(), context));
            }
            return objectNode;
        } else if (node.isArray()) {
            ArrayNode arrayNode = (ArrayNode) node;
            for (int i = 0; i < arrayNode.size(); i++) {
                arrayNode.set(i, evaluateNode(arrayNode.get(i), context));
            }
            return arrayNode;
        } else if (node.isTextual()) {
            return resolveTextNode(node.asText(), context);
        }
        return node;
    }

    /**
     * Evaluates text value with {{ expression }}.
     * If the whole text is a single expression, preserves native types (Numbers, Booleans).
     */
    private JsonNode resolveTextNode(String text, JsonNode context) {
        if (!text.contains("{{")) {
            return new TextNode(text);
        }

        Matcher matcher = TOKEN_PATTERN.matcher(text);

        // Case 1: The entire string is a single token (e.g. "{{pallet.quantity | 10}}") -> preserve primitive type
        if (matcher.matches()) {
            String path = matcher.group(1).trim();
            String defaultValue = matcher.group(2) != null ? cleanQuotes(matcher.group(2).trim()) : null;
            return resolveValue(path, defaultValue, context);
        }

        // Case 2: String interpolation (e.g. "Barcode: {{pallet.palletLpn}}")
        matcher.reset();
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String path = matcher.group(1).trim();
            String defaultValue = matcher.group(2) != null ? cleanQuotes(matcher.group(2).trim()) : "";
            JsonNode valNode = resolveValue(path, defaultValue, context);
            String replacement = valNode.isTextual() ? valNode.asText() : valNode.toString();
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return new TextNode(sb.toString());
    }

    /**
     * Resolves a dot-path expression like "pallet.actualWeightKg" or built-in function "fn.now".
     */
    private JsonNode resolveValue(String path, String defaultValue, JsonNode context) {
        // Handle built-in functions
        if (path.startsWith("fn.")) {
            String fnName = path.substring(3).trim();
            return evaluateFunction(fnName);
        }

        // Handle dot-path navigation in context
        String[] segments = path.split("\\.");
        JsonNode current = context;
        JsonNode lastNode = context;
        String failedSegment = null;

        for (String segment : segments) {
            if (current == null || current.isNull() || current.isMissingNode()) {
                break;
            }
            lastNode = current;
            JsonNode direct = current.get(segment);
            if (direct != null) {
                current = direct;
            } else {
                current = findFieldCaseInsensitive(current, segment);
            }
            if (current == null) {
                failedSegment = segment;
                break;
            }
        }

        if (current != null && !current.isMissingNode() && !current.isNull()) {
            return current;
        }

        if (log.isDebugEnabled()) {
            log.debug("[DynamicPayloadEngine] Unresolved token '{}' (failed on '{}', available keys: {}, fallback default: '{}')",
                    path, failedSegment != null ? failedSegment : path, getFieldNames(lastNode), defaultValue);
        }

        // Fallback default value if available
        if (defaultValue != null) {
            return parsePrimitiveOrText(defaultValue);
        }

        return NullNode.getInstance();
    }

    private JsonNode evaluateFunction(String fnName) {
        switch (fnName.toLowerCase()) {
            case "now":
            case "currenttime":
                return new TextNode(Instant.now().toString());
            case "uuid":
                return new TextNode(UUID.randomUUID().toString());
            case "epochmillis":
                return new LongNode(System.currentTimeMillis());
            case "epochseconds":
                return new LongNode(Instant.now().getEpochSecond());
            default:
                log.warn("[DynamicPayloadEngine] Unknown built-in function '{}' requested in template", fnName);
                return new TextNode("UNKNOWN_FN:" + fnName);
        }
    }

    private JsonNode findFieldCaseInsensitive(JsonNode node, String fieldName) {
        if (!node.isObject()) return null;
        Iterator<String> fieldNames = node.fieldNames();
        while (fieldNames.hasNext()) {
            String f = fieldNames.next();
            if (f.equalsIgnoreCase(fieldName)) {
                return node.get(f);
            }
        }
        return null;
    }

    private JsonNode parsePrimitiveOrText(String raw) {
        if ("null".equalsIgnoreCase(raw)) return NullNode.getInstance();
        if ("true".equalsIgnoreCase(raw)) return BooleanNode.TRUE;
        if ("false".equalsIgnoreCase(raw)) return BooleanNode.FALSE;

        if (isPotentialNumber(raw)) {
            try {
                if (raw.contains(".")) {
                    return new DoubleNode(Double.parseDouble(raw));
                } else {
                    return new LongNode(Long.parseLong(raw));
                }
            } catch (NumberFormatException ignored) {
                // Not a number, return as text
            }
        }
        return new TextNode(raw);
    }

    private boolean isPotentialNumber(String s) {
        if (s == null || s.isEmpty()) return false;
        char first = s.charAt(0);
        return Character.isDigit(first) || first == '-' || first == '+';
    }

    private List<String> getFieldNames(JsonNode node) {
        if (node == null || !node.isObject()) return List.of();
        List<String> names = new ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    private String cleanQuotes(String s) {
        if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }
}
