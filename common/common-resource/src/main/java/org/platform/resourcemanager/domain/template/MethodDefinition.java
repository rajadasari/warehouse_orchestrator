package org.platform.resourcemanager.domain.template;

import org.platform.resourcemanager.domain.capability.ParameterRule;

import java.io.Serializable;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Snippet specification for industrial and software resource configurations.
 * Supports standard system-level snippets as well as custom execution snippets.
 */
public record MethodDefinition(
        String name,
        String displayName,
        String category,
        boolean standard,
        String description,
        List<ParameterRule> parameterRules,
        Map<String, Object> outputSchema
) implements Serializable {

    public MethodDefinition {
        Objects.requireNonNull(name, "name must not be null");
        if (name.isBlank()) {
            throw new IllegalArgumentException("method name must not be blank");
        }
        displayName = (displayName == null || displayName.isBlank()) ? name : displayName.trim();
        category = (category == null || category.isBlank()) ? "GENERAL" : category.trim();
        description = (description == null) ? "" : description.trim();
        parameterRules = (parameterRules == null) ? List.of() : List.copyOf(parameterRules);
        outputSchema = (outputSchema == null) ? Map.of() : Map.copyOf(outputSchema);
    }

    public static MethodDefinition standard(String name, String description) {
        return new MethodDefinition(name, name, "SYSTEM", true, description, List.of(), Map.of());
    }

    public static MethodDefinition standard(String name, String category, String description) {
        return new MethodDefinition(name, name, category, true, description, List.of(), Map.of());
    }

    public static MethodDefinition custom(String name, String description, List<ParameterRule> parameterRules) {
        return new MethodDefinition(name, name, "CUSTOM", false, description, parameterRules, Map.of());
    }
}
