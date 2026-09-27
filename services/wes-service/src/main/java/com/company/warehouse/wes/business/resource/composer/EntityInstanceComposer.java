package com.company.warehouse.wes.business.resource.composer;

import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.business.resource.composer.engine.EntityPropertyResolutionEngine;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.validation.EntityInstanceValidator;
import com.company.warehouse.wes.business.resource.composer.validation.EntityValidationResult;

import java.util.HashMap;
import java.util.Map;

/**
 * Fluent builder for instantiating a concrete entity instance from an Entity Template blueprint.
 */
public class EntityInstanceComposer {

    private final ComposedEntityTemplate template;
    private String resourceId;
    private String name;
    private String description;
    private String application;
    private String type;
    private String category;
    private String status = "ACTIVE";
    private String protocol = "http";
    private String host = "127.0.0.1";
    private int port = 8080;
    private String documentationUrl;

    private final Map<String, Object> templateProperties = new HashMap<>();
    private final Map<String, Object> customProperties = new HashMap<>();
    private final Map<String, Object> methodsConfig = new HashMap<>();

    private EntityInstanceComposer(ComposedEntityTemplate template) {
        this.template = template;
        if (template != null && template.getBasicInfo() != null) {
            this.application = template.getBasicInfo().getApplication();
            this.type = template.getBasicInfo().getResourceType();
            this.category = template.getBasicInfo().getCategory();
            this.protocol = template.getBasicInfo().getDefaultProtocol();
            this.host = template.getBasicInfo().getDefaultHost();
            this.port = template.getBasicInfo().getDefaultPort();
            this.documentationUrl = template.getBasicInfo().getDocumentationUrl();
            this.description = template.getBasicInfo().getDescription();
        }
    }

    public static EntityInstanceComposer fromTemplate(ComposedEntityTemplate template) {
        return new EntityInstanceComposer(template);
    }

    public EntityInstanceComposer resourceId(String resourceId) {
        this.resourceId = resourceId;
        return this;
    }

    public EntityInstanceComposer name(String name) {
        this.name = name;
        return this;
    }

    public EntityInstanceComposer description(String description) {
        this.description = description;
        return this;
    }

    public EntityInstanceComposer application(String application) {
        this.application = application;
        return this;
    }

    public EntityInstanceComposer status(String status) {
        this.status = status;
        return this;
    }

    public EntityInstanceComposer endpoint(String host, int port, String protocol) {
        if (host != null) this.host = host;
        if (port > 0) this.port = port;
        if (protocol != null) this.protocol = protocol.toLowerCase();
        return this;
    }

    public EntityInstanceComposer documentationUrl(String documentationUrl) {
        this.documentationUrl = documentationUrl;
        return this;
    }

    public EntityInstanceComposer setProperty(String key, Object value) {
        if (key != null) {
            this.templateProperties.put(key.trim(), value);
        }
        return this;
    }

    public EntityInstanceComposer setCustomProperty(String key, Object value) {
        if (key != null) {
            this.customProperties.put(key.trim(), value);
        }
        return this;
    }

    public EntityInstanceComposer bindService(String serviceName, String path, String httpMethod) {
        return bindService(serviceName, path, httpMethod, Map.of());
    }

    public EntityInstanceComposer bindService(String serviceName, String path, String httpMethod, Map<String, String> parameterBindings) {
        if (serviceName != null && !serviceName.trim().isEmpty()) {
            Map<String, Object> cfg = new HashMap<>();
            if (path != null) cfg.put("path", path);
            if (httpMethod != null) cfg.put("httpMethod", httpMethod);
            if (parameterBindings != null) cfg.put("parameterBindings", new HashMap<>(parameterBindings));
            this.methodsConfig.put(serviceName.trim(), cfg);
        }
        return this;
    }

    public ComposedEntityInstance compose(EntityPropertyResolutionEngine resolutionEngine) {
        String templateCode = template != null && template.getBasicInfo() != null
                ? template.getBasicInfo().getTemplateCode()
                : null;

        Map<String, Object> templateDefaults = template != null ? template.getDefaultProperties() : Map.of();

        Map<String, Object> effectiveProps = resolutionEngine != null
                ? resolutionEngine.resolve(templateCode, templateDefaults, templateProperties, customProperties, host, port, protocol, application, description, documentationUrl)
                : new HashMap<>();

        return ComposedEntityInstance.builder()
                .resourceId(this.resourceId)
                .name(this.name != null ? this.name : this.resourceId)
                .description(this.description)
                .application(this.application != null ? this.application : "GENERIC_REST_APP")
                .type(this.type != null ? this.type : "REST_GENERIC")
                .category(this.category != null ? this.category : "SOFTWARE")
                .templateCode(templateCode)
                .status(this.status)
                .protocol(this.protocol)
                .host(this.host)
                .port(this.port)
                .documentationUrl(this.documentationUrl)
                .templateProperties(new HashMap<>(this.templateProperties))
                .customProperties(new HashMap<>(this.customProperties))
                .methodsConfig(new HashMap<>(this.methodsConfig))
                .effectiveProperties(effectiveProps)
                .build();
    }

    public EntityValidationResult validate(EntityInstanceValidator validator, EntityPropertyResolutionEngine engine) {
        ComposedEntityInstance instance = compose(engine);
        return validator != null ? validator.validate(instance, template) : EntityValidationResult.valid();
    }

    public ResourceRequestDto toRequestDto() {
        return ResourceRequestDto.builder()
                .resourceId(this.resourceId)
                .name(this.name != null ? this.name : this.resourceId)
                .type(this.type != null ? this.type : "REST_GENERIC")
                .category(this.category != null ? this.category : "SOFTWARE")
                .templateCode(template != null && template.getBasicInfo() != null ? template.getBasicInfo().getTemplateCode() : null)
                .templateProperties(new HashMap<>(this.templateProperties))
                .status(this.status)
                .description(this.description)
                .application(this.application != null ? this.application : "GENERIC_REST_APP")
                .protocol(this.protocol)
                .host(this.host)
                .port(this.port)
                .documentationUrl(this.documentationUrl)
                .customProperties(new HashMap<>(this.customProperties))
                .methodsConfig(new HashMap<>(this.methodsConfig))
                .build();
    }
}
