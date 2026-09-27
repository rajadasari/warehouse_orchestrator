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
import com.company.warehouse.wes.business.resource.composer.EntityComposerMapper;
import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import com.company.warehouse.wes.business.resource.composer.engine.EntityPropertyResolutionEngine;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.validation.EntityTemplateValidator;
import com.company.warehouse.wes.business.resource.composer.validation.EntityValidationResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.platform.resourcemanager.api.ResourceClient;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.model.StandardResourceClass;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceManager implements ResourceConfigProvider {

    private final ResourceRepository resourceRepository;
    private final ResourceTemplateRepository templateRepository;
    private final ResourceRelationshipRepository relationshipRepository;
    private final ObjectMapper objectMapper;
    private final EntityPropertyResolutionEngine propertyResolutionEngine;
    private final EntityArchetypeRegistry archetypeRegistry;
    private final EntityTemplateValidator templateValidator;
    private final EntityComposerMapper composerMapper;
    private final ResourceClient resourceClient;

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

        String protocol = request.getProtocol() != null && !request.getProtocol().trim().isEmpty()
                ? request.getProtocol().trim().toLowerCase() : "http";
        String host = request.getResolvedHost();
        int port = request.getPort() != null && request.getPort() > 0 ? request.getPort() : 8080;
        String application = request.getApplication() != null && !request.getApplication().trim().isEmpty()
                ? request.getApplication().trim() : "WMS";
        String description = request.getDescription() != null ? request.getDescription().trim() : null;
        String docUrl = request.getDocumentationUrl() != null ? request.getDocumentationUrl().trim() : null;

        Map<String, Object> tplProps = new HashMap<>();
        if (templateCode != null) {
            ResourceTemplateDto tpl = getTemplateByCode(templateCode);
            if (request.getCategory() == null || request.getCategory().trim().isEmpty()) {
                category = tpl.getCategory();
            }
            if ((request.getPort() == null || request.getPort() <= 0) && tpl.getDefaultPort() != null) {
                port = tpl.getDefaultPort();
            }
            if ((request.getProtocol() == null || request.getProtocol().trim().isEmpty()) && tpl.getDefaultProtocol() != null) {
                protocol = tpl.getDefaultProtocol();
            }
            if (tpl.getDefaultProperties() != null) {
                tplProps.putAll(tpl.getDefaultProperties());
            }
        }

        if (request.getTemplateProperties() != null) {
            tplProps.putAll(request.getTemplateProperties());
        }
        Map<String, Object> customProps = request.getResolvedCustomProperties();
        Map<String, Object> methodsConfig = request.getMethodsConfig() != null ? request.getMethodsConfig() : Collections.emptyMap();

        ResourceEntity entity = ResourceEntity.builder()
                .resourceId(resId)
                .name(request.getName().trim())
                .description(description)
                .application(application)
                .protocol(protocol)
                .host(host)
                .port(port)
                .documentationUrl(docUrl)
                .type(request.getType().trim().toUpperCase())
                .category(category)
                .templateCode(templateCode)
                .status(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .templateProperties(serializeProperties(tplProps))
                .customProperties(serializeProperties(customProps))
                .methodsConfig(serializeProperties(methodsConfig))
                .build();

        ResourceEntity saved = resourceRepository.save(entity);
        log.info("Created resource '{}' (Category: {}, Type: {}, Host: {}:{}, App: {})",
                saved.getResourceId(), saved.getCategory(), saved.getType(), saved.getHost(), saved.getPort(), saved.getApplication());

        // Register with common-resource micro-kernel
        try {
            resourceClient.register(new org.platform.resourcemanager.api.dto.CreateResourceRequest(
                    "default",
                    saved.getResourceId(),
                    saved.getName(),
                    saved.getType(),
                    saved.getCategory(),
                    "",
                    0.0, 0.0, 0.0,
                    java.util.Set.of(),
                    customProps
            ));
        } catch (Exception e) {
            log.warn("Failed to register resource '{}' with ResourceClient domain engine", saved.getResourceId(), e);
        }

        return toDto(saved);
    }

    @Transactional
    public ResourceResponseDto updateResource(String resourceId, ResourceRequestDto request) {
        ResourceEntity entity = resourceRepository.findByResourceId(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            entity.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            entity.setDescription(request.getDescription().trim());
        }
        if (request.getApplication() != null && !request.getApplication().trim().isEmpty()) {
            entity.setApplication(request.getApplication().trim());
        }
        if (request.getProtocol() != null && !request.getProtocol().trim().isEmpty()) {
            entity.setProtocol(request.getProtocol().trim().toLowerCase());
        }
        if (request.getHost() != null && !request.getHost().trim().isEmpty()) {
            entity.setHost(request.getHost().trim());
        } else if (request.getIp() != null && !request.getIp().trim().isEmpty()) {
            entity.setHost(request.getIp().trim());
        }
        if (request.getPort() != null && request.getPort() > 0) {
            entity.setPort(request.getPort());
        }
        if (request.getDocumentationUrl() != null) {
            entity.setDocumentationUrl(request.getDocumentationUrl().trim());
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
            if (!tCode.isEmpty() && !templateRepository.existsByTemplateCode(tCode) && !archetypeRegistry.hasArchetype(tCode)) {
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

        if (request.getMethodsConfig() != null) {
            Map<String, Object> currentMethods = deserializeProperties(entity.getMethodsConfig());
            currentMethods.putAll(request.getMethodsConfig());
            entity.setMethodsConfig(serializeProperties(currentMethods));
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
     * Resolves effective properties using the 5-tier Entity Property Resolution Engine:
     * Base Archetype Defaults -> DB Template Defaults -> Instance Template Overrides -> Custom Properties -> Coordinates
     */
    @Transactional(readOnly = true)
    public Map<String, Object> resolveEffectiveProperties(ResourceEntity resource) {
        Map<String, Object> dbDefaults = null;
        if (resource.getTemplateCode() != null && !resource.getTemplateCode().trim().isEmpty()) {
            dbDefaults = templateRepository.findByTemplateCode(resource.getTemplateCode().trim())
                    .map(tpl -> deserializeProperties(tpl.getDefaultProperties()))
                    .orElse(null);
        }

        Map<String, Object> tplOverrides = deserializeProperties(resource.getTemplateProperties());
        Map<String, Object> customProps = deserializeProperties(resource.getCustomProperties());

        return propertyResolutionEngine.resolve(
                resource.getTemplateCode(),
                dbDefaults,
                tplOverrides,
                customProps,
                resource.getHost(),
                resource.getPort(),
                resource.getProtocol(),
                resource.getApplication(),
                resource.getDescription(),
                resource.getDocumentationUrl()
        );
    }

    // =========================================================================
    // 2. RESOURCE TEMPLATE MANAGEMENT (ENTITY COMPOSER INTEGRATED)
    // =========================================================================

    @Transactional
    public ResourceTemplateDto createTemplate(ResourceTemplateDto dto) {
        String code = dto.getTemplateCode().trim().toUpperCase();
        if (templateRepository.existsByTemplateCode(code)) {
            throw new IllegalArgumentException("Template with code '" + code + "' already exists");
        }

        ComposedEntityTemplate composed = composerMapper.toComposedTemplate(dto);
        EntityValidationResult validation = templateValidator.validate(composed);
        if (!validation.isValid()) {
            throw new IllegalArgumentException("Template validation failed: " + String.join("; ", validation.getErrors()));
        }

        ResourceTemplateEntity entity = composerMapper.toEntity(composed);
        ResourceTemplateEntity saved = templateRepository.save(entity);
        log.info("Created resource template '{}' via Entity Composer", saved.getTemplateCode());
        return toTemplateDto(saved);
    }

    @Transactional
    public ResourceTemplateDto updateTemplate(String templateCode, ResourceTemplateDto dto) {
        ResourceTemplateEntity entity = templateRepository.findByTemplateCode(templateCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));

        if (dto.getTemplateName() != null && !dto.getTemplateName().trim().isEmpty()) {
            entity.setTemplateName(dto.getTemplateName().trim());
        }
        if (dto.getDescription() != null) {
            entity.setDescription(dto.getDescription().trim());
        }
        if (dto.getApplication() != null && !dto.getApplication().trim().isEmpty()) {
            entity.setApplication(dto.getApplication().trim());
        }
        if (dto.getDefaultProtocol() != null && !dto.getDefaultProtocol().trim().isEmpty()) {
            entity.setDefaultProtocol(dto.getDefaultProtocol().trim().toLowerCase());
        }
        if (dto.getDefaultHost() != null && !dto.getDefaultHost().trim().isEmpty()) {
            entity.setDefaultHost(dto.getDefaultHost().trim());
        }
        if (dto.getDefaultPort() != null && dto.getDefaultPort() > 0) {
            entity.setDefaultPort(dto.getDefaultPort());
        }
        if (dto.getDocumentationUrl() != null) {
            entity.setDocumentationUrl(dto.getDocumentationUrl().trim());
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
        if (dto.getCommunicationMethod() != null && !dto.getCommunicationMethod().trim().isEmpty()) {
            entity.setCommunicationMethod(dto.getCommunicationMethod().trim().toUpperCase());
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
        if (dto.getMethodsSchema() != null) {
            entity.setMethodsSchema(serializeList(dto.getMethodsSchema()));
        }
        entity.setActive(dto.isActive());

        ResourceTemplateEntity updated = templateRepository.save(entity);
        log.info("Updated resource template '{}'", updated.getTemplateCode());
        return toTemplateDto(updated);
    }

    @Transactional(readOnly = true)
    public ResourceTemplateDto getTemplateByCode(String templateCode) {
        String cleanCode = templateCode.trim().toUpperCase();
        return templateRepository.findByTemplateCode(cleanCode)
                .map(e -> {
                    ResourceTemplateDto dto = toTemplateDto(e);
                    if (archetypeRegistry.hasArchetype(cleanCode)) {
                        dto.setSystemTemplate(true);
                    }
                    return dto;
                })
                .or(() -> archetypeRegistry.getTemplate(cleanCode).map(tpl -> {
                    ResourceTemplateDto dto = composerMapper.toDto(tpl);
                    dto.setSystemTemplate(true);
                    return dto;
                }))
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));
    }

    @Transactional(readOnly = true)
    public List<ResourceTemplateDto> getAllTemplates(String category) {
        List<ResourceTemplateEntity> dbList;
        if (category != null && !category.trim().isEmpty()) {
            dbList = templateRepository.findByCategoryIgnoreCase(category.trim());
        } else {
            dbList = templateRepository.findAll();
        }

        Map<String, ResourceTemplateDto> merged = new LinkedHashMap<>();
        for (ResourceTemplateEntity e : dbList) {
            ResourceTemplateDto dto = toTemplateDto(e);
            if (archetypeRegistry.hasArchetype(e.getTemplateCode())) {
                dto.setSystemTemplate(true);
            }
            merged.put(dto.getTemplateCode().toUpperCase(), dto);
        }

        // Overlay code-defined platform standard archetypes if not present in DB
        List<com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetype> archetypes =
                (category != null && !category.trim().isEmpty())
                        ? archetypeRegistry.getByCategory(category)
                        : archetypeRegistry.getAllArchetypes();

        for (com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetype a : archetypes) {
            String code = a.getArchetypeCode().trim().toUpperCase();
            if (!merged.containsKey(code)) {
                ResourceTemplateDto dto = composerMapper.toDto(a.toTemplate());
                dto.setSystemTemplate(true);
                merged.put(code, dto);
            }
        }

        return new ArrayList<>(merged.values());
    }

    @Transactional
    public void deleteTemplate(String templateCode) {
        String cleanCode = templateCode.trim().toUpperCase();
        if (archetypeRegistry.hasArchetype(cleanCode)) {
            throw new IllegalStateException("Cannot delete standard platform template '" + cleanCode + "'");
        }

        ResourceTemplateEntity entity = templateRepository.findByTemplateCode(cleanCode)
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));

        List<ResourceEntity> using = resourceRepository.findByTemplateCodeIgnoreCase(cleanCode);
        if (!using.isEmpty()) {
            throw new IllegalStateException("Cannot delete template '" + cleanCode + "' because " + using.size() + " resources are using it");
        }

        templateRepository.delete(entity);
        log.info("Deleted resource template '{}'", templateCode);
    }

    @Transactional(readOnly = true)
    public com.company.warehouse.wes.api.dto.resource.TemplatePackageDto exportTemplatePackage(String templateCode) {
        List<ResourceTemplateDto> templates;
        if (templateCode != null && !templateCode.trim().isEmpty()) {
            templates = List.of(getTemplateByCode(templateCode));
        } else {
            templates = getAllTemplates(null);
        }

        return com.company.warehouse.wes.api.dto.resource.TemplatePackageDto.builder()
                .schemaVersion("1.0.0")
                .environment("DEVELOPMENT")
                .exportedBy("System Admin")
                .exportedAt(java.time.Instant.now())
                .templates(templates)
                .build();
    }

    @Transactional
    public List<ResourceTemplateDto> importTemplatePackage(com.company.warehouse.wes.api.dto.resource.TemplatePackageDto pkg, boolean overwriteExisting) {
        if (pkg == null || pkg.getTemplates() == null || pkg.getTemplates().isEmpty()) {
            throw new IllegalArgumentException("Template package contains no templates to import");
        }

        List<ResourceTemplateDto> imported = new java.util.ArrayList<>();
        for (ResourceTemplateDto dto : pkg.getTemplates()) {
            String code = dto.getTemplateCode().trim().toUpperCase();
            if (templateRepository.existsByTemplateCode(code)) {
                if (overwriteExisting) {
                    imported.add(updateTemplate(code, dto));
                    log.info("Overwrote existing template '{}' from package import", code);
                } else {
                    log.info("Skipped existing template '{}' (overwriteExisting=false)", code);
                }
            } else {
                imported.add(createTemplate(dto));
                log.info("Imported new template '{}' from package", code);
            }
        }
        return imported;
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

        // Sync with common-resource OperationalGraph
        try {
            org.platform.resourcemanager.domain.topology.RelationshipType graphRelType = 
                    org.platform.resourcemanager.domain.topology.RelationshipType.valueOf(relType);
            resourceClient.link(
                    ResourceId.of(sourceId),
                    ResourceId.of(targetId),
                    graphRelType
            );
        } catch (Exception e) {
            log.debug("Relationship type '{}' not directly mapped to OperationalGraph", relType);
        }

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

        Map<String, Object> methodsConfig = deserializeProperties(entity.getMethodsConfig());
        List<Map<String, Object>> effectiveMethods = resolveEffectiveMethods(entity);

        String host = entity.getHost();
        if ((host == null || host.isEmpty() || host.equals("127.0.0.1")) && ip != null && !ip.equals("127.0.0.1")) {
            host = ip;
        }

        return ResourceResponseDto.builder()
                .id(entity.getId())
                .resourceId(entity.getResourceId())
                .name(entity.getName())
                .description(entity.getDescription())
                .application(entity.getApplication())
                .protocol(entity.getProtocol())
                .host(host)
                .port(entity.getPort())
                .documentationUrl(entity.getDocumentationUrl())
                .type(entity.getType())
                .category(entity.getCategory())
                .templateCode(entity.getTemplateCode())
                .status(entity.getStatus())
                .ip(host)
                .templateProperties(tplProps)
                .customProperties(customProps)
                .effectiveProperties(effectiveProps)
                .methodsConfig(methodsConfig)
                .effectiveMethods(effectiveMethods)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> resolveEffectiveMethods(ResourceEntity resource) {
        List<Map<String, Object>> methods = new java.util.ArrayList<>();
        if (resource.getTemplateCode() != null && !resource.getTemplateCode().trim().isEmpty()) {
            String tCode = resource.getTemplateCode().trim().toUpperCase();
            templateRepository.findByTemplateCode(tCode)
                    .ifPresentOrElse(
                            tpl -> methods.addAll(deserializeList(tpl.getMethodsSchema())),
                            () -> archetypeRegistry.getTemplate(tCode).ifPresent(arch -> {
                                ResourceTemplateDto dto = composerMapper.toDto(arch);
                                if (dto.getMethodsSchema() != null) {
                                    for (Object m : dto.getMethodsSchema()) {
                                        methods.add(objectMapper.convertValue(m, new TypeReference<Map<String, Object>>() {}));
                                    }
                                }
                            })
                    );
        }
        return methods;
    }

    private ResourceTemplateDto toTemplateDto(ResourceTemplateEntity entity) {
        return ResourceTemplateDto.builder()
                .id(entity.getId())
                .templateCode(entity.getTemplateCode())
                .templateName(entity.getTemplateName())
                .description(entity.getDescription())
                .application(entity.getApplication())
                .defaultProtocol(entity.getDefaultProtocol())
                .defaultHost(entity.getDefaultHost())
                .defaultPort(entity.getDefaultPort())
                .documentationUrl(entity.getDocumentationUrl())
                .category(entity.getCategory())
                .resourceType(entity.getResourceType())
                .communicationProtocol(entity.getCommunicationProtocol())
                .communicationMethod(entity.getCommunicationMethod() != null ? entity.getCommunicationMethod() : entity.getCommunicationProtocol())
                .propertySchema(deserializeList(entity.getPropertySchema()))
                .defaultProperties(deserializeProperties(entity.getDefaultProperties()))
                .supportedCommands(deserializeStringList(entity.getSupportedCommands()))
                .methodsSchema(deserializeList(entity.getMethodsSchema()))
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
