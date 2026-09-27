package com.company.warehouse.wes.business.resource.composer;

import com.company.warehouse.wes.business.resource.composer.archetype.RestSoftwareEntityArchetype;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceSafetyTier;
import com.company.warehouse.wes.business.resource.composer.model.ServiceType;
import com.company.warehouse.wes.business.resource.composer.validation.EntityTemplateValidator;
import com.company.warehouse.wes.business.resource.composer.validation.EntityValidationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EntityTemplateComposerTest {

    private EntityTemplateValidator validator;

    @BeforeEach
    void setUp() {
        validator = new EntityTemplateValidator();
    }

    @Test
    @DisplayName("Compose template from scratch with basic info, properties, services, and custom extensions")
    void testComposeTemplateFromScratch() {
        EntityTemplateComposer composer = EntityTemplateComposer.create()
                .basicInfo("WMS_ERP_INTERFACE", "WMS to ERP Connector", "SOFTWARE", "REST_GENERIC", "REST")
                .defaultCoordinates("erp.warehouse.internal", 8443, "https", "SAP_ERP")
                .addProperty(PropertyDefinition.builder()
                        .name("apiKey")
                        .label("API Secret Key")
                        .baseType(PropertyBaseType.SECRET)
                        .required(true)
                        .description("Authentication key for ERP gateway")
                        .build())
                .addProperty("retryCount", "Max Retries", PropertyBaseType.NUMBER, false, 3)
                .addService("SYNC_ORDERS", ServiceType.EXECUTION, ServiceSafetyTier.OPERATIONAL, "/api/v1/orders/sync", "POST")
                .addCustomProperty("erpPlantCode", PropertyBaseType.STRING, "PLANT_01", "SAP Plant Identifier")
                .addCustomService("QUERY_STOCK", "/api/v1/stock/query", "GET", "Queries live plant inventory")
                .addSupportedCommand("SYNC");

        EntityValidationResult validation = composer.validate(validator);
        assertThat(validation.isValid()).isTrue();
        assertThat(validation.getErrors()).isEmpty();

        ComposedEntityTemplate template = composer.build();
        assertThat(template.getBasicInfo().getTemplateCode()).isEqualTo("WMS_ERP_INTERFACE");
        assertThat(template.getBasicInfo().getDefaultPort()).isEqualTo(8443);
        assertThat(template.getBasicInfo().getDefaultProtocol()).isEqualTo("https");
        assertThat(template.getPropertyDefinitions()).hasSize(3); // apiKey, retryCount, erpPlantCode
        assertThat(template.getDefaultProperties()).containsEntry("retryCount", 3);
        assertThat(template.getDefaultProperties()).containsEntry("erpPlantCode", "PLANT_01");
        assertThat(template.getServiceDefinitions()).hasSize(2); // SYNC_ORDERS, QUERY_STOCK
        assertThat(template.getSupportedCommands()).contains("SYNC");
    }

    @Test
    @DisplayName("Compose template from built-in REST software archetype")
    void testComposeFromArchetype() {
        RestSoftwareEntityArchetype archetype = new RestSoftwareEntityArchetype();
        EntityTemplateComposer composer = EntityTemplateComposer.fromArchetype(archetype);

        EntityValidationResult validation = composer.validate(validator);
        assertThat(validation.isValid()).isTrue();

        ComposedEntityTemplate template = composer.build();
        assertThat(template.getBasicInfo().getTemplateCode()).isEqualTo("REST_API_GENERIC");
        assertThat(template.getBasicInfo().getCategory()).isEqualTo("SOFTWARE");
        assertThat(template.getPropertyDefinitions()).extracting(PropertyDefinition::getName)
                .contains("host", "port", "protocol", "timeoutMs", "authType");
        assertThat(template.getServiceDefinitions()).extracting("name")
                .contains("AUTHENTICATE", "HEALTH_CHECK", "DISPATCH_API", "QUERY_DATA");
    }

    @Test
    @DisplayName("Validation fails when duplicate property keys or invalid types are introduced")
    void testValidationFailure() {
        EntityTemplateComposer composer = EntityTemplateComposer.create()
                .basicInfo("", "", "SOFTWARE", "REST", "REST") // missing code and name
                .addProperty("timeoutMs", "Timeout", PropertyBaseType.NUMBER, false, "NOT_A_NUMBER"); // type mismatch

        EntityValidationResult result = composer.validate(validator);
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrors()).anyMatch(err -> err.contains("Template code is required"));
        assertThat(result.getErrors()).anyMatch(err -> err.contains("Template name is required"));
        assertThat(result.getErrors()).anyMatch(err -> err.contains("not a valid number"));
    }
}
