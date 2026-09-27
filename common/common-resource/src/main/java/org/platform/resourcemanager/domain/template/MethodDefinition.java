package org.platform.resourcemanager.domain.template;

import org.platform.resourcemanager.domain.capability.ParameterRule;

import java.io.Serializable;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Method specification for industrial and software resource configurations.
 * Supports standard PackML/IDTA methods as well as custom vendor/PLC execution methods.
 */
public record MethodDefinition(
        String name,
        MethodType type,
        SafetyTier safetyTier,
        boolean standard,
        String description,
        List<ParameterRule> parameterRules,
        Map<String, Object> samplePayload
) implements Serializable {

    public enum MethodType {
        AUTHENTICATION,
        DIAGNOSTIC,
        EXECUTION,
        TELEMETRY,
        CONTROL
    }

    public enum SafetyTier {
        READ_ONLY,
        OPERATIONAL,
        SAFETY_CRITICAL
    }

    public MethodDefinition {
        Objects.requireNonNull(name, "name must not be null");
        if (name.isBlank()) {
            throw new IllegalArgumentException("method name must not be blank");
        }
        type = (type == null) ? MethodType.EXECUTION : type;
        safetyTier = (safetyTier == null) ? SafetyTier.OPERATIONAL : safetyTier;
        description = (description == null) ? "" : description.trim();
        parameterRules = (parameterRules == null) ? List.of() : List.copyOf(parameterRules);
        samplePayload = (samplePayload == null) ? Map.of() : Map.copyOf(samplePayload);
    }

    public static MethodDefinition standard(String name, MethodType type, SafetyTier safetyTier, String description) {
        return new MethodDefinition(name, type, safetyTier, true, description, List.of(), Map.of());
    }

    public static MethodDefinition custom(String name, MethodType type, SafetyTier safetyTier, String description, List<ParameterRule> parameterRules) {
        return new MethodDefinition(name, type, safetyTier, false, description, parameterRules, Map.of());
    }
}
