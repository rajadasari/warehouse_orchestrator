package com.company.warehouse.common.client.software.dynamic;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DynamicPayloadEngineTest {

    private DynamicPayloadEngine engine;

    @BeforeEach
    void setUp() {
        engine = new DynamicPayloadEngine(new ObjectMapper());
    }

    @Test
    @DisplayName("resolveUrl replaces single-brace OpenAPI path variables")
    void resolveUrlWithSingleBracePathVariable() {
        String template = "/api/v1/devices/{deviceId}/telemetry";
        Map<String, Object> context = Map.of("deviceId", "DEV-99");

        String result = engine.resolveUrl(template, context);

        assertEquals("/api/v1/devices/DEV-99/telemetry", result);
    }

    @Test
    @DisplayName("resolveUrl replaces nested Handlebars expressions")
    void resolveUrlWithNestedHandlebars() {
        String template = "/api/orders/{{order.id}}/items";
        Map<String, Object> context = Map.of("order", Map.of("id", "ORD-42"));

        String result = engine.resolveUrl(template, context);

        assertEquals("/api/orders/ORD-42/items", result);
    }

    @Test
    @DisplayName("resolveUrl encodes special characters and spaces safely")
    void resolveUrlEncodesSpecialCharacters() {
        String template = "/api/pallets/{palletId}/status";
        Map<String, Object> context = Map.of("palletId", "PAL 100/A");

        String result = engine.resolveUrl(template, context);

        assertEquals("/api/pallets/PAL%20100%2FA/status", result);
    }

    @Test
    @DisplayName("resolveUrl replaces query parameters with fallback default")
    void resolveUrlWithQueryParametersAndDefault() {
        String template = "/api/search?q={query}&limit={{limit|20}}";
        Map<String, Object> context = Map.of("query", "red box");

        String result = engine.resolveUrl(template, context);

        assertEquals("/api/search?q=red%20box&limit=20", result);
    }

    @Test
    @DisplayName("resolveUrl finds generic alias inside nested object")
    void resolveUrlWithNestedAlias() {
        String template = "/api/inventory/{palletId}";
        Map<String, Object> context = Map.of("pallet", Map.of("id", "PLT-777"));

        String result = engine.resolveUrl(template, context);

        assertEquals("/api/inventory/PLT-777", result);
    }
}
