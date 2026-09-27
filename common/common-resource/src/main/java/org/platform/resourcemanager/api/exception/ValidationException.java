package org.platform.resourcemanager.api.exception;

import java.util.Collections;
import java.util.List;

/**
 * Thrown when domain validation invariants or capability parameter rules fail.
 */
public class ValidationException extends ResourceException {

    private final List<String> errors;

    public ValidationException(String message) {
        super(message);
        this.errors = List.of(message);
    }

    public ValidationException(String message, List<String> errors) {
        super(message + ": " + String.join(", ", errors));
        this.errors = errors != null ? List.copyOf(errors) : List.of();
    }

    public List<String> getErrors() {
        return Collections.unmodifiableList(errors);
    }
}
