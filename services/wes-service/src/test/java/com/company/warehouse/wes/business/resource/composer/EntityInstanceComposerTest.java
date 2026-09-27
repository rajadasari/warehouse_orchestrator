package com.company.warehouse.wes.business.resource.composer;

import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import com.company.warehouse.wes.business.resource.composer.archetype.RestSoftwareEntityArchetype;
import com.company.warehouse.wes.business.resource.composer.engine.EntityPropertyResolutionEngine;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.validation.EntityInstanceValidator;
import com.company.warehouse.wes.business.resource.composer.validation.EntityValidationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EntityInstanceComposerTest {

    private EntityPropertyResolutionEngine engine;
    private EntityInstanceValidator validator;
    private ComposedEntityTemplate restTemplate;

    @BeforeEach
    void setUp() {
        RestSoftwareEntityArchetype archetype = new RestSoftwareEntityArchetype();
        EntityArchetypeRegistry registry = new EntityArchetypeRegistry(List.of(archetype));
        engine = new EntityPropertyResolutionEngine(registry);
        validator = new EntityInstanceValidator();
        restTemplate = archetype.toTemplate();
    }

    @Test
    @DisplayName("Compose concrete REST API interface instance from template")
    void testComposeRestApiInstance() {
        EntityInstanceComposer composer = EntityInstanceComposer.fromTemplate(restTemplate)
                .resourceId("LOGIQS-AMBIENT-WMS")
                .name("Logiqs Ambient WMS")
                .application("LOGIQS_WMS")
                .endpoint("10.0.0.50", 8089, "http")
                .description("Third-Party Ambient Warehouse Management System")
                .setProperty("timeoutMs", 3500)
                .setProperty("authType", "OAUTH2_BEARER")
                .setProperty("clientId", "logiqs-client")
                .setCustomProperty("zoneCode", "AMBIENT-01")
                .bindService("HEALTH_CHECK", "/api/v1/ping", "GET")
                .bindService("AUTHENTICATE", "/api/v1/auth/token", "POST", Map.of("grant_type", "client_credentials"));

        EntityValidationResult validation = composer.validate(validator, engine);
        assertThat(validation.isValid()).isTrue();
        assertThat(validation.getErrors()).isEmpty();

        ComposedEntityInstance instance = composer.compose(engine);
        assertThat(instance.getResourceId()).isEqualTo("LOGIQS-AMBIENT-WMS");
        assertThat(instance.getHost()).isEqualTo("10.0.0.50");
        assertThat(instance.getPort()).isEqualTo(8089);
        assertThat(instance.getEffectiveProperties().get("timeoutMs")).isEqualTo(3500);
        assertThat(instance.getEffectiveProperties().get("zoneCode")).isEqualTo("AMBIENT-01");
        assertThat(instance.getMethodsConfig()).containsKey("HEALTH_CHECK");
        assertThat(instance.getMethodsConfig()).containsKey("AUTHENTICATE");

        ResourceRequestDto dto = composer.toRequestDto();
        assertThat(dto.getResourceId()).isEqualTo("LOGIQS-AMBIENT-WMS");
        assertThat(dto.getTemplateCode()).isEqualTo("REST_API_GENERIC");
        assertThat(dto.getHost()).isEqualTo("10.0.0.50");
        assertThat(dto.getPort()).isEqualTo(8089);
        assertThat(dto.getTemplateProperties()).containsEntry("timeoutMs", 3500);
        assertThat(dto.getCustomProperties()).containsEntry("zoneCode", "AMBIENT-01");
    }
}
