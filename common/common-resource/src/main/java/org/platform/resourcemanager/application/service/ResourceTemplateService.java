package org.platform.resourcemanager.application.service;

import org.platform.resourcemanager.api.exception.ResourceNotFoundException;
import org.platform.resourcemanager.api.exception.ValidationException;
import org.platform.resourcemanager.application.port.ResourceAuditLoggerPort;
import org.platform.resourcemanager.application.port.ResourceRepositoryPort;
import org.platform.resourcemanager.application.port.ResourceTemplateRepositoryPort;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.template.PropertyDefinition;
import org.platform.resourcemanager.domain.template.ResourceTemplate;

import java.util.*;

/**
 * Domain service managing the lifecycle, registration, validation, and instantiation of ResourceTemplates.
 */
public class ResourceTemplateService {

    private final ResourceTemplateRepositoryPort templateRepository;
    private final ResourceRepositoryPort resourceRepository;
    private final ResourceLifecycleService lifecycleService;
    private final ResourceAuditLoggerPort auditLogger;

    public ResourceTemplateService(
            ResourceTemplateRepositoryPort templateRepository,
            ResourceRepositoryPort resourceRepository,
            ResourceLifecycleService lifecycleService,
            ResourceAuditLoggerPort auditLogger
    ) {
        this.templateRepository = Objects.requireNonNull(templateRepository, "templateRepository must not be null");
        this.resourceRepository = Objects.requireNonNull(resourceRepository, "resourceRepository must not be null");
        this.lifecycleService = Objects.requireNonNull(lifecycleService, "lifecycleService must not be null");
        this.auditLogger = Objects.requireNonNull(auditLogger, "auditLogger must not be null");
    }

    public ResourceTemplate registerTemplate(ResourceTemplate template) {
        Objects.requireNonNull(template, "template must not be null");
        templateRepository.save(template);
        auditLogger.log(ResourceId.of("SYSTEM", template.templateCode()), "REGISTER_TEMPLATE", "Template registered", 1L);
        return template;
    }

    public Optional<ResourceTemplate> findByCode(String templateCode) {
        if (templateCode == null || templateCode.isBlank()) {
            return Optional.empty();
        }
        return templateRepository.findByCode(templateCode.trim().toUpperCase());
    }

    public List<ResourceTemplate> listAll() {
        return templateRepository.findAll();
    }

    public List<ResourceTemplate> listByCategory(String category) {
        return templateRepository.findByCategory(category);
    }

    public boolean deleteTemplate(String templateCode) {
        if (templateCode == null || templateCode.isBlank()) {
            return false;
        }
        boolean deleted = templateRepository.deleteByCode(templateCode.trim().toUpperCase());
        if (deleted) {
            auditLogger.log(ResourceId.of("SYSTEM", templateCode), "DELETE_TEMPLATE", "Template deleted", 1L);
        }
        return deleted;
    }

    /**
     * Instantiates and registers a new Resource aggregate from a blueprint template.
     * Validates required properties from the template's schema.
     */
    public Resource createResourceFromTemplate(
            String templateCode,
            ResourceId resourceId,
            String resourceName,
            Map<String, Object> propertyOverrides
    ) {
        Objects.requireNonNull(templateCode, "templateCode must not be null");
        Objects.requireNonNull(resourceId, "resourceId must not be null");

        ResourceTemplate template = findByCode(templateCode)
                .orElseThrow(() -> new ResourceNotFoundException("Resource template not found: " + templateCode));

        Map<String, Object> overrides = (propertyOverrides != null) ? propertyOverrides : Map.of();

        // Validate required properties in the template schema
        List<String> validationErrors = new ArrayList<>();
        for (PropertyDefinition propDef : template.customPropertiesSchema()) {
            if (propDef.required()) {
                boolean hasInDefault = template.defaultProperties().containsKey(propDef.key());
                boolean hasInOverride = overrides.containsKey(propDef.key()) && overrides.get(propDef.key()) != null;
                if (!hasInDefault && !hasInOverride) {
                    validationErrors.add("Missing required property: " + propDef.key());
                }
            }
        }

        if (!validationErrors.isEmpty()) {
            throw new ValidationException("Template validation failed for " + resourceId, validationErrors);
        }

        // Instantiate domain aggregate
        Resource resource = template.instantiate(resourceId, resourceName, overrides);

        // Register into lifecycle engine
        resourceRepository.save(resource);
        auditLogger.log(resourceId, "CREATE_FROM_TEMPLATE",
                "Created resource " + resourceId + " from template " + template.templateCode(), resource.getVersion());

        return resource;
    }
}
