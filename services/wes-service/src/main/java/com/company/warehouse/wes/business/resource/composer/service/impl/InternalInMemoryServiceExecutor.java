package com.company.warehouse.wes.business.resource.composer.service.impl;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.service.EntityServiceExecutor;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import com.company.warehouse.wes.business.resource.compiler.DynamicJavaMethodCompiler;
import com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.platform.resourcemanager.api.ResourceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service executor for passive, in-memory, push-only, and event-driven resources.
 * Handles property updates, dynamic state evaluations, and in-memory methods
 * without requiring external network socket or fieldbus connections.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InternalInMemoryServiceExecutor implements EntityServiceExecutor {

    private final ResourceRepository resourceRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private ResourceClient resourceClient;

    @Autowired(required = false)
    private DynamicJavaMethodCompiler dynamicJavaCompiler = new DynamicJavaMethodCompiler();

    @Autowired(required = false)
    private com.company.warehouse.wes.business.resource.compiler.PolyglotScriptDispatcher polyglotDispatcher;

    private static final Set<String> PASSIVE_PROTOCOLS = Set.of(
            "INTERNAL", "IN_MEMORY", "PUSH", "EVENT_DRIVEN", "PASSIVE", "LOCAL", "NONE", "LOGICAL"
    );

    private static final Set<String> IN_MEMORY_METHODS = Set.of(
            "UPDATE_PROPERTIES", "PATCH_PROPERTIES", "SET_PROPERTY",
            "GET_PROPERTIES", "GET_PROPERTY", "COMPUTE", "CALCULATE",
            "EVALUATE", "NOOP", "STATUS", "RECORD_EVENT"
    );

    @Override
    public boolean supports(String serviceName, String protocol, String category) {
        if (serviceName == null && protocol == null) return false;

        String p = protocol != null ? protocol.trim().toUpperCase() : "";
        String mName = serviceName != null ? serviceName.trim().toUpperCase() : "";

        // Standalone / protocol-free digital twins route ALL method calls internally
        if (p.isEmpty() || PASSIVE_PROTOCOLS.contains(p)) {
            return true;
        }

        // Generic property & calculation methods can run in-memory unless an industrial fieldbus is required
        if (IN_MEMORY_METHODS.contains(mName)) {
            return !p.contains("OPC") && !p.contains("MODBUS") && !p.contains("S7");
        }

        return false;
    }

    @Override
    public MethodExecutionResult execute(ComposedEntityInstance instance, String serviceName, Map<String, Object> parameters) {
        long start = System.currentTimeMillis();
        String resourceId = instance.getResourceId();
        String mName = serviceName != null ? serviceName.trim().toUpperCase() : "UPDATE_PROPERTIES";
        Map<String, Object> params = parameters != null ? parameters : Collections.emptyMap();

        log.info("Executing in-memory method '{}' for resource '{}'", mName, resourceId);

        try {
            // 1. Check if dynamic script (Java or Python) is provided either in params or in method configuration
            String script = extractScript(instance, mName, params);
            if (script != null && !script.trim().isEmpty()) {
                String language = extractLanguage(instance, mName, params);
                return executeDynamicMethod(instance, mName, language, script, params, start);
            }

            return switch (mName) {
                case "UPDATE_PROPERTIES", "PATCH_PROPERTIES", "SET_PROPERTY" ->
                        handleUpdateProperties(instance, params, start);
                case "GET_PROPERTIES", "GET_PROPERTY" ->
                        handleGetProperties(instance, params, start);
                case "COMPUTE", "CALCULATE", "EVALUATE" ->
                        handleCompute(instance, mName, params, start);
                default ->
                        handleGenericInMemoryAction(instance, mName, params, start);
            };
        } catch (Exception e) {
            log.error("Execution of in-memory method '{}' failed on resource '{}': {}", mName, resourceId, e.getMessage(), e);
            return MethodExecutionResult.builder()
                    .success(false)
                    .resourceId(resourceId)
                    .methodName(mName)
                    .statusCode(500)
                    .message("Internal method execution error: " + e.getMessage())
                    .executionTimeMs(System.currentTimeMillis() - start)
                    .build();
        }
    }

    private MethodExecutionResult handleUpdateProperties(ComposedEntityInstance instance, Map<String, Object> params, long start) {
        String resourceId = instance.getResourceId();
        Map<String, Object> propsToApply = extractPropertiesMap(params);

        Map<String, Object> updatedCustom = new HashMap<>(instance.getCustomProperties());
        updatedCustom.putAll(propsToApply);

        // Persist to database if repository has the resource
        Optional<ResourceEntity> entityOpt = resourceRepository.findByResourceId(resourceId);
        if (entityOpt.isPresent()) {
            ResourceEntity entity = entityOpt.get();
            Map<String, Object> existing = deserializeProps(entity.getCustomProperties());
            existing.putAll(propsToApply);
            entity.setCustomProperties(serializeProps(existing));
            resourceRepository.saveAndFlush(entity);
            log.debug("Persisted updated properties for in-memory resource '{}'", resourceId);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("resourceId", resourceId);
        data.put("updatedProperties", propsToApply);
        data.put("effectiveProperties", updatedCustom);
        data.put("timestamp", System.currentTimeMillis());

        return MethodExecutionResult.builder()
                .success(true)
                .resourceId(resourceId)
                .methodName("UPDATE_PROPERTIES")
                .statusCode(200)
                .message("In-memory properties updated successfully")
                .data(data)
                .executionTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private MethodExecutionResult handleGetProperties(ComposedEntityInstance instance, Map<String, Object> params, long start) {
        String resourceId = instance.getResourceId();
        Map<String, Object> effective = new HashMap<>(instance.getEffectiveProperties());

        String specificKey = params.containsKey("key") ? String.valueOf(params.get("key")) : null;
        Object val = specificKey != null ? effective.get(specificKey) : effective;

        Map<String, Object> data = new HashMap<>();
        data.put("resourceId", resourceId);
        data.put("result", val);

        return MethodExecutionResult.builder()
                .success(true)
                .resourceId(resourceId)
                .methodName("GET_PROPERTIES")
                .statusCode(200)
                .message("Retrieved properties successfully")
                .data(data)
                .executionTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private MethodExecutionResult handleCompute(ComposedEntityInstance instance, String methodName, Map<String, Object> params, long start) {
        String resourceId = instance.getResourceId();
        Map<String, Object> data = new HashMap<>();
        data.put("resourceId", resourceId);
        data.put("method", methodName);
        data.put("inputs", params);
        data.put("computedAt", System.currentTimeMillis());
        data.put("status", "COMPLETED");

        return MethodExecutionResult.builder()
                .success(true)
                .resourceId(resourceId)
                .methodName(methodName)
                .statusCode(200)
                .message("Computed in-memory logic successfully")
                .data(data)
                .executionTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private MethodExecutionResult handleGenericInMemoryAction(ComposedEntityInstance instance, String methodName, Map<String, Object> params, long start) {
        String resourceId = instance.getResourceId();

        // If parameters contain property updates, apply them as well
        if (!params.isEmpty()) {
            handleUpdateProperties(instance, params, start);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("resourceId", resourceId);
        data.put("action", methodName);
        data.put("payload", params);
        data.put("executedAt", System.currentTimeMillis());

        return MethodExecutionResult.builder()
                .success(true)
                .resourceId(resourceId)
                .methodName(methodName)
                .statusCode(200)
                .message("Executed in-memory action '" + methodName + "' successfully")
                .data(data)
                .executionTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    private String extractScript(ComposedEntityInstance instance, String methodName, Map<String, Object> params) {
        if (params.containsKey("script") && params.get("script") != null) {
            return String.valueOf(params.get("script"));
        }
        if (params.containsKey("javaCode") && params.get("javaCode") != null) {
            return String.valueOf(params.get("javaCode"));
        }
        if (params.containsKey("pythonCode") && params.get("pythonCode") != null) {
            return String.valueOf(params.get("pythonCode"));
        }
        Object cfg = findMethodConfig(instance, methodName);
        if (cfg instanceof Map<?, ?> cfgMap) {
            if (cfgMap.containsKey("script") && cfgMap.get("script") != null) {
                return String.valueOf(cfgMap.get("script"));
            }
            if (cfgMap.containsKey("javaCode") && cfgMap.get("javaCode") != null) {
                return String.valueOf(cfgMap.get("javaCode"));
            }
            if (cfgMap.containsKey("pythonCode") && cfgMap.get("pythonCode") != null) {
                return String.valueOf(cfgMap.get("pythonCode"));
            }
        }
        return null;
    }

    private String extractLanguage(ComposedEntityInstance instance, String methodName, Map<String, Object> params) {
        if (params.containsKey("language") && params.get("language") != null) {
            return String.valueOf(params.get("language"));
        }
        Object cfg = findMethodConfig(instance, methodName);
        if (cfg instanceof Map<?, ?> cfgMap && cfgMap.containsKey("language") && cfgMap.get("language") != null) {
            return String.valueOf(cfgMap.get("language"));
        }
        return "JAVA";
    }

    private Object findMethodConfig(ComposedEntityInstance instance, String methodName) {
        if (instance.getMethodsConfig() == null || methodName == null) {
            return null;
        }
        Object cfg = instance.getMethodsConfig().get(methodName);
        if (cfg == null) {
            cfg = instance.getMethodsConfig().get(methodName.toUpperCase());
        }
        if (cfg == null) {
            cfg = instance.getMethodsConfig().get(methodName.toLowerCase());
        }
        return cfg;
    }

    private MethodExecutionResult executeDynamicMethod(
            ComposedEntityInstance instance,
            String methodName,
            String language,
            String script,
            Map<String, Object> params,
            long start
    ) throws Exception {
        String resourceId = instance.getResourceId();
        String effectiveLang = language != null && !language.isBlank() ? language.trim().toUpperCase() : "JAVA";
        List<MethodTraceLogEntry> traceLogs = new ArrayList<>();
        traceLogs.add(MethodTraceLogEntry.info("INIT", "Starting dynamic " + effectiveLang + " execution for method: " + methodName));

        // In-memory properties for zero-DB reads during runtime execution
        Map<String, Object> workingProperties = new ConcurrentHashMap<>(
                instance.getEffectiveProperties() != null ? instance.getEffectiveProperties() : Collections.emptyMap()
        );
        Map<String, Object> initialSnapshot = new HashMap<>(workingProperties);

        // Execute via polyglot dispatcher if available, otherwise fallback to Java compiler
        Object result;
        if (polyglotDispatcher != null) {
            result = polyglotDispatcher.execute(effectiveLang, script, workingProperties, params, Collections.emptyMap(), traceLogs);
        } else {
            result = dynamicJavaCompiler.execute(script, workingProperties, params, Collections.emptyMap(), traceLogs);
        }

        // Check write-back target property
        String storeProp = null;
        if (params.containsKey("storeResultToProperty") && params.get("storeResultToProperty") != null) {
            storeProp = String.valueOf(params.get("storeResultToProperty"));
        } else {
            Object cfg = findMethodConfig(instance, methodName);
            if (cfg instanceof Map<?, ?> cfgMap && cfgMap.containsKey("storeResultToProperty") && cfgMap.get("storeResultToProperty") != null) {
                storeProp = String.valueOf(cfgMap.get("storeResultToProperty"));
            }
        }

        Map<String, Object> updatedProps = new HashMap<>();
        if (storeProp != null && !storeProp.trim().isEmpty() && result != null) {
            workingProperties.put(storeProp, result);
            updatedProps.put(storeProp, result);
            traceLogs.add(MethodTraceLogEntry.info("WRITE_BACK", "Stored result to property '" + storeProp + "': " + result));
        }

        // Detect any properties directly modified by the dynamic script
        for (Map.Entry<String, Object> entry : workingProperties.entrySet()) {
            if (!Objects.equals(initialSnapshot.get(entry.getKey()), entry.getValue())) {
                updatedProps.put(entry.getKey(), entry.getValue());
                traceLogs.add(MethodTraceLogEntry.info("PROPERTY_MODIFIED", "Property '" + entry.getKey() + "' updated to: " + entry.getValue()));
            }
        }

        // Write-behind persistence (zero latency hit to JVM cache)
        if (!updatedProps.isEmpty()) {
            handleUpdateProperties(instance, updatedProps, start);
        }

        long execTime = System.currentTimeMillis() - start;
        traceLogs.add(MethodTraceLogEntry.info("COMPLETE", "Executed in " + execTime + "ms. Result: " + result));

        return MethodExecutionResult.builder()
                .success(true)
                .resourceId(resourceId)
                .methodName(methodName)
                .statusCode(200)
                .message("Dynamic " + effectiveLang + " method '" + methodName + "' executed successfully")
                .data(result)
                .updatedProperties(updatedProps)
                .traceLogs(traceLogs)
                .executionTimeMs(execTime)
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractPropertiesMap(Map<String, Object> params) {
        if (params.containsKey("properties") && params.get("properties") instanceof Map) {
            return (Map<String, Object>) params.get("properties");
        }
        if (params.containsKey("customProperties") && params.get("customProperties") instanceof Map) {
            return (Map<String, Object>) params.get("customProperties");
        }
        return params;
    }

    private Map<String, Object> deserializeProps(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String serializeProps(Map<String, Object> props) {
        if (props == null || props.isEmpty()) return "{}";
        try {
            return objectMapper.writeValueAsString(props);
        } catch (Exception e) {
            return "{}";
        }
    }
}
