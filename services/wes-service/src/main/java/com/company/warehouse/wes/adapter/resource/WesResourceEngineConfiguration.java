package com.company.warehouse.wes.adapter.resource;

import org.platform.resourcemanager.api.ResourceClient;
import org.platform.resourcemanager.application.port.EventPublisherPort;
import org.platform.resourcemanager.application.port.ResourceRepositoryPort;
import org.platform.resourcemanager.application.service.ResourceLifecycleService;
import org.platform.resourcemanager.application.service.ResourceStateService;
import org.platform.resourcemanager.application.service.ResourceTopologyService;
import org.platform.resourcemanager.domain.arbitration.GangArbitrationEngine;
import org.platform.resourcemanager.domain.capability.CapabilityMatchmaker;
import org.platform.resourcemanager.domain.fsm.StateTransitionEngine;
import org.platform.resourcemanager.domain.topology.OperationalGraph;
import org.platform.resourcemanager.infrastructure.InMemoryResourceAuditLogger;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Spring configuration providing a production ResourceClient wired directly
 * to the PostgreSQL persistence adapter and Spring event publisher.
 */
@Configuration
public class WesResourceEngineConfiguration {

    @Bean
    public OperationalGraph operationalGraph() {
        return new OperationalGraph();
    }

    @Bean
    public StateTransitionEngine stateTransitionEngine() {
        return new StateTransitionEngine();
    }

    @Bean
    public GangArbitrationEngine gangArbitrationEngine(ResourceRepositoryPort repositoryPort) {
        return new GangArbitrationEngine(repositoryPort::findById);
    }

    @Bean
    public CapabilityMatchmaker capabilityMatchmaker() {
        return new CapabilityMatchmaker();
    }

    @Bean
    @Primary
    public ResourceClient resourceClient(
            ResourceRepositoryPort repositoryPort,
            EventPublisherPort eventPublisherPort,
            OperationalGraph operationalGraph,
            StateTransitionEngine stateTransitionEngine,
            GangArbitrationEngine arbitrationEngine,
            CapabilityMatchmaker matchmaker
    ) {
        InMemoryResourceAuditLogger auditLogger = new InMemoryResourceAuditLogger();

        ResourceLifecycleService lifecycleService = new ResourceLifecycleService(
                repositoryPort,
                auditLogger,
                eventPublisherPort
        );

        ResourceStateService stateService = new ResourceStateService(
                repositoryPort,
                stateTransitionEngine,
                operationalGraph,
                auditLogger,
                eventPublisherPort
        );

        ResourceTopologyService topologyService = new ResourceTopologyService(
                operationalGraph
        );

        return new ResourceClient(
                lifecycleService,
                stateService,
                topologyService,
                arbitrationEngine,
                matchmaker
        );
    }
}
