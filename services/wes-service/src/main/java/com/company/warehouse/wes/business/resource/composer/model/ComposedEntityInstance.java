package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * Validated runtime configuration for an instantiated entity derived from a template.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComposedEntityInstance implements Serializable {

    private String resourceId;
    private String name;
    private String description;
    private String application;
    private String type;
    private String category;
    private String templateCode;
    private String status;

    private String protocol;
    private String host;
    private int port;
    private String documentationUrl;

    @Builder.Default
    private Map<String, Object> templateProperties = new HashMap<>();

    @Builder.Default
    private Map<String, Object> customProperties = new HashMap<>();

    @Builder.Default
    private Map<String, Object> methodsConfig = new HashMap<>();

    @Builder.Default
    private Map<String, Object> effectiveProperties = new HashMap<>();

    /**
     * Bridges this runtime composer instance into the canonical common domain Resource aggregate.
     */
    public org.platform.resourcemanager.domain.model.Resource toDomainResource() {
        org.platform.resourcemanager.domain.model.ResourceId resId =
                org.platform.resourcemanager.domain.model.ResourceId.of(resourceId != null ? resourceId : "RES-UNKNOWN");
        org.platform.resourcemanager.domain.model.ResourceCategory resCat =
                org.platform.resourcemanager.domain.model.ResourceCategory.PHYSICAL;
        if (category != null) {
            try {
                resCat = org.platform.resourcemanager.domain.model.ResourceCategory.valueOf(category.trim().toUpperCase());
            } catch (Exception ignored) {}
        }

        org.platform.resourcemanager.domain.builder.ResourceBuilder builder =
                org.platform.resourcemanager.domain.builder.ResourceBuilder.create(resId)
                        .name(name != null ? name : resId.resourceId())
                        .category(resCat)
                        .resourceClass(org.platform.resourcemanager.domain.model.StandardResourceClass.EQUIPMENT)
                        .templateCode(templateCode);

        if (methodsConfig != null) {
            methodsConfig.keySet().forEach(builder::addCapability);
        }

        if (effectiveProperties != null) {
            effectiveProperties.forEach((k, v) -> {
                if (v != null) builder.addProperty(k, v);
            });
        }
        if (customProperties != null) {
            customProperties.forEach((k, v) -> {
                if (v != null) builder.addProperty(k, v);
            });
        }
        if (templateProperties != null) {
            templateProperties.forEach((k, v) -> {
                if (v != null) builder.addProperty(k, v);
            });
        }

        return builder.build();
    }
}
