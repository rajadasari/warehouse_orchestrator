package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
            domainMethods.add(new org.platform.resourcemanager.domain.template.MethodDefinition(
                    s.getName() != null ? s.getName() : "service",
                    s.getDisplayName() != null ? s.getDisplayName() : (s.getName() != null ? s.getName() : "service"),
                    s.getCategory() != null ? s.getCategory() : "GENERAL",
                    false,
                    s.getDescription() != null ? s.getDescription() : "",
                    List.of(),
                    s.getOutputSchema() != null ? s.getOutputSchema() : Map.of()
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

    public static ComposedEntityTemplate fromDomainTemplate(org.platform.resourcemanager.domain.template.ResourceTemplate domain) {
        if (domain == null) return null;
        EntityBasicInfo basic = EntityBasicInfo.builder()
                .templateCode(domain.templateCode())
                .templateName(domain.templateName())
                .category(domain.category() != null ? domain.category().name() : "PHYSICAL")
                .resourceType(domain.resourceType() != null ? domain.resourceType().code() : "EQUIPMENT")
                .communicationProtocol(domain.communicationProtocol())
                .description(domain.description())
                .application(domain.application())
                .defaultProtocol(domain.defaultProtocol())
                .defaultHost(domain.defaultHost())
                .defaultPort(domain.defaultPort())
                .documentationUrl(domain.documentationUrl())
                .active(domain.active())
                .build();

        List<PropertyDefinition> props = new ArrayList<>();
        if (domain.customPropertiesSchema() != null) {
            for (org.platform.resourcemanager.domain.template.PropertyDefinition dp : domain.customPropertiesSchema()) {
                PropertyBaseType bType = PropertyBaseType.STRING;
                try {
                    if (dp.type() != null) bType = PropertyBaseType.valueOf(dp.type().name());
                } catch (Exception ignored) {}
                props.add(PropertyDefinition.builder()
                        .name(dp.key())
                        .label(dp.label())
                        .baseType(bType)
                        .required(dp.required())
                        .defaultValue(dp.defaultValue())
                        .unit(dp.unit())
                        .options(dp.options())
                        .description(dp.description())
                        .build());
            }
        }

        List<ServiceDefinition> services = new ArrayList<>();
        List<org.platform.resourcemanager.domain.template.MethodDefinition> allMethods = new ArrayList<>();
        if (domain.standardMethods() != null) allMethods.addAll(domain.standardMethods());
        if (domain.customMethods() != null) allMethods.addAll(domain.customMethods());

        for (org.platform.resourcemanager.domain.template.MethodDefinition dm : allMethods) {
            services.add(ServiceDefinition.builder()
                    .name(dm.name())
                    .displayName(dm.displayName())
                    .category(dm.category())
                    .description(dm.description())
                    .outputSchema(dm.outputSchema())
                    .build());
        }

        return ComposedEntityTemplate.builder()
                .basicInfo(basic)
                .propertyDefinitions(props)
                .serviceDefinitions(services)
                .defaultProperties(domain.defaultProperties() != null ? new LinkedHashMap<>(domain.defaultProperties()) : new LinkedHashMap<>())
                .build();
    }
}
