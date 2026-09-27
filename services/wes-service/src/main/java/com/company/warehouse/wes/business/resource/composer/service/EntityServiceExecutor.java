package com.company.warehouse.wes.business.resource.composer.service;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;

import java.util.Map;

/**
 * Strategy interface for executing an invokable method/service on an entity instance.
 */
public interface EntityServiceExecutor {

    /**
     * Determines whether this executor can handle the specified service, protocol, and category.
     */
    boolean supports(String serviceName, String protocol, String category);

    /**
     * Executes the service operation against the target entity instance.
     */
    MethodExecutionResult execute(ComposedEntityInstance instance, String serviceName, Map<String, Object> parameters);
}
