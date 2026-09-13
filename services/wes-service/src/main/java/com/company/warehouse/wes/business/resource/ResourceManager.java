package com.company.warehouse.wes.business.resource;

import com.company.warehouse.common.client.software.model.ResourceConfigProvider;
import com.company.warehouse.common.client.software.model.ResourceConnectionConfig;
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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceManager implements ResourceConfigProvider {

    private final ResourceRepository resourceRepository;
    private final ResourceTemplateRepository templateRepository;
    private final ResourceRelationshipRepository relationshipRepository;
    private final ObjectMapper objectMapper;

    // =========================================================================
    // 1. RESOURCE LIFECYCLE & INHERITANCE
    // =========================================================================

    @Transactional
    public ResourceResponseDto createResource(ResourceRequestDto request) {
        String resId = request.getResourceId().trim();

        if (resourceRepository.existsByResourceId(resId)) {
            throw new IllegalArgumentException("Resource with ID '" + resId + "' already exists");
        }

        String templateCode = request.getTemplateCode() != null && !request.getTemplateCode().trim().isEmpty()
                ? request.getTemplateCode().trim()
                : null;

        String category = request.getCategory() != null && !request.getCategory().trim().isEmpty()
                ? request.getCategory().trim().toUpperCase()
                : "SOFTWARE";

        if (templateCode != null) {
            ResourceTemplateEntity tpl = templateRepository.findByTemplateCode(templateCode)
                    .orElseThrow(() -> new IllegalArgumentException("Resource template '" + templateCode + "' not found"));
            if (request.getCategory() == null || request.getCategory().trim().isEmpty()) {
                category = tpl.getCategory();
            }
        }

        Map<String, Object> customProps = request.getResolvedCustomProperties();
        Map<String, Object> tplProps = request.getTemplateProperties() != null ? request.getTemplateProperties() : Collections.emptyMap();

        ResourceEntity entity = ResourceEntity.builder()
                .resourceId(resId)
                .name(request.getName().trim())
                .type(request.getType().trim().toUpperCase())
                .category(category)
                .templateCode(templateCode)
                .status(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .templateProperties(serializeProperties(tplProps))
                .customProperties(serializeProperties(customProps))
                .build();

        ResourceEntity saved = resourceRepository.save(entity);
        log.info("Created resource '{}' (Category: {}, Type: {}, Template: {})",
                saved.getResourceId(), saved.getCategory(), saved.getType(), saved.getTemplateCode());

        return toDto(saved);
    }

    @Transactional
    public ResourceResponseDto updateResource(String resourceId, ResourceRequestDto request) {
        ResourceEntity entity = resourceRepository.findByResourceId(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            entity.setName(request.getName().trim());
        }
        if (request.getType() != null && !request.getType().trim().isEmpty()) {
            entity.setType(request.getType().trim().toUpperCase());
        }
        if (request.getCategory() != null && !request.getCategory().trim().isEmpty()) {
            entity.setCategory(request.getCategory().trim().toUpperCase());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            entity.setStatus(request.getStatus().trim().toUpperCase());
        }
        if (request.getTemplateCode() != null) {
            String tCode = request.getTemplateCode().trim();
            if (!tCode.isEmpty() && !templateRepository.existsByTemplateCode(tCode)) {
                throw new IllegalArgumentException("Resource template '" + tCode + "' not found");
            }
            entity.setTemplateCode(tCode.isEmpty() ? null : tCode);
        }

        if (request.getTemplateProperties() != null) {
            Map<String, Object> currentTplProps = deserializeProperties(entity.getTemplateProperties());
            currentTplProps.putAll(request.getTemplateProperties());
            entity.setTemplateProperties(serializeProperties(currentTplProps));
        }

        Map<String, Object> resolvedCustom = request.getResolvedCustomProperties();
        if (!resolvedCustom.isEmpty()) {
            Map<String, Object> currentCustom = deserializeProperties(entity.getCustomProperties());
            currentCustom.putAll(resolvedCustom);
            entity.setCustomProperties(serializeProperties(currentCustom));
        }

        ResourceEntity updated = resourceRepository.save(entity);
        log.info("Updated resource '{}'", updated.getResourceId());

        return toDto(updated);
    }

    @Transactional(readOnly = true)
    public ResourceResponseDto getResourceById(String resourceId) {
        return resourceRepository.findByResourceId(resourceId)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));
    }

    @Transactional(readOnly = true)
    public Optional<String> getResourceIp(String resourceId) {
        return resourceRepository.findByResourceId(resourceId)
                .map(entity -> {
                    Map<String, Object> props = resolveEffectiveProperties(entity);
                    if (props.containsKey("ip")) return String.valueOf(props.get("ip"));
                    if (props.containsKey("ipAddress")) return String.valueOf(props.get("ipAddress"));
                    if (props.containsKey("host")) return String.valueOf(props.get("host"));
                    if (props.containsKey("plcIp")) return String.valueOf(props.get("plcIp"));
                    return null;
                });
    }

    /**
     * Resolves connection config by merging template defaults with resource overrides.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<ResourceConnectionConfig> getResourceConfig(String resourceId) {
        return resourceRepository.findByResourceId(resourceId)
                .map(entity -> {
                    Map<String, Object> effective = resolveEffectiveProperties(entity);

                    String ip = null;
                    if (effective.containsKey("ip")) ip = String.valueOf(effective.get("ip"));
                    else if (effective.containsKey("ipAddress")) ip = String.valueOf(effective.get("ipAddress"));
                    else if (effective.containsKey("host")) ip = String.valueOf(effective.get("host"));
                    else if (effective.containsKey("plcIp")) ip = String.valueOf(effective.get("plcIp"));

                    Integer port = null;
                    if (effective.containsKey("port") && effective.get("port") != null) {
                        try {
                            port = Integer.parseInt(String.valueOf(effective.get("port")).trim());
                        } catch (Exception ignored) {}
                    }

                    String protocol = effective.containsKey("protocol") ? String.valueOf(effective.get("protocol")) : "http";
                    String basePath = effective.containsKey("basePath") ? String.valueOf(effective.get("basePath")) : null;
                    String clientId = effective.containsKey("clientId") ? String.valueOf(effective.get("clientId")) : null;
                    String clientSecret = effective.containsKey("clientSecret") ? String.valueOf(effective.get("clientSecret")) : null;

                    return ResourceConnectionConfig.builder()
                            .resourceId(entity.getResourceId())
                            .name(entity.getName())
                            .type(entity.getType())
                            .status(entity.getStatus())
                            .protocol(protocol)
                            .ip(ip)
                            .port(port)
                            .basePath(basePath)
                            .clientId(clientId)
                            .clientSecret(clientSecret)
                            .customProperties(effective)
                            .build();
                });
    }

    @Transactional(readOnly = true)
    public List<ResourceResponseDto> getAllResources(String type, String category, String status) {
        List<ResourceEntity> entities = resourceRepository.findAll();

        return entities.stream()
                .filter(e -> type == null || type.trim().isEmpty() || e.getType().equalsIgnoreCase(type.trim()))
                .filter(e -> category == null || category.trim().isEmpty() || (e.getCategory() != null && e.getCategory().equalsIgnoreCase(category.trim())))
                .filter(e -> status == null || status.trim().isEmpty() || e.getStatus().equalsIgnoreCase(status.trim()))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void deleteResource(String resourceId) {
        ResourceEntity entity = resourceRepository.findByResourceId(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));
        relationshipRepository.deleteBySourceResourceIdOrTargetResourceId(resourceId, resourceId);
        resourceRepository.delete(entity);
        log.info("Deleted resource '{}' and all associated relationships", resourceId);
    }

    /**
     * Resolves effective properties: Template Defaults + Resource Overrides + Custom Properties
     */
    @Transactional(readOnly = true)
    public Map<String, Object> resolveEffectiveProperties(ResourceEntity resource) {
        Map<String, Object> effective = new HashMap<>();

        if (resource.getTemplateCode() != null && !resource.getTemplateCode().trim().isEmpty()) {
            templateRepository.findByTemplateCode(resource.getTemplateCode().trim())
                    .ifPresent(tpl -> {
                        Map<String, Object> defaultProps = deserializeProperties(tpl.getDefaultProperties());
                        effective.putAll(defaultProps);
                    });
        }

        Map<String, Object> tplOverrides = deserializeProperties(resource.getTemplateProperties());
        effective.putAll(tplOverrides);

        Map<String, Object> customProps = deserializeProperties(resource.getCustomProperties());
        effective.putAll(customProps);

        return effective;
    }

    // =========================================================================
    // 2. RESOURCE TEMPLATE MANAGEMENT
    // =========================================================================

    @Transactional
    public ResourceTemplateDto createTemplate(ResourceTemplateDto dto) {
        String code = dto.getTemplateCode().trim().toUpperCase();
        if (templateRepository.existsByTemplateCode(code)) {
            throw new IllegalArgumentException("Template with code '" + code + "' already exists");
        }

        ResourceTemplateEntity entity = ResourceTemplateEntity.builder()
                .templateCode(code)
                .templateName(dto.getTemplateName().trim())
                .category(dto.getCategory().trim().toUpperCase())
                .resourceType(dto.getResourceType().trim().toUpperCase())
                .communicationProtocol(dto.getCommunicationProtocol().trim().toUpperCase())
                .propertySchema(serializeList(dto.getPropertySchema()))
                .defaultProperties(serializeProperties(dto.getDefaultProperties()))
                .supportedCommands(serializeList(dto.getSupportedCommands()))
                .active(dto.isActive())
                .build();

        ResourceTemplateEntity saved = templateRepository.save(entity);
        log.info("Created resource template '{}'", saved.getTemplateCode());
        return toTemplateDto(saved);
    }

    @Transactional
    public ResourceTemplateDto updateTemplate(String templateCode, ResourceTemplateDto dto) {
        ResourceTemplateEntity entity = templateRepository.findByTemplateCode(templateCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));

        if (dto.getTemplateName() != null && !dto.getTemplateName().trim().isEmpty()) {
            entity.setTemplateName(dto.getTemplateName().trim());
        }
        if (dto.getCategory() != null && !dto.getCategory().trim().isEmpty()) {
            entity.setCategory(dto.getCategory().trim().toUpperCase());
        }
        if (dto.getResourceType() != null && !dto.getResourceType().trim().isEmpty()) {
            entity.setResourceType(dto.getResourceType().trim().toUpperCase());
        }
        if (dto.getCommunicationProtocol() != null && !dto.getCommunicationProtocol().trim().isEmpty()) {
            entity.setCommunicationProtocol(dto.getCommunicationProtocol().trim().toUpperCase());
        }
        if (dto.getPropertySchema() != null) {
            entity.setPropertySchema(serializeList(dto.getPropertySchema()));
        }
        if (dto.getDefaultProperties() != null) {
            entity.setDefaultProperties(serializeProperties(dto.getDefaultProperties()));
        }
        if (dto.getSupportedCommands() != null) {
            entity.setSupportedCommands(serializeList(dto.getSupportedCommands()));
        }
        entity.setActive(dto.isActive());

        ResourceTemplateEntity updated = templateRepository.save(entity);
        log.info("Updated resource template '{}'", updated.getTemplateCode());
        return toTemplateDto(updated);
    }

    @Transactional(readOnly = true)
    public ResourceTemplateDto getTemplateByCode(String templateCode) {
        return templateRepository.findByTemplateCode(templateCode.trim().toUpperCase())
                .map(this::toTemplateDto)
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));
    }

    @Transactional(readOnly = true)
    public List<ResourceTemplateDto> getAllTemplates(String category) {
        List<ResourceTemplateEntity> list;
        if (category != null && !category.trim().isEmpty()) {
            list = templateRepository.findByCategoryIgnoreCase(category.trim());
        } else {
            list = templateRepository.findAll();
        }
        return list.stream().map(this::toTemplateDto).toList();
    }

    @Transactional
    public void deleteTemplate(String templateCode) {
        ResourceTemplateEntity entity = templateRepository.findByTemplateCode(templateCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));

        List<ResourceEntity> using = resourceRepository.findByTemplateCodeIgnoreCase(templateCode.trim().toUpperCase());
        if (!using.isEmpty()) {
            throw new IllegalStateException("Cannot delete template '" + templateCode + "' because " + using.size() + " resources are using it");
        }

        templateRepository.delete(entity);
        log.info("Deleted resource template '{}'", templateCode);
    }

    // =========================================================================
    // 3. RESOURCE RELATIONSHIP MANAGEMENT (TOPOLOGY & INFORMATION FLOW)
    // =========================================================================

    @Transactional
    public ResourceRelationshipDto createRelationship(ResourceRelationshipDto dto) {
        String sourceId = dto.getSourceResourceId().trim();
        String targetId = dto.getTargetResourceId().trim();
        String relType = dto.getRelationType().trim().toUpperCase();

        if (!resourceRepository.existsByResourceId(sourceId)) {
            throw new IllegalArgumentException("Source resource '" + sourceId + "' does not exist");
        }
        if (!resourceRepository.existsByResourceId(targetId)) {
            throw new IllegalArgumentException("Target resource '" + targetId + "' does not exist");
        }
        if (relationshipRepository.existsBySourceResourceIdAndTargetResourceIdAndRelationType(sourceId, targetId, relType)) {
            throw new IllegalArgumentException("Relationship between '" + sourceId + "' and '" + targetId + "' of type '" + relType + "' already exists");
        }

        ResourceRelationshipEntity entity = ResourceRelationshipEntity.builder()
                .sourceResourceId(sourceId)
                .targetResourceId(targetId)
                .relationCategory(dto.getRelationCategory().trim().toUpperCase())
                .relationType(relType)
                .properties(serializeProperties(dto.getProperties() != null ? dto.getProperties() : Collections.emptyMap()))
                .active(dto.isActive())
                .build();

        ResourceRelationshipEntity saved = relationshipRepository.save(entity);
        log.info("Created resource relationship '{}' --[{}]--> '{}'", sourceId, relType, targetId);
        return toRelationshipDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ResourceRelationshipDto> getRelationshipsForResource(String resourceId) {
        return relationshipRepository.findBySourceResourceIdOrTargetResourceId(resourceId.trim(), resourceId.trim())
                .stream()
                .map(this::toRelationshipDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ResourceRelationshipDto> getAllRelationships(String category) {
        List<ResourceRelationshipEntity> list;
        if (category != null && !category.trim().isEmpty()) {
            list = relationshipRepository.findByRelationCategoryAndActiveTrue(category.trim().toUpperCase());
        } else {
            list = relationshipRepository.findAll();
        }
        return list.stream().map(this::toRelationshipDto).toList();
    }

    @Transactional
    public void deleteRelationship(UUID id) {
        if (!relationshipRepository.existsById(id)) {
            throw new IllegalArgumentException("Relationship not found with ID: " + id);
        }
        relationshipRepository.deleteById(id);
        log.info("Deleted relationship ID '{}'", id);
    }

    @Transactional(readOnly = true)
    public List<String> getDownstreamTargets(String sourceResourceId) {
        return relationshipRepository.findBySourceResourceIdAndRelationTypeAndActiveTrue(sourceResourceId, "TRANSFERS_TO")
                .stream()
                .map(ResourceRelationshipEntity::getTargetResourceId)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> getAssociatedDataSources(String targetResourceId) {
        return relationshipRepository.findByTargetResourceIdAndRelationTypeAndActiveTrue(targetResourceId, "DATA_SOURCE_FOR")
                .stream()
                .map(ResourceRelationshipEntity::getSourceResourceId)
                .toList();
    }

    // =========================================================================
    // 4. MAPPING HELPERS
    // =========================================================================

    private ResourceResponseDto toDto(ResourceEntity entity) {
        Map<String, Object> tplProps = deserializeProperties(entity.getTemplateProperties());
        Map<String, Object> customProps = deserializeProperties(entity.getCustomProperties());
        Map<String, Object> effectiveProps = resolveEffectiveProperties(entity);

        String ip = null;
        if (effectiveProps.containsKey("ip")) ip = String.valueOf(effectiveProps.get("ip"));
        else if (effectiveProps.containsKey("ipAddress")) ip = String.valueOf(effectiveProps.get("ipAddress"));
        else if (effectiveProps.containsKey("host")) ip = String.valueOf(effectiveProps.get("host"));
        else if (effectiveProps.containsKey("plcIp")) ip = String.valueOf(effectiveProps.get("plcIp"));

        return ResourceResponseDto.builder()
                .id(entity.getId())
                .resourceId(entity.getResourceId())
                .name(entity.getName())
                .type(entity.getType())
                .category(entity.getCategory())
                .templateCode(entity.getTemplateCode())
                .status(entity.getStatus())
                .ip(ip)
                .templateProperties(tplProps)
                .customProperties(customProps)
                .effectiveProperties(effectiveProps)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private ResourceTemplateDto toTemplateDto(ResourceTemplateEntity entity) {
        return ResourceTemplateDto.builder()
                .id(entity.getId())
                .templateCode(entity.getTemplateCode())
                .templateName(entity.getTemplateName())
                .category(entity.getCategory())
                .resourceType(entity.getResourceType())
                .communicationProtocol(entity.getCommunicationProtocol())
                .propertySchema(deserializeList(entity.getPropertySchema()))
                .defaultProperties(deserializeProperties(entity.getDefaultProperties()))
                .supportedCommands(deserializeStringList(entity.getSupportedCommands()))
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private ResourceRelationshipDto toRelationshipDto(ResourceRelationshipEntity entity) {
        return ResourceRelationshipDto.builder()
                .id(entity.getId())
                .sourceResourceId(entity.getSourceResourceId())
                .targetResourceId(entity.getTargetResourceId())
                .relationCategory(entity.getRelationCategory())
                .relationType(entity.getRelationType())
                .properties(deserializeProperties(entity.getProperties()))
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String serializeProperties(Map<String, Object> props) {
        if (props == null || props.isEmpty()) return "{}";
        try {
            return objectMapper.writeValueAsString(props);
        } catch (Exception e) {
            log.error("Failed to serialize properties", e);
            return "{}";
        }
    }

    private String serializeList(Object list) {
        if (list == null) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            log.error("Failed to serialize list", e);
            return "[]";
        }
    }

    private Map<String, Object> deserializeProperties(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize properties JSON: {}", json);
            return Collections.emptyMap();
        }
    }

    private List<Map<String, Object>> deserializeList(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize list JSON: {}", json);
            return Collections.emptyList();
        }
    }

    private List<String> deserializeStringList(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize string list JSON: {}", json);
            return Collections.emptyList();
        }
    }
}
