package org.platform.resourcemanager.api;

import org.platform.resourcemanager.api.dto.*;
import org.platform.resourcemanager.application.service.ResourceLifecycleService;
import org.platform.resourcemanager.application.service.ResourceStateService;
import org.platform.resourcemanager.application.service.ResourceTopologyService;
import org.platform.resourcemanager.domain.arbitration.AllocationRequest;
import org.platform.resourcemanager.domain.arbitration.AllocationResult;
import org.platform.resourcemanager.domain.arbitration.GangArbitrationEngine;
import org.platform.resourcemanager.domain.builder.ResourceBuilder;
import org.platform.resourcemanager.domain.capability.CapabilityMatchmaker;
import org.platform.resourcemanager.domain.fsm.CoreTriggers;
import org.platform.resourcemanager.domain.fsm.StateTransitionEngine;
import org.platform.resourcemanager.domain.fsm.StateTrigger;
import org.platform.resourcemanager.domain.model.*;
import org.platform.resourcemanager.domain.topology.OperationalGraph;
import org.platform.resourcemanager.domain.topology.RelationshipType;
import org.platform.resourcemanager.infrastructure.InMemoryEventPublisher;
import org.platform.resourcemanager.infrastructure.InMemoryResourceAuditLogger;
import org.platform.resourcemanager.infrastructure.InMemoryResourceRepository;

import org.platform.resourcemanager.application.service.ResourceTemplateService;
import org.platform.resourcemanager.domain.template.ResourceTemplate;
import org.platform.resourcemanager.infrastructure.InMemoryResourceTemplateRepository;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Unified high-level client facade for interacting with the Resource Management micro-kernel.
 */
public class ResourceClient {

    private final ResourceLifecycleService lifecycleService;
    private final ResourceStateService stateService;
    private final ResourceTopologyService topologyService;
    private final GangArbitrationEngine arbitrationEngine;
    private final CapabilityMatchmaker matchmaker;
    private final ResourceTemplateService templateService;
    private final org.platform.resourcemanager.application.port.ResourceShapeRepositoryPort shapeRepository;
    private final org.platform.resourcemanager.domain.rule.RuleSubscriptionEngine ruleEngine;
    private final org.platform.resourcemanager.application.port.TelemetryHistorianPort telemetryStore;

    public ResourceClient(
            ResourceLifecycleService lifecycleService,
            ResourceStateService stateService,
            ResourceTopologyService topologyService,
            GangArbitrationEngine arbitrationEngine,
            CapabilityMatchmaker matchmaker,
            ResourceTemplateService templateService,
            org.platform.resourcemanager.application.port.ResourceShapeRepositoryPort shapeRepository,
            org.platform.resourcemanager.domain.rule.RuleSubscriptionEngine ruleEngine,
            org.platform.resourcemanager.application.port.TelemetryHistorianPort telemetryStore
    ) {
        this.lifecycleService = Objects.requireNonNull(lifecycleService);
        this.stateService = Objects.requireNonNull(stateService);
        this.topologyService = Objects.requireNonNull(topologyService);
        this.arbitrationEngine = Objects.requireNonNull(arbitrationEngine);
        this.matchmaker = Objects.requireNonNull(matchmaker);
        this.templateService = Objects.requireNonNull(templateService);
        this.shapeRepository = Objects.requireNonNull(shapeRepository);
        this.ruleEngine = Objects.requireNonNull(ruleEngine);
        this.telemetryStore = Objects.requireNonNull(telemetryStore);
    }

    public ResourceClient(
            ResourceLifecycleService lifecycleService,
            ResourceStateService stateService,
            ResourceTopologyService topologyService,
            GangArbitrationEngine arbitrationEngine,
            CapabilityMatchmaker matchmaker,
            ResourceTemplateService templateService
    ) {
        this(lifecycleService, stateService, topologyService, arbitrationEngine, matchmaker, templateService,
                new org.platform.resourcemanager.infrastructure.InMemoryResourceShapeRepository(),
                new org.platform.resourcemanager.domain.rule.RuleSubscriptionEngine(),
                new org.platform.resourcemanager.infrastructure.telemetry.RingBufferTelemetryStore());
    }

    public ResourceClient(
            ResourceLifecycleService lifecycleService,
            ResourceStateService stateService,
            ResourceTopologyService topologyService,
            GangArbitrationEngine arbitrationEngine,
            CapabilityMatchmaker matchmaker
    ) {
        this(lifecycleService, stateService, topologyService, arbitrationEngine, matchmaker,
                new ResourceTemplateService(
                        new InMemoryResourceTemplateRepository(),
                        lifecycleService.getRepository(),
                        lifecycleService,
                        new InMemoryResourceAuditLogger()
                ));
    }

