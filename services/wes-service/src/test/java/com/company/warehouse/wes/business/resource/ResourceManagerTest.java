package com.company.warehouse.wes.business.resource;

import com.company.warehouse.wes.api.dto.resource.ResourceRelationshipDto;
import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.api.dto.resource.ResourceTemplateDto;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.entity.ResourceRelationshipEntity;
import com.company.warehouse.wes.data.entity.ResourceTemplateEntity;
import com.company.warehouse.wes.data.repository.ResourceRelationshipRepository;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.company.warehouse.wes.data.repository.ResourceTemplateRepository;
import com.company.warehouse.wes.business.resource.composer.EntityComposerMapper;
import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import com.company.warehouse.wes.business.resource.composer.archetype.OpcUaClientEntityArchetype;
import com.company.warehouse.wes.business.resource.composer.archetype.OpcUaServerEntityArchetype;
import com.company.warehouse.wes.business.resource.composer.archetype.RestSoftwareEntityArchetype;
import com.company.warehouse.wes.business.resource.composer.engine.EntityMethodResolutionEngine;
import com.company.warehouse.wes.business.resource.composer.engine.EntityPropertyResolutionEngine;
import com.company.warehouse.wes.business.resource.composer.validation.EntityTemplateValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceManagerTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private ResourceTemplateRepository templateRepository;

    @Mock
    private ResourceRelationshipRepository relationshipRepository;

    private ObjectMapper objectMapper;
    private ResourceManager resourceManager;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        RestSoftwareEntityArchetype restArchetype = new RestSoftwareEntityArchetype();
        OpcUaClientEntityArchetype opcUaClientArchetype = new OpcUaClientEntityArchetype();
        OpcUaServerEntityArchetype opcUaServerArchetype = new OpcUaServerEntityArchetype();
        EntityArchetypeRegistry archetypeRegistry = new EntityArchetypeRegistry(List.of(restArchetype, opcUaClientArchetype, opcUaServerArchetype));
        EntityPropertyResolutionEngine propertyResolutionEngine = new EntityPropertyResolutionEngine(archetypeRegistry);
        EntityTemplateValidator templateValidator = new EntityTemplateValidator();
        EntityComposerMapper composerMapper = new EntityComposerMapper(objectMapper);
        EntityMethodResolutionEngine methodResolutionEngine = new EntityMethodResolutionEngine(archetypeRegistry, templateRepository, objectMapper);
        resourceManager = new ResourceManager(
                resourceRepository,
                templateRepository,
                relationshipRepository,
                objectMapper,
                propertyResolutionEngine,
                methodResolutionEngine,
                archetypeRegistry,
                templateValidator,
                composerMapper,
                org.platform.resourcemanager.api.ResourceClient.createInMemory()
        );
    }

    @Test
    @DisplayName("Create Hardware Conveyor resource with template inheritance")
    void testCreateConveyorResourceWithTemplate() {
        ResourceTemplateEntity tpl = ResourceTemplateEntity.builder()
                .templateCode("CONVEYOR_SIEMENS_S7")
                .templateName("Standard Siemens Conveyor")
                .category("HARDWARE")
                .resourceType("CONVEYOR")
                .communicationProtocol("PLC_S7")
                .defaultProperties("{\"speedMps\":1.2,\"dbNumber\":10}")
                .build();

        when(templateRepository.findByTemplateCode("CONVEYOR_SIEMENS_S7")).thenReturn(Optional.of(tpl));
        when(resourceRepository.existsByResourceId("CONV-LINE-01")).thenReturn(false);

        ResourceRequestDto request = ResourceRequestDto.builder()
                .resourceId("CONV-LINE-01")
                .name("Main Infeed Conveyor")
                .type("CONVEYOR")
                .category("HARDWARE")
                .templateCode("CONVEYOR_SIEMENS_S7")
                .templateProperties(Map.of("dbNumber", 20, "plcIp", "192.168.1.101"))
                .customProperties(Map.of("zone", "ZONE_A"))
                .build();

        ResourceEntity savedEntity = ResourceEntity.builder()
                .id(UUID.randomUUID())
                .resourceId("CONV-LINE-01")
                .name("Main Infeed Conveyor")
                .type("CONVEYOR")
                .category("HARDWARE")
                .templateCode("CONVEYOR_SIEMENS_S7")
                .status("ACTIVE")
                .templateProperties("{\"dbNumber\":20,\"plcIp\":\"192.168.1.101\"}")
                .customProperties("{\"zone\":\"ZONE_A\"}")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(resourceRepository.save(any(ResourceEntity.class))).thenReturn(savedEntity);

        ResourceResponseDto response = resourceManager.createResource(request);

        assertThat(response.getResourceId()).isEqualTo("CONV-LINE-01");
        assertThat(response.getCategory()).isEqualTo("HARDWARE");
        assertThat(response.getTemplateCode()).isEqualTo("CONVEYOR_SIEMENS_S7");

        // Verify effective properties resolution: inherited speedMps (1.2) + overridden dbNumber (20) + custom zone
        assertThat(response.getEffectiveProperties()).containsEntry("speedMps", 1.2);
        assertThat(response.getEffectiveProperties()).containsEntry("dbNumber", 20);
        assertThat(response.getEffectiveProperties()).containsEntry("plcIp", "192.168.1.101");
        assertThat(response.getEffectiveProperties()).containsEntry("zone", "ZONE_A");
    }

    @Test
    @DisplayName("Create Material Flow relationship between Conveyor and Profile Check Station")
    void testCreateResourceRelationship() {
        when(resourceRepository.existsByResourceId("CONV-01")).thenReturn(true);
        when(resourceRepository.existsByResourceId("PROFILE-STN-01")).thenReturn(true);
        when(relationshipRepository.existsBySourceResourceIdAndTargetResourceIdAndRelationType("CONV-01", "PROFILE-STN-01", "TRANSFERS_TO"))
                .thenReturn(false);

        ResourceRelationshipEntity savedRel = ResourceRelationshipEntity.builder()
                .id(UUID.randomUUID())
                .sourceResourceId("CONV-01")
                .targetResourceId("PROFILE-STN-01")
                .relationCategory("MATERIAL_FLOW")
                .relationType("TRANSFERS_TO")
                .properties("{\"transitTimeSeconds\":15}")
                .active(true)
                .build();

        when(relationshipRepository.save(any(ResourceRelationshipEntity.class))).thenReturn(savedRel);

        ResourceRelationshipDto dto = ResourceRelationshipDto.builder()
                .sourceResourceId("CONV-01")
                .targetResourceId("PROFILE-STN-01")
                .relationCategory("MATERIAL_FLOW")
                .relationType("TRANSFERS_TO")
                .properties(Map.of("transitTimeSeconds", 15))
                .build();

        ResourceRelationshipDto result = resourceManager.createRelationship(dto);

        assertThat(result.getSourceResourceId()).isEqualTo("CONV-01");
        assertThat(result.getTargetResourceId()).isEqualTo("PROFILE-STN-01");
        assertThat(result.getRelationCategory()).isEqualTo("MATERIAL_FLOW");
        assertThat(result.getRelationType()).isEqualTo("TRANSFERS_TO");
    }

    @Test
    @DisplayName("Query downstream destinations for physical topology routing")
    void testGetDownstreamTargets() {
        ResourceRelationshipEntity rel = ResourceRelationshipEntity.builder()
                .sourceResourceId("CONV-01")
                .targetResourceId("PROFILE-STN-01")
                .relationCategory("MATERIAL_FLOW")
                .relationType("TRANSFERS_TO")
                .active(true)
                .build();

        when(relationshipRepository.findBySourceResourceIdAndRelationTypeAndActiveTrue("CONV-01", "TRANSFERS_TO"))
                .thenReturn(List.of(rel));

        List<String> targets = resourceManager.getDownstreamTargets("CONV-01");

        assertThat(targets).containsExactly("PROFILE-STN-01");
    }

    @Test
    @DisplayName("Create template with properties from UI payload")
    void testCreateTemplateWithProperties() {
        when(templateRepository.existsByTemplateCode("CUSTOM_TPL")).thenReturn(false);
        when(templateRepository.save(any(ResourceTemplateEntity.class))).thenAnswer(i -> {
            ResourceTemplateEntity entity = i.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        java.util.Map<String, Object> prop = new java.util.LinkedHashMap<>();
        prop.put("key", "maxSpeed");
        prop.put("label", "maxSpeed");
        prop.put("type", "DOUBLE");
        prop.put("required", false);
        prop.put("defaultValue", "");

        ResourceTemplateDto dto = ResourceTemplateDto.builder()
                .templateCode("CUSTOM_TPL")
                .templateName("Custom Template")
                .category("PHYSICAL")
                .resourceType("CONVEYOR")
                .communicationProtocol("OPC_UA")
                .propertySchema(List.of(prop))
                .defaultProperties(Map.of())
                .build();

        ResourceTemplateDto result = resourceManager.createTemplate(dto);
        assertThat(result).isNotNull();
        assertThat(result.getTemplateCode()).isEqualTo("CUSTOM_TPL");
    }

    @Test
    @DisplayName("Verify code-defined OPC_UA_CLIENT and OPC_UA_SERVER are returned as system templates")
    void testOpcUaSystemTemplatesOverlay() {
        when(templateRepository.findAll()).thenReturn(Collections.emptyList());

        List<ResourceTemplateDto> templates = resourceManager.getAllTemplates(null);

        assertThat(templates).isNotEmpty();
        assertThat(templates).extracting(ResourceTemplateDto::getTemplateCode)
                .contains("OPC_UA_CLIENT", "OPC_UA_SERVER");

        ResourceTemplateDto clientTpl = templates.stream()
                .filter(t -> "OPC_UA_CLIENT".equals(t.getTemplateCode()))
                .findFirst()
                .orElseThrow();
        assertThat(clientTpl.isSystemTemplate()).isTrue();
        assertThat(clientTpl.getCommunicationProtocol()).isEqualTo("OPC_UA");
        assertThat(clientTpl.getPropertySchema()).hasSize(14);
        assertThat(clientTpl.getMethodsSchema()).hasSize(7);
        assertThat(clientTpl.getDefaultProperties())
                .containsEntry("authType", "ANONYMOUS")
                .containsEntry("securityPolicy", "NONE");

        ResourceTemplateDto serverTpl = templates.stream()
                .filter(t -> "OPC_UA_SERVER".equals(t.getTemplateCode()))
                .findFirst()
                .orElseThrow();
        assertThat(serverTpl.isSystemTemplate()).isTrue();
        assertThat(serverTpl.getPropertySchema()).hasSize(8);
        assertThat(serverTpl.getMethodsSchema()).hasSize(5);
    }

    @Test
    @DisplayName("Verify deletion of platform standard template is forbidden")
    void testDeleteSystemTemplateForbidden() {
        assertThatThrownBy(() -> resourceManager.deleteTemplate("OPC_UA_CLIENT"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot delete standard platform template");
    }

    @Test
    @DisplayName("Verify resource creation using standard OPC_UA_CLIENT template succeeds without DB template record")
    void testCreateOpcUaClientResourceWithStandardTemplate() {
        when(resourceRepository.existsByResourceId("PLC-01")).thenReturn(false);

        ResourceRequestDto request = ResourceRequestDto.builder()
                .resourceId("PLC-01")
                .name("Line 1 Main PLC")
                .type("PLC")
                .category("PHYSICAL")
                .templateCode("OPC_UA_CLIENT")
                .templateProperties(Map.of("endpointUrl", "opc.tcp://192.168.1.100:4840", "authType", "ANONYMOUS"))
                .build();

        ResourceEntity savedEntity = ResourceEntity.builder()
                .id(UUID.randomUUID())
                .resourceId("PLC-01")
                .name("Line 1 Main PLC")
                .type("PLC")
                .category("PHYSICAL")
                .templateCode("OPC_UA_CLIENT")
                .status("ACTIVE")
                .templateProperties("{\"endpointUrl\":\"opc.tcp://192.168.1.100:4840\",\"authType\":\"ANONYMOUS\"}")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(resourceRepository.save(any(ResourceEntity.class))).thenReturn(savedEntity);

        ResourceResponseDto response = resourceManager.createResource(request);

        assertThat(response).isNotNull();
        assertThat(response.getResourceId()).isEqualTo("PLC-01");
        assertThat(response.getTemplateCode()).isEqualTo("OPC_UA_CLIENT");
        assertThat(response.getEffectiveProperties()).containsEntry("endpointUrl", "opc.tcp://192.168.1.100:4840");
        assertThat(response.getEffectiveMethods()).asList().isNotEmpty();
    }
}
