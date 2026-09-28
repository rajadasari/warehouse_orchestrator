package com.company.warehouse.wes.business.resource.composer.engine;

import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves effective services and endpoint bindings for an entity instance.
 */
@Slf4j
@Component
public class EntityServiceResolutionEngine {

    /**
     * Merges template service definitions with instance-specific method configurations.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> resolveEffectiveServices(
            List<ServiceDefinition> templateServices,
            Map<String, Object> instanceMethodsConfig) {

        if (templateServices == null || templateServices.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> effective = new ArrayList<>();

        for (ServiceDefinition def : templateServices) {
            Map<String, Object> serviceMap = new HashMap<>();
            serviceMap.put("name", def.getName());
            if (def.getDisplayName() != null) serviceMap.put("displayName", def.getDisplayName());
            if (def.getCategory() != null) serviceMap.put("category", def.getCategory());
            serviceMap.put("description", def.getDescription());
            serviceMap.put("defaultHttpMethod", def.getHttpMethod());
            serviceMap.put("defaultPathTemplate", def.getPathTemplate());
            if (def.getParametersSchema() != null) serviceMap.put("parametersSchema", def.getParametersSchema());
            if (def.getOutputSchema() != null) serviceMap.put("outputSchema", def.getOutputSchema());

            // Overlay instance bindings if configured
            if (instanceMethodsConfig != null && instanceMethodsConfig.containsKey(def.getName())) {
                Object configObj = instanceMethodsConfig.get(def.getName());
                if (configObj instanceof Map) {
                    Map<String, Object> cfg = (Map<String, Object>) configObj;
                    if (cfg.containsKey("path")) serviceMap.put("boundPath", cfg.get("path"));
                    if (cfg.containsKey("httpMethod")) serviceMap.put("boundHttpMethod", cfg.get("httpMethod"));
                    if (cfg.containsKey("parameterBindings")) serviceMap.put("parameterBindings", cfg.get("parameterBindings"));
                }
            }

            effective.add(serviceMap);
        }

        return effective;
    }
}
