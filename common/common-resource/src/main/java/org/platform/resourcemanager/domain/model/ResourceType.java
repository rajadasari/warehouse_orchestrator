package org.platform.resourcemanager.domain.model;

import java.io.Serializable;

/**
 * Open interface allowing dynamic and extensible resource classifications
 * without requiring library recompilation.
 */
public interface ResourceType extends Serializable {

    String code();

    String description();

    static ResourceType custom(String code, String description) {
        return new CustomResourceType(code, description);
    }
}

record CustomResourceType(String code, String description) implements ResourceType {
    CustomResourceType {
        java.util.Objects.requireNonNull(code, "code must not be null");
        if (code.isBlank()) {
            throw new IllegalArgumentException("code must not be blank");
        }
    }
}
