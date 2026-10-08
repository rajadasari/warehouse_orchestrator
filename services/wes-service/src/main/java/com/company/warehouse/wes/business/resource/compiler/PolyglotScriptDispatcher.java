package com.company.warehouse.wes.business.resource.compiler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Polyglot script dispatcher that routes method execution to the appropriate
 * script engine (e.g. Java Janino or Python PyCode) based on the method language.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PolyglotScriptDispatcher {

    private final List<DynamicScriptExecutor> executors;

    /**
     * Finds the appropriate executor for the given language.
     * Defaults to Java if language is not specified.
     */
    public DynamicScriptExecutor getExecutor(String language) {
        String targetLang = (language != null && !language.isBlank()) ? language.trim().toUpperCase() : "JAVA";

        for (DynamicScriptExecutor executor : executors) {
            if (executor.supports(targetLang)) {
                return executor;
            }
        }

        throw new UnsupportedOperationException(
                "No script executor registered for language '" + targetLang + "'. "
                        + "Available executors: " + executors.stream().map(e -> e.getClass().getSimpleName()).toList()
        );
    }

    /**
     * Executes the script using the matching engine.
     */
    public Object execute(
            String language,
            String script,
            Map<String, Object> properties,
            Map<String, Object> params,
            Map<String, Object> resources,
            List<MethodTraceLogEntry> traceLogs
    ) throws Exception {
        DynamicScriptExecutor executor = getExecutor(language);
        return executor.execute(script, properties, params, resources, traceLogs);
    }

    /**
     * Clears caches across all registered script executors.
     */
    public void clearAllCaches() {
        for (DynamicScriptExecutor executor : executors) {
            try {
                executor.clearCache();
            } catch (Exception e) {
                log.warn("Failed to clear cache on executor {}: {}", executor.getClass().getSimpleName(), e.getMessage());
            }
        }
    }
}
