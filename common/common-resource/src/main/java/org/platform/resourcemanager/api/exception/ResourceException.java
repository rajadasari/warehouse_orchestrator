package org.platform.resourcemanager.api.exception;

/**
 * Base runtime exception for all Resource Manager domain and operation failures.
 */
public class ResourceException extends RuntimeException {

    public ResourceException(String message) {
        super(message);
    }

    public ResourceException(String message, Throwable cause) {
        super(message, cause);
    }
}
