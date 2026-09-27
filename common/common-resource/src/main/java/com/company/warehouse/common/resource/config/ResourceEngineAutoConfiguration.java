package com.company.warehouse.common.resource.config;

import org.platform.resourcemanager.api.ResourceClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot AutoConfiguration exposing the upstream ResourceClient facade.
 * Allows microservices (WES, WCS, ASRS, Fleet) to inject ResourceClient cleanly.
 */
@Configuration
public class ResourceEngineAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(ResourceClient.class)
    public ResourceClient resourceClient() {
        return ResourceClient.createInMemory();
    }
}
