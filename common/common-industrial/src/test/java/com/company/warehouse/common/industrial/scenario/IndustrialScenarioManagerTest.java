package com.company.warehouse.common.industrial.scenario;

import com.company.warehouse.common.industrial.gateway.SpringDeviceGatewayFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.gateway.api.DataPoint;
import org.platform.gateway.api.DeviceGateway;
import org.platform.gateway.api.SubscriptionHandle;
import org.platform.gateway.api.SubscriptionListener;
import org.platform.gateway.api.TagAddress;
import org.platform.gateway.scenario.api.ComparisonOperator;
import org.platform.gateway.scenario.engine.ScenarioBuilder;
import org.platform.gateway.scenario.engine.ScenarioExecutionReport;
import org.platform.gateway.scenario.engine.ScenarioPipeline;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("IndustrialScenarioManager & Rule Engine Verification")
class IndustrialScenarioManagerTest {

    private MockDeviceGateway mockGateway;
    private SpringDeviceGatewayFactory gatewayFactory;
    private IndustrialScenarioManager scenarioManager;

    @BeforeEach
    void setUp() {
        mockGateway = new MockDeviceGateway();
        gatewayFactory = new SpringDeviceGatewayFactory() {
            @Override
            public DeviceGateway getGateway(String endpointUrl) {
                return mockGateway;
            }
        };
        scenarioManager = new IndustrialScenarioManager(gatewayFactory);
    }

    @AfterEach
    void tearDown() {
        scenarioManager.close();
    }

    @Test
    @DisplayName("Single Read -> Multiple Writes (1-to-N) when temperature > 75.0")
    void testSingleReadMultiWriteScenario() {
        TagAddress tempTag = TagAddress.of("ns=2;s=Line1.Temp");
        TagAddress fanTag = TagAddress.of("ns=2;s=Line1.FanRelay");
        TagAddress beaconTag = TagAddress.of("ns=2;s=Line1.AlarmBeacon");
        mockGateway.tags.put(tempTag, 82.5);

        ScenarioBuilder builder = scenarioManager.createScenarioBuilder("OverheatAlert")
                .when(tempTag, ComparisonOperator.GREATER_THAN, 75.0)
                .thenWrite(fanTag, true)
                .thenWrite(beaconTag, "ACTIVE");

        scenarioManager.registerScenario("opc.tcp://localhost:4840", builder);

        ScenarioExecutionReport report = scenarioManager.triggerScenario("OverheatAlert").join();

        assertTrue(report.conditionsMet());
        assertTrue(report.success());
        assertEquals(true, mockGateway.tags.get(fanTag));
        assertEquals("ACTIVE", mockGateway.tags.get(beaconTag));
    }

    @Test
    @DisplayName("Multi-Read (AND) -> Single Write (N-to-1) when both pressure and temp exceed limit")
    void testMultiReadSingleWriteScenario() {
        TagAddress tempTag = TagAddress.of("ns=2;s=Boiler.Temp");
        TagAddress pressureTag = TagAddress.of("ns=2;s=Boiler.Pressure");
        TagAddress valveTag = TagAddress.of("ns=2;s=Boiler.VentValve");

        mockGateway.tags.put(tempTag, 95.0);
        mockGateway.tags.put(pressureTag, 15.5);

        ScenarioBuilder builder = scenarioManager.createScenarioBuilder("PressureRelief")
                .when(tempTag, ComparisonOperator.GREATER_THAN_OR_EQUAL, 90.0)
                .and(pressureTag, ComparisonOperator.GREATER_THAN, 10.0)
                .thenWrite(valveTag, true);

        scenarioManager.registerScenario("opc.tcp://localhost:4840", builder);

        ScenarioExecutionReport report = scenarioManager.triggerScenario("PressureRelief").join();

        assertTrue(report.conditionsMet());
        assertEquals(true, mockGateway.tags.get(valveTag));
    }

    @Test
    @DisplayName("Reactive Continuous Subscription triggers automatic writes on value change")
    void testReactiveContinuousSubscription() {
        TagAddress levelTag = TagAddress.of("ns=2;s=Sensor.Level");
        TagAddress pumpTag = TagAddress.of("ns=2;s=Pump.Stop");
        mockGateway.tags.put(levelTag, 10.0);

        ScenarioBuilder builder = scenarioManager.createScenarioBuilder("TankOverflow")
                .when(levelTag, ComparisonOperator.GREATER_THAN, 50.0)
                .thenWrite(pumpTag, true);

        ScenarioPipeline pipeline = scenarioManager.registerScenario("opc.tcp://localhost:4840", builder);
        scenarioManager.startScenario("TankOverflow");
        assertTrue(pipeline.isRunning());

        // Emit level change that trips the condition
        mockGateway.emitValueChange(levelTag, 65.0);

        assertEquals(true, mockGateway.tags.get(pumpTag));

        scenarioManager.stopScenario("TankOverflow");
        assertFalse(pipeline.isRunning());
    }

    static class MockDeviceGateway implements DeviceGateway {
        final Map<TagAddress, Object> tags = new ConcurrentHashMap<>();
        final Map<TagAddress, SubscriptionListener> listeners = new ConcurrentHashMap<>();

        @Override public String endpointUrl() { return "mock://test"; }
        @Override public String protocol() { return "MOCK"; }
        @Override public boolean isConnected() { return true; }
        @Override public CompletableFuture<Void> connect() { return CompletableFuture.completedFuture(null); }
        @Override public CompletableFuture<Void> disconnect() { return CompletableFuture.completedFuture(null); }

        public void emitValueChange(TagAddress tag, Object value) {
            tags.put(tag, value);
            SubscriptionListener listener = listeners.get(tag);
            if (listener != null) {
                listener.onDataChange(DataPoint.good(tag, value));
            }
        }

        @Override
        public CompletableFuture<DataPoint> read(TagAddress tag) {
            Object val = tags.get(tag);
            return CompletableFuture.completedFuture(DataPoint.good(tag, val));
        }

        @Override
        public CompletableFuture<Map<TagAddress, DataPoint>> readBatch(Set<TagAddress> tagSet) {
            Map<TagAddress, DataPoint> map = new ConcurrentHashMap<>();
            for (TagAddress tag : tagSet) {
                map.put(tag, DataPoint.good(tag, tags.get(tag)));
            }
            return CompletableFuture.completedFuture(map);
        }

        @Override
        public CompletableFuture<Void> write(TagAddress tag, Object value) {
            tags.put(tag, value);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletableFuture<Void> writeBatch(Map<TagAddress, Object> values) {
            tags.putAll(values);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public SubscriptionHandle subscribe(TagAddress tag, SubscriptionListener listener) {
            listeners.put(tag, listener);
            return new SubscriptionHandle() {
                @Override public String subscriptionId() { return tag.identifier(); }
                @Override public TagAddress tag() { return tag; }
                @Override public boolean isActive() { return true; }
                @Override public void cancel() { listeners.remove(tag); }
            };
        }

        @Override
        public void close() {
            tags.clear();
            listeners.clear();
        }
    }
}
