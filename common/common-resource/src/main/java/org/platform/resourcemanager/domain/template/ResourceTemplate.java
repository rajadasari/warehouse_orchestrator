package org.platform.resourcemanager.domain.template;

import org.platform.resourcemanager.domain.builder.ResourceBuilder;
import org.platform.resourcemanager.domain.model.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.*;

/**
 * Universal Resource Template Domain Aggregate.
 * Defines default properties, custom properties schema, standard methods, and custom methods.
 * Provides invariant validation and instantiation into concrete Resource aggregates.
 */
public record ResourceTemplate(
        String templateCode,
        String templateName,
        ResourceCategory category,
        ResourceType resourceType,
        String communicationProtocol,
        String description,
        String application,
        String defaultProtocol,
        String defaultHost,
        int defaultPort,
        String documentationUrl,
        Map<String, Object> defaultProperties,
        List<PropertyDefinition> customPropertiesSchema,
        List<MethodDefinition> standardMethods,
        List<MethodDefinition> customMethods,
        List<org.platform.resourcemanager.domain.shape.ResourceShape> appliedShapes,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) implements Serializable {

    public ResourceTemplate {
        Objects.requireNonNull(templateCode, "templateCode must not be null");
        if (templateCode.isBlank()) {
            throw new IllegalArgumentException("templateCode must not be blank");
        }
        templateCode = templateCode.trim().toUpperCase();
        templateName = (templateName == null || templateName.isBlank()) ? templateCode : templateName.trim();
        category = (category == null) ? ResourceCategory.PHYSICAL : category;
        resourceType = (resourceType == null) ? StandardResourceClass.EQUIPMENT : resourceType;
        communicationProtocol = (communicationProtocol == null || communicationProtocol.isBlank()) ? "REST" : communicationProtocol.trim();
        description = (description == null) ? "" : description.trim();
        application = (application == null || application.isBlank()) ? "GENERIC" : application.trim();
        defaultProtocol = (defaultProtocol == null || defaultProtocol.isBlank()) ? "http" : defaultProtocol.trim().toLowerCase();
        defaultHost = (defaultHost == null || defaultHost.isBlank()) ? "127.0.0.1" : defaultHost.trim();
        defaultPort = (defaultPort <= 0) ? 8080 : defaultPort;
        documentationUrl = (documentationUrl == null) ? "" : documentationUrl.trim();
        defaultProperties = (defaultProperties == null) ? Map.of() : Map.copyOf(defaultProperties);
        customPropertiesSchema = (customPropertiesSchema == null) ? List.of() : List.copyOf(customPropertiesSchema);
        standardMethods = (standardMethods == null) ? List.of() : List.copyOf(standardMethods);
        customMethods = (customMethods == null) ? List.of() : List.copyOf(customMethods);
        appliedShapes = (appliedShapes == null) ? List.of() : List.copyOf(appliedShapes);
        createdAt = (createdAt == null) ? Instant.now() : createdAt;
        updatedAt = (updatedAt == null) ? createdAt : updatedAt;
    }

    /**
     * Backward-compatible constructor without appliedShapes.
     */
    public ResourceTemplate(
            String templateCode,
            String templateName,
            ResourceCategory category,
            ResourceType resourceType,
            String communicationProtocol,
            String description,
            String application,
            String defaultProtocol,
            String defaultHost,
            int defaultPort,
            String documentationUrl,
            Map<String, Object> defaultProperties,
            List<PropertyDefinition> customPropertiesSchema,
            List<MethodDefinition> standardMethods,
            List<MethodDefinition> customMethods,
            boolean active,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(templateCode, templateName, category, resourceType, communicationProtocol, description, application,
                defaultProtocol, defaultHost, defaultPort, documentationUrl, defaultProperties,
                customPropertiesSchema, standardMethods, customMethods, List.of(), active, createdAt, updatedAt);
    }

    /**
     * OT Gateway communication method alias.
     */
    public String communicationMethod() {
        return communicationProtocol();
    }

    /**
     * Instantiates a concrete Resource aggregate from this template with overrides and shape composition.
     */
    public Resource instantiate(ResourceId id, String name, Map<String, Object> propertyOverrides) {
        Objects.requireNonNull(id, "id must not be null");
        String finalName = (name == null || name.isBlank()) ? id.resourceId() : name.trim();

        // 1. Compose default properties: Applied Shapes first, then Template defaults override shapes
        Map<String, Object> combinedProps = new HashMap<>();
        for (org.platform.resourcemanager.domain.shape.ResourceShape shape : appliedShapes) {
            combinedProps.putAll(shape.defaultProperties());
        }
        combinedProps.putAll(defaultProperties);

        // 2. Apply instance-level overrides
        if (propertyOverrides != null) {
            combinedProps.putAll(propertyOverrides);
        }

        ResourceBuilder builder = ResourceBuilder.create(id)
                .name(finalName)
                .category(category)
                .resourceClass(resourceType);

        // 3. Compose capabilities/methods from applied shapes
        for (org.platform.resourcemanager.domain.shape.ResourceShape shape : appliedShapes) {
            for (MethodDefinition m : shape.methods()) {
                builder.addCapability(m.name());
            }
        }

        // 4. Add template standard and custom methods
        for (MethodDefinition std : standardMethods) {
            builder.addCapability(std.name());
        }
        for (MethodDefinition custom : customMethods) {
            builder.addCapability(custom.name());
        }

        // 5. Add dynamic properties
        for (Map.Entry<String, Object> entry : combinedProps.entrySet()) {
            if (entry.getValue() != null) {
                builder.addProperty(entry.getKey(), entry.getValue());
            }
        }

        return builder.build();
    }
}
