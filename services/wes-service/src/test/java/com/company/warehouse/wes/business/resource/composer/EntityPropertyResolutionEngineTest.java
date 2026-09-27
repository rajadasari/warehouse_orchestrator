package com.company.warehouse.wes.business.resource.composer;

import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import com.company.warehouse.wes.business.resource.composer.archetype.RestSoftwareEntityArchetype;
import com.company.warehouse.wes.business.resource.composer.engine.EntityPropertyResolutionEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EntityPropertyResolutionEngineTest {

    private EntityPropertyResolutionEngine engine;

    @BeforeEach
    void setUp() {
        RestSoftwareEntityArchetype restArchetype = new RestSoftwareEntityArchetype();
        EntityArchetypeRegistry registry = new EntityArchetypeRegistry(List.of(restArchetype));
        engine = new EntityPropertyResolutionEngine(registry);
    }

    @Test
    @DisplayName("5-Tier resolution applies proper inheritance and override precedence")
    void testPrecedenceResolution() {
        // Tier 1 Archetype provides: timeoutMs = 5000, host = 127.0.0.1, authType = NONE
        // Tier 2 DB Template overrides: timeoutMs = 7500, defaultPort = 8085
        Map<String, Object> dbDefaults = Map.of(
                "timeoutMs", 7500,
                "defaultPort", 8085
        );

        // Tier 3 Instance Template overrides: timeoutMs = 3000
        Map<String, Object> instanceTemplateProps = Map.of(
                "timeoutMs", 3000,
                "authType", "OAUTH2_BEARER"
        );

        // Tier 4 Custom Properties: customZone = "ZONE_A"
        Map<String, Object> customProps = Map.of(
                "customZone", "ZONE_A"
        );

        // Tier 5 Direct coordinates
        String host = "192.168.1.50";
        int port = 9090;
        String protocol = "https";

        Map<String, Object> effective = engine.resolve(
                "REST_API_GENERIC",
                dbDefaults,
                instanceTemplateProps,
                customProps,
                host,
                port,
                protocol,
                "WMS_SYSTEM",
                "WMS Endpoint",
                "/docs/wms"
        );

        // Verify tier overrides
        assertThat(effective.get("timeoutMs")).isEqualTo(3000); // instance override wins over db & archetype
        assertThat(effective.get("authType")).isEqualTo("OAUTH2_BEARER");
        assertThat(effective.get("customZone")).isEqualTo("ZONE_A");
        assertThat(effective.get("host")).isEqualTo("192.168.1.50"); // direct host wins
        assertThat(effective.get("port")).isEqualTo(9090); // direct port wins
        assertThat(effective.get("protocol")).isEqualTo("https");
        assertThat(effective.get("application")).isEqualTo("WMS_SYSTEM");
        assertThat(effective.get("defaultPort")).isEqualTo(8085); // inherited from DB template
    }

    @Test
    @DisplayName("Fall back to Archetype defaults when DB template is absent")
    void testFallbackToArchetypeDefaults() {
        Map<String, Object> effective = engine.resolve(
                "REST_API_GENERIC",
                null, // No DB row
                Map.of(),
                Map.of(),
                "10.0.0.1",
                8080,
                "http",
                "WMS",
                null,
                null
        );

        assertThat(effective.get("timeoutMs")).isEqualTo(5000); // from code archetype
        assertThat(effective.get("authType")).isEqualTo("NONE"); // from code archetype
        assertThat(effective.get("host")).isEqualTo("10.0.0.1");
    }
}
