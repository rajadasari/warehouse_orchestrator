package com.company.warehouse.common.industrial.config;

import com.company.warehouse.common.industrial.gateway.SpringDeviceGatewayFactory;
import com.company.warehouse.common.industrial.scenario.IndustrialScenarioManager;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot AutoConfiguration exposing industrial automation components:
 * - SpringDeviceGatewayFactory (OPC UA and Modbus connection caching)
 * - IndustrialScenarioManager (Reactive scenario rule pipeline orchestration)
 */
@Configuration
public class IndustrialAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(SpringDeviceGatewayFactory.class)
    public SpringDeviceGatewayFactory deviceGatewayFactory() {
        return new SpringDeviceGatewayFactory();
    }

    @Bean
    @ConditionalOnMissingBean(IndustrialScenarioManager.class)
    public IndustrialScenarioManager industrialScenarioManager(SpringDeviceGatewayFactory factory) {
        return new IndustrialScenarioManager(factory);
    }
}
