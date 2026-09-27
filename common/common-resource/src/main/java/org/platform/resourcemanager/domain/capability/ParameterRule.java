package org.platform.resourcemanager.domain.capability;

import java.util.Objects;
import java.util.function.Predicate;

/**
 * Parameter validation rule for dynamic capability invocation arguments.
 */
public record ParameterRule(
        String name,
        Class<?> expectedType,
        boolean required,
        Predicate<Object> customValidator
) {

    public ParameterRule {
        Objects.requireNonNull(name, "name must not be null");
        Objects.requireNonNull(expectedType, "expectedType must not be null");
        customValidator = (customValidator == null) ? obj -> true : customValidator;
    }

    public static ParameterRule required(String name, Class<?> type) {
        return new ParameterRule(name, type, true, obj -> true);
    }

    public static ParameterRule optional(String name, Class<?> type) {
        return new ParameterRule(name, type, false, obj -> true);
    }

    public static ParameterRule requiredWithValidator(String name, Class<?> type, Predicate<Object> validator) {
        return new ParameterRule(name, type, true, validator);
    }
}
