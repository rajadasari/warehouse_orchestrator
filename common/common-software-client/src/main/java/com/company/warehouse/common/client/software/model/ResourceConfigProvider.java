package com.company.warehouse.common.client.software.model;

import java.util.Optional;

/**
 * Pluggable provider interface to resolve resource connection details
 * without coupling the software client to any specific database or service.
 */
public interface ResourceConfigProvider {

    /**
     * Resolves connection endpoint details and credentials for a given target resource ID.
     */
    Optional<ResourceConnectionConfig> getResourceConfig(String resourceId);

    /**
     * Resolves IP / host for a given target resource ID.
     */
    Optional<String> getResourceIp(String resourceId);
}
