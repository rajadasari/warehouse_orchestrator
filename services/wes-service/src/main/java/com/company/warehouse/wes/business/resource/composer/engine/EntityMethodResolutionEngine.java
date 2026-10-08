package com.company.warehouse.wes.business.resource.composer.engine;

import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import com.company.warehouse.wes.business.resource.composer.model.ServiceDefinition;
import com.company.warehouse.wes.data.entity.ResourceTemplateEntity;
import com.company.warehouse.wes.data.repository.ResourceTemplateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Industrial hierarchical method and capability resolution engine.
 * Resolves effective operational methods across the OOP inheritance chain:
 * 1. Base Archetype Service Definitions (System Templates in Java)
 * 2. Database Template Methods Schema (User Defined Templates in PostgreSQL)
 * 3. Instance Method Configurations and Overrides (Concrete Machine Instances)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntityMethodResolutionEngine {

    private final EntityArchetypeRegistry archetypeRegistry;
    private final ResourceTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    /**
     * Resolves the full effective methods map for a given resource instance.
     */
    public Map<String, Map<String, Object>> resolveMethods(String templateCode, Map<String, Object> instanceMethodsConfig) {
        Map<String, Map<String, Object>> resolved = new LinkedHashMap<>();

        // Tier 1 & 2: Base System Archetypes & Database Template Services (Iterating all combined templates)
        if (templateCode != null && !templateCode.trim().isEmpty()) {
            String[] codes = templateCode.split(",");
            for (String rawCode : codes) {
                String cleanCode = rawCode.trim().toUpperCase();
                if (cleanCode.isEmpty()) continue;

                // Tier 1: Base System Archetype Service Definitions (Code Registry)
                archetypeRegistry.getTemplate(cleanCode).ifPresent(tpl -> {
                    if (tpl.getServiceDefinitions() != null) {
                        for (ServiceDefinition s : tpl.getServiceDefinitions()) {
                            if (s.getName() == null || s.getName().isBlank()) continue;
                            String mName = s.getName().trim().toUpperCase();
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("methodName", mName);
                            m.put("displayName", s.getDisplayName() != null ? s.getDisplayName() : mName);
                            m.put("category", s.getCategory() != null ? s.getCategory() : "General");
                            m.put("description", s.getDescription() != null ? s.getDescription() : "");
                            m.put("sourceTemplate", cleanCode);
                            if (s.getPathTemplate() != null) m.put("path", s.getPathTemplate());
                            if (s.getHttpMethod() != null) m.put("httpMethod", s.getHttpMethod());
                            if (s.getParametersSchema() != null) m.put("parametersSchema", s.getParametersSchema());
                            if (s.getOutputSchema() != null) m.put("outputSchema", s.getOutputSchema());
                            m.put("origin", "SYSTEM_ARCHETYPE");
                            resolved.put(mName, m);
                        }
                    }
                });

                // Tier 2: Database Template Methods Schema (PostgreSQL wo.resource_template)
                try {
                    Optional<ResourceTemplateEntity> tplOpt = templateRepository.findByTemplateCode(cleanCode);
                    if (tplOpt.isPresent() && tplOpt.get().getMethodsSchema() != null) {
                        String schemaJson = tplOpt.get().getMethodsSchema();
                        if (!schemaJson.isBlank() && !schemaJson.equals("[]") && !schemaJson.equals("{}")) {
                            List<Map<String, Object>> schemaList = objectMapper.readValue(schemaJson, new TypeReference<>() {});
                            for (Map<String, Object> item : schemaList) {
                                String mName = item.containsKey("name") ? String.valueOf(item.get("name")).trim().toUpperCase()
                                        : item.containsKey("methodName") ? String.valueOf(item.get("methodName")).trim().toUpperCase() : null;
                                if (mName != null && !mName.isBlank()) {
                                    Map<String, Object> m = resolved.computeIfAbsent(mName, k -> new LinkedHashMap<>());
                                    m.putAll(item);
                                    m.put("methodName", mName);
                                    m.put("sourceTemplate", cleanCode);
                                    m.put("origin", "TEMPLATE");
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse methods_schema for template '{}': {}", cleanCode, e.getMessage());
                }
            }
        }

        // Tier 3: Instance Methods Config and Overrides
        if (instanceMethodsConfig != null && !instanceMethodsConfig.isEmpty()) {
            for (Map.Entry<String, Object> entry : instanceMethodsConfig.entrySet()) {
                if (entry.getKey() == null || entry.getKey().isBlank()) continue;
                String mName = entry.getKey().trim().toUpperCase();

                if (entry.getValue() instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> overrideConfig = (Map<String, Object>) entry.getValue();
                    Map<String, Object> existing = resolved.get(mName);
                    if (existing != null) {
                        existing.putAll(overrideConfig);
                        existing.put("origin", "INSTANCE_OVERRIDE");
                    } else {
                        Map<String, Object> customMethod = new LinkedHashMap<>(overrideConfig);
                        customMethod.put("methodName", mName);
                        customMethod.put("origin", "INSTANCE_CUSTOM");
                        resolved.put(mName, customMethod);
                    }
                } else if (entry.getValue() != null) {
                    Map<String, Object> m = resolved.computeIfAbsent(mName, k -> new LinkedHashMap<>());
                    m.put("value", entry.getValue());
                    m.putIfAbsent("methodName", mName);
                    m.putIfAbsent("origin", "INSTANCE_CUSTOM");
                }
            }
        }

        return Collections.unmodifiableMap(resolved);
    }

    /**
     * Resolves effective methods from raw methodsConfig JSON string.
     */
    public Map<String, Map<String, Object>> resolveMethodsFromJson(String templateCode, String methodsConfigJson) {
        Map<String, Object> parsedConfig = Collections.emptyMap();
        if (methodsConfigJson != null && !methodsConfigJson.isBlank() && !methodsConfigJson.equals("{}")) {
            try {
                parsedConfig = objectMapper.readValue(methodsConfigJson, new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("Failed to deserialize methodsConfig for template {}: {}", templateCode, e.getMessage());
            }
        }
        return resolveMethods(templateCode, parsedConfig);
    }

    /**
     * Returns the set of all effective capability/method names available on the resource instance.
     */
    public Set<String> resolveCapabilities(String templateCode, Map<String, Object> instanceMethodsConfig) {
        return new TreeSet<>(resolveMethods(templateCode, instanceMethodsConfig).keySet());
    }

    /**
     * Returns the set of all effective capability/method names from raw methodsConfig JSON string.
     */
    public Set<String> resolveCapabilitiesFromJson(String templateCode, String methodsConfigJson) {
        return new TreeSet<>(resolveMethodsFromJson(templateCode, methodsConfigJson).keySet());
    }
}
