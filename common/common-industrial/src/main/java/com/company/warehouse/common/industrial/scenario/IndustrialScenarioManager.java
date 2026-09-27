package com.company.warehouse.common.industrial.scenario;

import com.company.warehouse.common.industrial.gateway.SpringDeviceGatewayFactory;
import org.platform.gateway.api.DeviceGateway;
import org.platform.gateway.scenario.browse.DiscoveredTagNode;
import org.platform.gateway.scenario.browse.TagDiscoveryService;
import org.platform.gateway.scenario.engine.ScenarioBuilder;
import org.platform.gateway.scenario.engine.ScenarioExecutionReport;
import org.platform.gateway.scenario.engine.ScenarioPipeline;
import org.platform.opcua.client.api.OpcUaClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service orchestrating reactive OPC UA & Modbus scenarios and tag discovery.
 */
public class IndustrialScenarioManager implements AutoCloseable {

    private final SpringDeviceGatewayFactory gatewayFactory;
    private final Map<String, ScenarioPipeline> registeredScenarios = new ConcurrentHashMap<>();

    public IndustrialScenarioManager(SpringDeviceGatewayFactory gatewayFactory) {
        this.gatewayFactory = Objects.requireNonNull(gatewayFactory, "gatewayFactory must not be null");
    }

    public ScenarioBuilder createScenarioBuilder(String scenarioId) {
        return ScenarioBuilder.create(scenarioId);
    }

    public ScenarioPipeline registerScenario(String endpointUrl, ScenarioBuilder builder) {
        DeviceGateway gateway = gatewayFactory.getGateway(endpointUrl);
        ScenarioPipeline pipeline = builder.build(gateway);
        ScenarioPipeline existing = registeredScenarios.put(pipeline.scenarioId(), pipeline);
        if (existing != null) {
            existing.close();
        }
        return pipeline;
    }

    public void registerScenario(ScenarioPipeline pipeline) {
        Objects.requireNonNull(pipeline, "pipeline must not be null");
        ScenarioPipeline existing = registeredScenarios.put(pipeline.scenarioId(), pipeline);
        if (existing != null) {
            existing.close();
        }
    }

    public void startScenario(String scenarioId) {
        ScenarioPipeline pipeline = registeredScenarios.get(scenarioId);
        if (pipeline == null) {
            throw new IllegalArgumentException("Unknown scenarioId: " + scenarioId);
        }
        pipeline.start();
    }

    public void stopScenario(String scenarioId) {
        ScenarioPipeline pipeline = registeredScenarios.get(scenarioId);
        if (pipeline != null) {
            pipeline.stop();
        }
    }

    public CompletableFuture<ScenarioExecutionReport> triggerScenario(String scenarioId) {
        ScenarioPipeline pipeline = registeredScenarios.get(scenarioId);
        if (pipeline == null) {
            return CompletableFuture.failedFuture(new IllegalArgumentException("Unknown scenarioId: " + scenarioId));
        }
        return pipeline.triggerManual();
    }

    public void unregisterScenario(String scenarioId) {
        ScenarioPipeline pipeline = registeredScenarios.remove(scenarioId);
        if (pipeline != null) {
            pipeline.close();
        }
    }

    public CompletableFuture<List<DiscoveredTagNode>> discoverTags(OpcUaClient opcClient, String rootNodeId, int maxDepth) {
        TagDiscoveryService discoveryService = new TagDiscoveryService(opcClient);
        return discoveryService.browseTree(rootNodeId, maxDepth);
    }

    public Map<String, ScenarioPipeline> getActiveScenarios() {
        return Collections.unmodifiableMap(registeredScenarios);
    }

    @Override
    public void close() {
        registeredScenarios.values().forEach(ScenarioPipeline::close);
        registeredScenarios.clear();
    }
}
