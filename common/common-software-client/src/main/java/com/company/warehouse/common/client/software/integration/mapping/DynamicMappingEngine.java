package com.company.warehouse.common.client.software.integration.mapping;

import com.company.warehouse.common.client.software.integration.parser.AutoDetectingDataParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Universal Mapping Engine.
 * Transforms external documents (XML or JSON) into canonical internal Map models
 * using configurable FieldMappingRule definitions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DynamicMappingEngine {

    private final AutoDetectingDataParser dataParser;

    public Map<String, Object> mapToCanonical(String rawPayload, List<FieldMappingRule> rules) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        if (rawPayload == null || rules == null || rules.isEmpty()) {
            return canonical;
        }

        for (FieldMappingRule rule : rules) {
            String targetKey = rule.getTargetField();
            if (targetKey == null || targetKey.isBlank()) continue;

            Object rawValue = resolveValueFromFallbacks(rawPayload, rule.getSourcePath());

            if (rawValue == null) {
                rawValue = rule.getDefaultValue();
            }

            if (rule.isRequired() && (rawValue == null || String.valueOf(rawValue).isBlank())) {
                throw new IllegalArgumentException("Required field mapping failed: '" + targetKey +
                        "' using path '" + rule.getSourcePath() + "'");
            }

            Object convertedValue = convertType(rawValue, rule.getDataType());
            canonical.put(targetKey.trim(), convertedValue);
        }

        return canonical;
    }

    private Object resolveValueFromFallbacks(String rawPayload, String sourcePath) {
        if (sourcePath == null || sourcePath.isBlank()) return null;

        String[] paths = sourcePath.split("\\|");
        for (String path : paths) {
            String candidatePath = path.trim();
            if (candidatePath.isEmpty()) continue;

            Object val = dataParser.extractValue(rawPayload, candidatePath);
            if (val != null && !String.valueOf(val).isBlank()) {
                return val;
            }
        }
        return null;
    }

    private Object convertType(Object val, String targetType) {
        if (val == null) return null;
        String type = targetType != null ? targetType.trim().toUpperCase() : "STRING";
        String strVal = String.valueOf(val).trim();

        try {
            return switch (type) {
                case "NUMBER", "DECIMAL", "DOUBLE" -> new BigDecimal(strVal).doubleValue();
                case "INTEGER", "INT" -> (int) Math.round(Double.parseDouble(strVal));
                case "LONG" -> Math.round(Double.parseDouble(strVal));
                case "BOOLEAN", "BOOL" -> "true".equalsIgnoreCase(strVal) || "1".equals(strVal) || "yes".equalsIgnoreCase(strVal);
                case "STRING" -> strVal;
                default -> val;
            };
        } catch (Exception e) {
            log.warn("Type conversion failed for value '{}' to type '{}': {}", strVal, type, e.getMessage());
            return strVal;
        }
    }
}
