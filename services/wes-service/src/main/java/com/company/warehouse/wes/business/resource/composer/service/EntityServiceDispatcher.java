package com.company.warehouse.wes.business.resource.composer.service;

import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Central router and dispatcher for entity service invocations.
 * Delegates method execution to registered EntityServiceExecutor strategy beans.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EntityServiceDispatcher {

    private final ResourceManager resourceManager;
    private final List<EntityServiceExecutor> executors;

    public MethodExecutionResult execute(String resourceId, String methodName, Map<String, Object> parameters) {
        if (resourceId == null || resourceId.trim().isEmpty()) {
            return MethodExecutionResult.builder()
                    .success(false)
                    .message("Resource ID must be specified")
                    .statusCode(400)
                    .build();
        }
        if (methodName == null || methodName.trim().isEmpty()) {
            return MethodExecutionResult.builder()
                    .success(false)
                    .resourceId(resourceId)
                    .message("Method name must be specified")
                    .statusCode(400)
                    .build();
        }

        String mName = methodName.trim().toUpperCase();
        ResourceResponseDto resource = resourceManager.getResourceById(resourceId.trim());

        Map<String, Object> mergedMethods = new java.util.HashMap<>();
        if (resource.getEffectiveMethods() instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    Object name = m.get("methodName") != null ? m.get("methodName") : m.get("name");
                    if (name != null) {
                        String nameKey = String.valueOf(name).trim();
                        mergedMethods.put(nameKey.toUpperCase(), m);
                        mergedMethods.put(nameKey, m);
                    }
                }
            }
        }
        if (resource.getMethodsConfig() != null) {
            mergedMethods.putAll(resource.getMethodsConfig());
        }

        ComposedEntityInstance instance = ComposedEntityInstance.builder()
                .resourceId(resource.getResourceId())
                .name(resource.getName())
                .description(resource.getDescription())
                .application(resource.getApplication())
                .type(resource.getType())
                .category(resource.getCategory())
                .templateCode(resource.getTemplateCode())
                .status(resource.getStatus())
                .protocol(resource.getProtocol())
                .host(resource.getHost())
                .port(resource.getPort() != null ? resource.getPort() : 8080)
                .documentationUrl(resource.getDocumentationUrl())
                .templateProperties(resource.getTemplateProperties() != null ? resource.getTemplateProperties() : Collections.emptyMap())
                .customProperties(resource.getCustomProperties() != null ? resource.getCustomProperties() : Collections.emptyMap())
                .methodsConfig(mergedMethods)
                .effectiveProperties(resource.getEffectiveProperties() != null ? resource.getEffectiveProperties() : Collections.emptyMap())
                .build();

        String protocol = resource.getProtocol() != null ? resource.getProtocol() : "";
        String category = resource.getCategory() != null ? resource.getCategory() : "SOFTWARE";

        // Locate executor in strategy list
        EntityServiceExecutor matched = executors.stream()
                .filter(e -> e.supports(mName, protocol, category))
                .findFirst()
                .orElse(null);

        if (matched == null) {
            log.warn("No executor found for method '{}' on resource '{}' (protocol: {}, category: {})",
                    mName, resourceId, protocol, category);
            return MethodExecutionResult.builder()
                    .success(false)
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message("No executor strategy registered for method '" + mName + "'")
                    .statusCode(404)
                    .build();
        }

        log.info("Dispatching method '{}' on resource '{}' via {}", mName, resourceId, matched.getClass().getSimpleName());
        return matched.execute(instance, mName, parameters);
    }
}
