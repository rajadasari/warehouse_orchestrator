package com.company.warehouse.common.client.software.integration.parser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Universal Auto-Detecting Data Ingestion Parser.
 * Detects format (XML vs. JSON) automatically and delegates to the appropriate engine.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AutoDetectingDataParser implements UniversalDataParser {

    private final XmlDataEngine xmlDataEngine;
    private final JsonDataEngine jsonDataEngine;

    public enum DataFormat {
        XML,
        JSON,
        UNKNOWN
    }

    @Override
    public boolean supportsFormat(String format) {
        return true; // Supports all through auto-detection
    }

    public DataFormat detectFormat(String rawPayload) {
        if (rawPayload == null || rawPayload.trim().isEmpty()) {
            return DataFormat.UNKNOWN;
        }
        String trimmed = rawPayload.trim();
        if (trimmed.startsWith("<")) {
            return DataFormat.XML;
        }
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            return DataFormat.JSON;
        }
        return DataFormat.UNKNOWN;
    }

    @Override
    public Map<String, Object> parseToMap(String rawPayload) {
        DataFormat format = detectFormat(rawPayload);
        return switch (format) {
            case XML -> xmlDataEngine.parseToMap(rawPayload);
            case JSON -> jsonDataEngine.parseToMap(rawPayload);
            case UNKNOWN -> throw new IllegalArgumentException("Unrecognized payload format. Must be XML (<...) or JSON ({...)");
        };
    }

    @Override
    public Object extractValue(String rawPayload, String pathExpression) {
        DataFormat format = detectFormat(rawPayload);
        return switch (format) {
            case XML -> xmlDataEngine.extractValue(rawPayload, pathExpression);
            case JSON -> jsonDataEngine.extractValue(rawPayload, pathExpression);
            case UNKNOWN -> null;
        };
    }

    public XmlDataEngine getXmlEngine() {
        return xmlDataEngine;
    }

    public JsonDataEngine getJsonEngine() {
        return jsonDataEngine;
    }
}
