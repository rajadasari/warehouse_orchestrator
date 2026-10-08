package org.platform.resourcemanager.application.service;

import org.platform.resourcemanager.api.exception.ResourceNotFoundException;
import org.platform.resourcemanager.application.port.EventPublisherPort;
import org.platform.resourcemanager.application.port.ResourceAuditLoggerPort;
import org.platform.resourcemanager.application.port.ResourceRepositoryPort;
import org.platform.resourcemanager.domain.event.ResourceStateChangedEvent;
import org.platform.resourcemanager.domain.fsm.*;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.topology.OperationalGraph;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Application service managing PackML / SEMI E10 state transitions and safety propagation.
 */
public class ResourceStateService {

    private static final Logger log = LoggerFactory.getLogger(ResourceStateService.class);

    private final ResourceRepositoryPort repository;
    private final StateTransitionEngine transitionEngine;
    private final OperationalGraph topologyGraph;
    private final ResourceAuditLoggerPort auditLogger;
    private final EventPublisherPort eventPublisher;

    public ResourceStateService(
            ResourceRepositoryPort repository,
            StateTransitionEngine transitionEngine,
            OperationalGraph topologyGraph,
            ResourceAuditLoggerPort auditLogger,
            EventPublisherPort eventPublisher
    ) {
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
        this.transitionEngine = Objects.requireNonNull(transitionEngine, "transitionEngine must not be null");
        this.topologyGraph = Objects.requireNonNull(topologyGraph, "topologyGraph must not be null");
        this.auditLogger = Objects.requireNonNull(auditLogger, "auditLogger must not be null");
        this.eventPublisher = Objects.requireNonNull(eventPublisher, "eventPublisher must not be null");
    }

    public Resource transition(ResourceId id, StateTrigger trigger, long expectedVersion) {
        return transition(id, trigger, expectedVersion, null);
    }

    public Resource transition(ResourceId id, StateTrigger trigger, long expectedVersion, StateProfile profile) {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(trigger, "trigger must not be null");

        Resource resource = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException(id));
        ResourceState oldState = resource.getState();
        ResourceState nextState = transitionEngine.fire(id, oldState, trigger, profile);

        resource.updateState(nextState, expectedVersion);
        repository.save(resource);

        auditLogger.log(id, "STATE_TRANSITION",
                String.format("State changed from %s to %s via trigger %s", oldState.name(), nextState.name(), trigger.name()),
                resource.getVersion());

        eventPublisher.publish(ResourceStateChangedEvent.of(id, oldState, nextState, trigger));

        // If emergency abort or fault, cascade to interlocked safety neighbors
        if (trigger instanceof CoreTriggers.Abort || trigger instanceof CoreTriggers.Fault) {
            cascadeSafetyStop(id, trigger.name());
        }

        return resource;
    }

    private void cascadeSafetyStop(ResourceId originId, String triggerName) {
        Set<ResourceId> interlocked = topologyGraph.findInterlockedResources(originId);
        for (ResourceId neighborId : interlocked) {
            boolean abortedSuccessfully = false;
            Exception lastException = null;
            for (int attempt = 1; attempt <= 3 && !abortedSuccessfully; attempt++) {
                Optional<Resource> neighborOpt = repository.findById(neighborId);
                if (neighborOpt.isEmpty()) {
                    break;
                }
                Resource neighbor = neighborOpt.get();
                ResourceState oldState = neighbor.getState();
                if (oldState instanceof CoreStates.Aborted || oldState instanceof CoreStates.Faulted) {
                    abortedSuccessfully = true;
                    break;
                }
                try {
                    ResourceState aborted = new CoreStates.Aborted();
                    neighbor.updateState(aborted, neighbor.getVersion());
                    repository.save(neighbor);
                    auditLogger.log(neighborId, "SAFETY_INTERLOCK_CASCADE",
                            "Cascaded abort from origin " + originId + " (trigger: " + triggerName + ")",
                            neighbor.getVersion());
                    eventPublisher.publish(ResourceStateChangedEvent.of(neighborId, oldState, aborted,
                            CoreTriggers.abort("Interlock cascade from " + originId)));
                    abortedSuccessfully = true;
                    log.warn("Successfully cascaded safety abort to interlocked neighborId={} from originId={}", neighborId, originId);
                } catch (Exception ex) {
                    lastException = ex;
                    log.warn("Retrying safety abort for neighborId={} from originId={} (attempt {}/3): {}",
                            neighborId, originId, attempt, ex.getMessage());
                }
            }
            if (!abortedSuccessfully && lastException != null) {
                log.error("SAFETY_CRITICAL: Failed to abort interlocked neighborId={} during safety cascade from originId={}",
                        neighborId, originId, lastException);
            }
        }
    }
}
