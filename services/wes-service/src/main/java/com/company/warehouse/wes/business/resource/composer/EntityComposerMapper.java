package com.company.warehouse.wes.business.resource.composer;

import com.company.warehouse.wes.api.dto.resource.ResourceTemplateDto;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.EntityBasicInfo;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceSafetyTier;
import com.company.warehouse.wes.business.resource.composer.model.ServiceType;
import com.company.warehouse.wes.data.entity.ResourceTemplateEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Maps between Entity Composer domain models, JPA Entities, and API DTOs.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntityComposerMapper {

    private final ObjectMapper objectMapper;

    /**
     * Converts a ComposedEntityTemplate into a ResourceTemplateDto.
     */
    public ResourceTemplateDto toDto(ComposedEntityTemplate template) {
        if (template == null) return null;
        EntityBasicInfo info = template.getBasicInfo() != null ? template.getBasicInfo() : new EntityBasicInfo();

        List<Map<String, Object>> propSchemaList = new ArrayList<>();
        for (PropertyDefinition p : template.getPropertyDefinitions()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("key", p.getName());
            map.put("label", p.getLabel() != null ? p.getLabel() : p.getName());
            map.put("type", p.getBaseType() != null ? p.getBaseType().name() : "STRING");
            map.put("required", p.isRequired());
            if (p.getDefaultValue() != null) map.put("defaultValue", p.getDefaultValue());
            if (p.getUnit() != null) map.put("unit", p.getUnit());
            if (p.getOptions() != null && !p.getOptions().isEmpty()) map.put("options", p.getOptions());
            if (p.getDescription() != null) map.put("description", p.getDescription());
            propSchemaList.add(map);
        }

        List<Map<String, Object>> methodSchemaList = new ArrayList<>();
        for (ServiceDefinition s : template.getServiceDefinitions()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("name", s.getName());
            map.put("type", s.getType() != null ? s.getType().name() : "EXECUTION");
            map.put("safetyTier", s.getSafetyTier() != null ? s.getSafetyTier().name() : "OPERATIONAL");
            if (s.getDescription() != null) map.put("description", s.getDescription());
            if (s.getSupportedStrategies() != null) map.put("supportedStrategies", s.getSupportedStrategies());
            if (s.getPathTemplate() != null) map.put("pathTemplate", s.getPathTemplate());
            if (s.getHttpMethod() != null) map.put("httpMethod", s.getHttpMethod());
            if (s.getParametersSchema() != null && !s.getParametersSchema().isEmpty()) map.put("parametersSchema", s.getParametersSchema());
            if (s.getSamplePayload() != null && !s.getSamplePayload().isEmpty()) map.put("samplePayload", s.getSamplePayload());
            methodSchemaList.add(map);
        }

        return ResourceTemplateDto.builder()
                .templateCode(info.getTemplateCode())
                .templateName(info.getTemplateName())
                .category(info.getCategory())
                .resourceType(info.getResourceType())
                .communicationProtocol(info.getCommunicationProtocol())
                .description(info.getDescription())
                .application(info.getApplication())
                .defaultProtocol(info.getDefaultProtocol())
                .defaultHost(info.getDefaultHost())
                .defaultPort(info.getDefaultPort())
                .documentationUrl(info.getDocumentationUrl())
                .propertySchema(propSchemaList)
                .defaultProperties(new LinkedHashMap<>(template.getDefaultProperties()))
                .supportedCommands(new ArrayList<>(template.getSupportedCommands()))
                .methodsSchema(methodSchemaList)
                .active(info.isActive())
                .build();
    }

    /**
     * Converts a ResourceTemplateDto into a ComposedEntityTemplate.
     */
    @SuppressWarnings("unchecked")
    public ComposedEntityTemplate toComposedTemplate(ResourceTemplateDto dto) {
        if (dto == null) return null;

        EntityBasicInfo info = EntityBasicInfo.builder()
                .templateCode(dto.getTemplateCode() != null ? dto.getTemplateCode().trim().toUpperCase() : null)
                .templateName(dto.getTemplateName())
                .category(dto.getCategory() != null ? dto.getCategory().trim().toUpperCase() : "SOFTWARE")
                .resourceType(dto.getResourceType() != null ? dto.getResourceType().trim().toUpperCase() : "REST_GENERIC")
                .communicationProtocol(dto.getCommunicationMethod() != null && !dto.getCommunicationMethod().trim().isEmpty()
                        ? dto.getCommunicationMethod().trim().toUpperCase()
                        : (dto.getCommunicationProtocol() != null ? dto.getCommunicationProtocol().trim().toUpperCase() : "REST"))
                .description(dto.getDescription())
                .application(dto.getApplication() != null ? dto.getApplication() : "GENERIC_REST_APP")
                .defaultProtocol(dto.getDefaultProtocol() != null ? dto.getDefaultProtocol() : "http")
                .defaultHost(dto.getDefaultHost() != null ? dto.getDefaultHost() : "127.0.0.1")
                .defaultPort(dto.getDefaultPort() != null && dto.getDefaultPort() > 0 ? dto.getDefaultPort() : 8080)
                .documentationUrl(dto.getDocumentationUrl())
                .active(dto.isActive())
                .build();

        List<PropertyDefinition> properties = new ArrayList<>();
        if (dto.getPropertySchema() != null) {
            for (Map<String, Object> map : dto.getPropertySchema()) {
                String key = String.valueOf(map.getOrDefault("key", map.get("name")));
                if (key == null || key.trim().isEmpty() || key.equals("null")) continue;

                String label = map.containsKey("label") ? String.valueOf(map.get("label")) : key;
                PropertyBaseType type = PropertyBaseType.fromString(String.valueOf(map.get("type")));
                boolean req = Boolean.parseBoolean(String.valueOf(map.getOrDefault("required", false)));
                Object defVal = map.get("defaultValue");
                String unit = map.containsKey("unit") ? String.valueOf(map.get("unit")) : null;
                String desc = map.containsKey("description") ? String.valueOf(map.get("description")) : null;
                List<String> options = map.containsKey("options") && map.get("options") instanceof List
                        ? (List<String>) map.get("options") : Collections.emptyList();

                properties.add(PropertyDefinition.builder()
                        .name(key)
                        .label(label)
                        .baseType(type)
                        .required(req)
                        .defaultValue(defVal)
                        .unit(unit)
                        .options(options)
                        .description(desc)
                        .build());
            }
        }

        List<ServiceDefinition> services = new ArrayList<>();
        if (dto.getMethodsSchema() != null) {
            for (Map<String, Object> map : dto.getMethodsSchema()) {
                String name = String.valueOf(map.get("name"));
                if (name == null || name.trim().isEmpty() || name.equals("null")) continue;

                ServiceType type = ServiceType.fromString(String.valueOf(map.get("type")));
                ServiceSafetyTier tier = ServiceSafetyTier.fromString(String.valueOf(map.get("safetyTier")));
                String desc = map.containsKey("description") ? String.valueOf(map.get("description")) : null;
                String path = map.containsKey("pathTemplate") ? String.valueOf(map.get("pathTemplate"))
                        : map.containsKey("path") ? String.valueOf(map.get("path")) : null;
                String method = map.containsKey("httpMethod") ? String.valueOf(map.get("httpMethod")) : "POST";
                List<String> strats = map.containsKey("supportedStrategies") && map.get("supportedStrategies") instanceof List
                        ? (List<String>) map.get("supportedStrategies") : Collections.emptyList();

                services.add(ServiceDefinition.builder()
                        .name(name)
                        .type(type)
                        .safetyTier(tier)
                        .description(desc)
                        .pathTemplate(path)
                        .httpMethod(method)
                        .supportedStrategies(strats)
                        .build());
            }
        }

        return ComposedEntityTemplate.builder()
                .basicInfo(info)
                .propertyDefinitions(properties)
                .defaultProperties(dto.getDefaultProperties() != null ? new LinkedHashMap<>(dto.getDefaultProperties()) : new LinkedHashMap<>())
                .serviceDefinitions(services)
                .supportedCommands(dto.getSupportedCommands() != null ? new ArrayList<>(dto.getSupportedCommands()) : new ArrayList<>())
                .build();
    }

    /**
     * Converts a JPA ResourceTemplateEntity into a ComposedEntityTemplate.
     */
    public ComposedEntityTemplate toComposedTemplate(ResourceTemplateEntity entity) {
        if (entity == null) return null;

        EntityBasicInfo info = EntityBasicInfo.builder()
                .templateCode(entity.getTemplateCode())
                .templateName(entity.getTemplateName())
                .category(entity.getCategory())
                .resourceType(entity.getResourceType())
                .communicationProtocol(entity.getCommunicationProtocol())
                .description(entity.getDescription())
                .application(entity.getApplication())
                .defaultProtocol(entity.getDefaultProtocol())
                .defaultHost(entity.getDefaultHost())
                .defaultPort(entity.getDefaultPort())
                .documentationUrl(entity.getDocumentationUrl())
                .active(entity.isActive())
                .build();

        List<Map<String, Object>> propSchemaMaps = deserializeList(entity.getPropertySchema());
        List<PropertyDefinition> properties = new ArrayList<>();
        for (Map<String, Object> map : propSchemaMaps) {
            String key = String.valueOf(map.getOrDefault("key", map.get("name")));
            if (key == null || key.trim().isEmpty() || key.equals("null")) continue;
            properties.add(PropertyDefinition.builder()
                    .name(key)
                    .label(map.containsKey("label") ? String.valueOf(map.get("label")) : key)
                    .baseType(PropertyBaseType.fromString(String.valueOf(map.get("type"))))
                    .required(Boolean.parseBoolean(String.valueOf(map.getOrDefault("required", false))))
                    .defaultValue(map.get("defaultValue"))
                    .unit(map.containsKey("unit") ? String.valueOf(map.get("unit")) : null)
                    .description(map.containsKey("description") ? String.valueOf(map.get("description")) : null)
                    .build());
        }

        List<Map<String, Object>> methodSchemaMaps = deserializeList(entity.getMethodsSchema());
        List<ServiceDefinition> services = new ArrayList<>();
        for (Map<String, Object> map : methodSchemaMaps) {
            String name = String.valueOf(map.get("name"));
            if (name == null || name.trim().isEmpty() || name.equals("null")) continue;
            services.add(ServiceDefinition.builder()
                    .name(name)
                    .type(ServiceType.fromString(String.valueOf(map.get("type"))))
                    .safetyTier(ServiceSafetyTier.fromString(String.valueOf(map.get("safetyTier"))))
                    .description(map.containsKey("description") ? String.valueOf(map.get("description")) : null)
                    .pathTemplate(map.containsKey("pathTemplate") ? String.valueOf(map.get("pathTemplate")) : null)
                    .httpMethod(map.containsKey("httpMethod") ? String.valueOf(map.get("httpMethod")) : "POST")
                    .build());
        }

        return ComposedEntityTemplate.builder()
                .basicInfo(info)
                .propertyDefinitions(properties)
                .defaultProperties(deserializeProperties(entity.getDefaultProperties()))
                .serviceDefinitions(services)
                .supportedCommands(deserializeStringList(entity.getSupportedCommands()))
                .build();
    }

    public ResourceTemplateEntity toEntity(ComposedEntityTemplate template) {
        if (template == null) return null;
        ResourceTemplateDto dto = toDto(template);
        EntityBasicInfo info = template.getBasicInfo();

        return ResourceTemplateEntity.builder()
                .templateCode(info.getTemplateCode())
                .templateName(info.getTemplateName())
                .category(info.getCategory())
                .resourceType(info.getResourceType())
                .communicationProtocol(info.getCommunicationProtocol())
                .description(info.getDescription())
                .documentationUrl(info.getDocumentationUrl())
                .propertySchema(serialize(dto.getPropertySchema()))
                .defaultProperties(serialize(dto.getDefaultProperties()))
                .supportedCommands(serialize(dto.getSupportedCommands()))
                .methodsSchema(serialize(dto.getMethodsSchema()))
                .active(info.isActive())
                .build();
    }

    private String serialize(Object obj) {
        if (obj == null) return "[]";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to serialize", e);
            return "[]";
        }
    }

    private Map<String, Object> deserializeProperties(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private List<Map<String, Object>> deserializeList(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<String> deserializeStringList(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
