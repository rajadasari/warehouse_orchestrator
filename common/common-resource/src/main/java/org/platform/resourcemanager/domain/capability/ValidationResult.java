package org.platform.resourcemanager.domain.capability;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;

/**
 * Result record from parameter and invariant validation checks.
 */
public record ValidationResult(boolean isValid, List<String> errorMessages) implements Serializable {

    public ValidationResult {
        errorMessages = (errorMessages == null) ? List.of() : List.copyOf(errorMessages);
    }

    public static ValidationResult valid() {
        return new ValidationResult(true, List.of());
    }

    public static ValidationResult invalid(List<String> errors) {
        return new ValidationResult(false, errors);
    }

    public static ValidationResult invalid(String error) {
        return new ValidationResult(false, List.of(error));
    }

    public List<String> getErrorMessages() {
        return Collections.unmodifiableList(errorMessages);
    }
}
