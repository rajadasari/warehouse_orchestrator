package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Immutable compiled representation of an Entity Template (Blueprint).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComposedEntityTemplate implements Serializable {

    private EntityBasicInfo basicInfo;

    @Builder.Default
    private List<PropertyDefinition> propertyDefinitions = new ArrayList<>();

    @Builder.Default
    private Map<String, Object> defaultProperties = new HashMap<>();

    @Builder.Default
    private List<ServiceDefinition> serviceDefinitions = new ArrayList<>();

    @Builder.Default
    private List<String> supportedCommands = new ArrayList<>();

    public Optional<PropertyDefinition> findProperty(String name) {
        if (name == null) return Optional.empty();
        return propertyDefinitions.stream()
                .filter(p -> name.equalsIgnoreCase(p.getName()))
                .findFirst();
    }

    public Optional<ServiceDefinition> findService(String name) {
        if (name == null) return Optional.empty();
        return serviceDefinitions.stream()
                .filter(s -> name.equalsIgnoreCase(s.getName()))
                .findFirst();
    }

    public List<PropertyDefinition> getPropertyDefinitions() {
        return Collections.unmodifiableList(propertyDefinitions != null ? propertyDefinitions : Collections.emptyList());
    }

    public Map<String, Object> getDefaultProperties() {
        return Collections.unmodifiableMap(defaultProperties != null ? defaultProperties : Collections.emptyMap());
    }

    public List<ServiceDefinition> getServiceDefinitions() {
        return Collections.unmodifiableList(serviceDefinitions != null ? serviceDefinitions : Collections.emptyList());
    }

    public List<String> getSupportedCommands() {
        return Collections.unmodifiableList(supportedCommands != null ? supportedCommands : Collections.emptyList());
    }

    /**
     * Bridges this composer template into the canonical common domain ResourceTemplate record.
     */
    public org.platform.resourcemanager.domain.template.ResourceTemplate toDomainTemplate() {
        org.platform.resourcemanager.domain.model.ResourceCategory cat = org.platform.resourcemanager.domain.model.ResourceCategory.PHYSICAL;
        if (basicInfo != null && basicInfo.getCategory() != null) {
            try {
                cat = org.platform.resourcemanager.domain.model.ResourceCategory.valueOf(basicInfo.getCategory().trim().toUpperCase());
            } catch (Exception ignored) {}
        }

        List<org.platform.resourcemanager.domain.template.PropertyDefinition> domainProps = new ArrayList<>();
        for (PropertyDefinition p : propertyDefinitions) {
            org.platform.resourcemanager.domain.template.PropertyDefinition.PropertyType pType =
                    org.platform.resourcemanager.domain.template.PropertyDefinition.PropertyType.STRING;
            if (p.getBaseType() != null) {
                try {
                    pType = org.platform.resourcemanager.domain.template.PropertyDefinition.PropertyType.valueOf(p.getBaseType().name());
                } catch (Exception ignored) {}
            }
            domainProps.add(new org.platform.resourcemanager.domain.template.PropertyDefinition(
                    p.getName() != null ? p.getName() : "prop",
                    p.getLabel() != null ? p.getLabel() : p.getName(),
                    pType,
                    p.isRequired(),
                    p.getDefaultValue(),
                    p.getUnit() != null ? p.getUnit() : "",
                    p.getOptions() != null ? p.getOptions() : List.of(),
                    p.getDescription() != null ? p.getDescription() : "",
                    false
            ));
        }

        List<org.platform.resourcemanager.domain.template.MethodDefinition> domainMethods = new ArrayList<>();
        for (ServiceDefinition s : serviceDefinitions) {
            org.platform.resourcemanager.domain.template.MethodDefinition.MethodType mType =
                    org.platform.resourcemanager.domain.template.MethodDefinition.MethodType.EXECUTION;
            if (s.getType() != null) {
                try {
                    mType = org.platform.resourcemanager.domain.template.MethodDefinition.MethodType.valueOf(s.getType().name());
                } catch (Exception ignored) {}
            }
            org.platform.resourcemanager.domain.template.MethodDefinition.SafetyTier sTier =
                    org.platform.resourcemanager.domain.template.MethodDefinition.SafetyTier.OPERATIONAL;
            if (s.getSafetyTier() != null) {
                try {
                    sTier = org.platform.resourcemanager.domain.template.MethodDefinition.SafetyTier.valueOf(s.getSafetyTier().name());
                } catch (Exception ignored) {}
            }
            domainMethods.add(new org.platform.resourcemanager.domain.template.MethodDefinition(
                    s.getName() != null ? s.getName() : "service",
                    mType,
                    sTier,
                    false,
                    s.getDescription() != null ? s.getDescription() : "",
                    List.of(),
                    s.getSamplePayload() != null ? s.getSamplePayload() : Map.of()
            ));
        }

        return new org.platform.resourcemanager.domain.template.ResourceTemplate(
                basicInfo != null ? basicInfo.getTemplateCode() : "UNKNOWN",
                basicInfo != null ? basicInfo.getTemplateName() : "Unknown Template",
                cat,
                org.platform.resourcemanager.domain.model.StandardResourceClass.EQUIPMENT,
                basicInfo != null ? basicInfo.getCommunicationProtocol() : "REST",
                basicInfo != null ? basicInfo.getDescription() : "",
                basicInfo != null ? basicInfo.getApplication() : "GENERIC",
                basicInfo != null ? basicInfo.getDefaultProtocol() : "http",
                basicInfo != null ? basicInfo.getDefaultHost() : "127.0.0.1",
                basicInfo != null ? basicInfo.getDefaultPort() : 8080,
                basicInfo != null ? basicInfo.getDocumentationUrl() : "",
                defaultProperties != null ? defaultProperties : Map.of(),
                domainProps,
                List.of(),
                domainMethods,
                basicInfo == null || basicInfo.isActive(),
                java.time.Instant.now(),
                java.time.Instant.now()
        );
    }
}
