package com.company.warehouse.wes.business.resource.composer;

import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetype;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.model.EntityBasicInfo;
import com.company.warehouse.wes.business.resource.composer.model.PropertyBaseType;
import com.company.warehouse.wes.business.resource.composer.model.PropertyDefinition;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import com.company.warehouse.wes.business.resource.composer.validation.EntityTemplateValidator;
import com.company.warehouse.wes.business.resource.composer.validation.EntityValidationResult;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Fluent builder for step-by-step composition of an Entity Template (Blueprint).
 * Supports:
 * - Basic identity & coordinates
 * - Data Shape property definitions & default values
 * - Service definitions
 * - Custom properties
 * - Custom services
 */
public class EntityTemplateComposer {

    private EntityBasicInfo basicInfo;
    private final List<PropertyDefinition> properties = new ArrayList<>();
    private final Map<String, Object> defaultProperties = new LinkedHashMap<>();
    private final List<ServiceDefinition> services = new ArrayList<>();
    private final List<String> supportedCommands = new ArrayList<>();

    public static EntityTemplateComposer create() {
        return new EntityTemplateComposer();
    }

    public static EntityTemplateComposer fromArchetype(EntityArchetype archetype) {
        EntityTemplateComposer composer = new EntityTemplateComposer();
        if (archetype != null) {
            composer.basicInfo(archetype.getDefaultBasicInfo());
            for (PropertyDefinition p : archetype.getPropertyDefinitions()) {
                composer.addProperty(p);
            }
            composer.defaultProperties.putAll(archetype.getDefaultProperties());
            for (ServiceDefinition s : archetype.getServiceDefinitions()) {
                composer.addService(s);
            }
        }
        return composer;
    }

    public EntityTemplateComposer basicInfo(EntityBasicInfo basicInfo) {
        this.basicInfo = basicInfo;
        return this;
    }

    public EntityTemplateComposer basicInfo(String code, String name, String category, String resourceType, String protocol) {
        this.basicInfo = EntityBasicInfo.builder()
                .templateCode(code)
                .templateName(name)
                .category(category)
                .resourceType(resourceType)
                .communicationProtocol(protocol)
                .build();
        return this;
    }

    public EntityTemplateComposer defaultCoordinates(String host, int port, String protocol, String application) {
        if (this.basicInfo == null) {
            this.basicInfo = new EntityBasicInfo();
        }
        if (host != null) this.basicInfo.setDefaultHost(host);
        if (port > 0) this.basicInfo.setDefaultPort(port);
        if (protocol != null) this.basicInfo.setDefaultProtocol(protocol);
        if (application != null) this.basicInfo.setApplication(application);
        return this;
    }

    public EntityTemplateComposer addProperty(PropertyDefinition property) {
        if (property != null) {
            this.properties.removeIf(p -> p.getName().equalsIgnoreCase(property.getName()));
            this.properties.add(property);
            if (property.getDefaultValue() != null) {
                this.defaultProperties.put(property.getName(), property.getDefaultValue());
            }
        }
        return this;
    }

    public EntityTemplateComposer addProperty(String name, String label, PropertyBaseType type, boolean required, Object defaultValue) {
        PropertyDefinition prop = PropertyDefinition.builder()
                .name(name)
                .label(label)
                .baseType(type)
                .required(required)
                .defaultValue(defaultValue)
                .build();
        return addProperty(prop);
    }

    public EntityTemplateComposer addDefaultProperty(String key, Object value) {
        if (key != null) {
            this.defaultProperties.put(key.trim(), value);
        }
        return this;
    }

    public EntityTemplateComposer addService(ServiceDefinition service) {
        if (service != null) {
            this.services.removeIf(s -> s.getName().equalsIgnoreCase(service.getName()));
            this.services.add(service);
        }
        return this;
    }

    public EntityTemplateComposer addService(String name, String pathTemplate, String httpMethod) {
        ServiceDefinition s = ServiceDefinition.builder()
                .name(name)
                .pathTemplate(pathTemplate)
                .httpMethod(httpMethod)
                .build();
        return addService(s);
    }

    public EntityTemplateComposer addService(String name, String displayName, String category, String pathTemplate, String httpMethod) {
        ServiceDefinition s = ServiceDefinition.builder()
                .name(name)
                .displayName(displayName)
                .category(category)
                .pathTemplate(pathTemplate)
                .httpMethod(httpMethod)
                .build();
        return addService(s);
    }

    public EntityTemplateComposer addCustomProperty(String name, PropertyBaseType type, Object defaultValue, String description) {
        PropertyDefinition custom = PropertyDefinition.builder()
                .name(name)
                .label(name)
                .baseType(type)
                .required(false)
                .defaultValue(defaultValue)
                .description(description)
                .build();
        return addProperty(custom);
    }

    public EntityTemplateComposer addCustomService(String name, String pathTemplate, String httpMethod, String description) {
        ServiceDefinition custom = ServiceDefinition.builder()
                .name(name)
                .displayName(name)
                .category("Custom")
                .pathTemplate(pathTemplate)
                .httpMethod(httpMethod)
                .description(description)
                .build();
        return addService(custom);
    }

    public EntityTemplateComposer addSupportedCommand(String command) {
        if (command != null && !command.trim().isEmpty()) {
            this.supportedCommands.add(command.trim().toUpperCase());
        }
        return this;
    }

    public EntityValidationResult validate(EntityTemplateValidator validator) {
        ComposedEntityTemplate template = build();
        return validator != null ? validator.validate(template) : EntityValidationResult.valid();
    }

    public ComposedEntityTemplate build() {
        return ComposedEntityTemplate.builder()
                .basicInfo(this.basicInfo != null ? this.basicInfo : new EntityBasicInfo())
                .propertyDefinitions(new ArrayList<>(this.properties))
                .defaultProperties(new LinkedHashMap<>(this.defaultProperties))
                .serviceDefinitions(new ArrayList<>(this.services))
                .supportedCommands(new ArrayList<>(this.supportedCommands))
                .build();
    }
}