    public static ResourceClient createInMemory() {
        InMemoryResourceRepository repository = new InMemoryResourceRepository();
        InMemoryResourceAuditLogger auditLogger = new InMemoryResourceAuditLogger();
        InMemoryEventPublisher eventPublisher = new InMemoryEventPublisher();
        InMemoryResourceTemplateRepository templateRepo = new InMemoryResourceTemplateRepository();
        org.platform.resourcemanager.infrastructure.InMemoryResourceShapeRepository shapeRepo = new org.platform.resourcemanager.infrastructure.InMemoryResourceShapeRepository();
        org.platform.resourcemanager.domain.rule.RuleSubscriptionEngine ruleEngine = new org.platform.resourcemanager.domain.rule.RuleSubscriptionEngine();
        org.platform.resourcemanager.infrastructure.telemetry.RingBufferTelemetryStore telemetryStore = new org.platform.resourcemanager.infrastructure.telemetry.RingBufferTelemetryStore();
        OperationalGraph graph = new OperationalGraph();
        StateTransitionEngine fsmEngine = new StateTransitionEngine();

        ResourceLifecycleService lifecycle = new ResourceLifecycleService(repository, auditLogger, eventPublisher);
        ResourceStateService state = new ResourceStateService(repository, fsmEngine, graph, auditLogger, eventPublisher);
        ResourceTopologyService topology = new ResourceTopologyService(graph);
        GangArbitrationEngine arbitration = new GangArbitrationEngine(repository::findById);
        CapabilityMatchmaker matchmaker = new CapabilityMatchmaker();
        ResourceTemplateService templateService = new ResourceTemplateService(templateRepo, repository, lifecycle, auditLogger);

        return new ResourceClient(lifecycle, state, topology, arbitration, matchmaker, templateService, shapeRepo, ruleEngine, telemetryStore);
    }

    public ResourceResponse register(CreateResourceRequest req) {
        ResourceId id = ResourceId.of(req.tenantId(), req.resourceId());
        ResourceBuilder builder = ResourceBuilder.create(id)
                .name(req.name())
                .resourceClass(StandardResourceClass.fromString(req.resourceClass()))
                .category(ResourceCategory.valueOf(req.category().toUpperCase()))
                .hierarchyPath(req.isa95Path())
                .coordinate(req.x(), req.y(), req.z())
                .capabilities(req.getCapabilities());

        req.getInitialProperties().forEach(builder::addProperty);
        Resource resource = lifecycleService.registerResource(builder.build());
        return ResourceResponse.fromResource(resource);
    }

    public ResourceResponse getResource(ResourceId id) {
        return ResourceResponse.fromResource(lifecycleService.getResource(id));
    }

    public List<ResourceResponse> getAllResources() {
        return lifecycleService.getAllResources().stream()
                .map(ResourceResponse::fromResource)
                .collect(Collectors.toList());
    }

    public ResourceResponse transitionState(ResourceId id, TransitionStateRequest req) {
        StateTrigger trigger = switch (req.triggerName()) {
            case "START" -> new CoreTriggers.Start(req.operatorId());
            case "PAUSE" -> new CoreTriggers.Pause(req.reason());
            case "RESUME" -> new CoreTriggers.Resume(req.operatorId());
            case "COMPLETE" -> new CoreTriggers.Complete();
            case "STOP" -> new CoreTriggers.Stop(req.reason());
            case "ABORT" -> new CoreTriggers.Abort(req.reason());
            case "RESET" -> new CoreTriggers.Reset();
            case "FAULT" -> new CoreTriggers.Fault(req.reason());
            case "CLEAR" -> new CoreTriggers.Clear();
            case "RETIRE" -> new CoreTriggers.Retire();
            default -> throw new IllegalArgumentException("Unknown state trigger: " + req.triggerName());
        };

        Resource updated = stateService.transition(id, trigger, req.expectedVersion());
        return ResourceResponse.fromResource(updated);
    }

    public AllocationResult allocateGang(AllocationRequest request) {
        return arbitrationEngine.allocateGang(request);
    }

    public boolean releaseLease(String leaseId) {
        return arbitrationEngine.release(leaseId);
    }

    public void link(ResourceId sourceId, ResourceId targetId, RelationshipType type) {
        topologyService.link(sourceId, targetId, type);
    }

    public Set<ResourceId> getDownstreamProductionLine(ResourceId startId) {
        return topologyService.getDownstreamProductionLine(startId);
    }

    public List<ResourceResponse> matchCapabilities(String capability) {
        List<Resource> matched = matchmaker.findAvailable(lifecycleService.getAllResources(), capability);
        return matched.stream().map(ResourceResponse::fromResource).collect(Collectors.toList());
    }

    public ResourceResponse updateResource(ResourceId id, UpdateResourceRequest req) {
        Resource updated = lifecycleService.updateResource(id, req);
        return ResourceResponse.fromResource(updated);
    }

    public Optional<ResourceResponse> findResource(ResourceId id) {
        return lifecycleService.findResource(id).map(ResourceResponse::fromResource);
    }

    public boolean decommissionResource(ResourceId id) {
        return lifecycleService.decommissionResource(id);
    }

    public int expireStaleLeases() {
        return arbitrationEngine.expireStaleLeases();
    }

    public ResourceLifecycleService lifecycle() { return lifecycleService; }
    public ResourceStateService state() { return stateService; }
    public ResourceTopologyService topology() { return topologyService; }
    public GangArbitrationEngine arbitration() { return arbitrationEngine; }
    public CapabilityMatchmaker matchmaker() { return matchmaker; }
    public ResourceTemplateService templates() { return templateService; }
    public org.platform.resourcemanager.application.port.ResourceShapeRepositoryPort shapes() { return shapeRepository; }
    public org.platform.resourcemanager.domain.rule.RuleSubscriptionEngine rules() { return ruleEngine; }
    public org.platform.resourcemanager.application.port.TelemetryHistorianPort telemetry() { return telemetryStore; }
}
