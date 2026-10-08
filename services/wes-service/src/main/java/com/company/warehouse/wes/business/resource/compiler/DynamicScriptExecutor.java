package com.company.warehouse.wes.business.resource.compiler;

import java.util.List;
import java.util.Map;

/**
 * Common SPI for dynamic in-memory script engines (Java Janino, Python PyCode, etc.).
 * Allows seamless multi-language execution in Digital Twin methods with zero coupling.
 */
public interface DynamicScriptExecutor {

    /**
     * Checks if this executor supports the specified scripting language.
     *
     * @param language e.g. "JAVA", "PYTHON", "PY"
     * @return true if supported
     */
    boolean supports(String language);

    /**
     * Executes the dynamic script against the provided Digital Twin execution context.
     *
     * @param script     The user source code
     * @param properties The in-memory Digital Twin state properties (read/write)
     * @param params     Invocation arguments passed to the method
     * @param resources  Cross-resource references
     * @param traceLogs  Diagnostics trace log collector
     * @return The computed result object, or null
     * @throws Exception If compilation, syntax, security, or runtime evaluation fails
     */
    Object execute(
            String script,
            Map<String, Object> properties,
            Map<String, Object> params,
            Map<String, Object> resources,
            List<MethodTraceLogEntry> traceLogs
    ) throws Exception;

    /**
     * Clears compiled bytecode caches.
     */
    default void clearCache() {}
}
