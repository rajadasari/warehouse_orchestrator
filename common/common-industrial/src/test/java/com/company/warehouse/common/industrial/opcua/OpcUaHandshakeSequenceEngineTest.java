package com.company.warehouse.common.industrial.opcua;

import com.company.warehouse.common.industrial.opcua.handshake.HandshakeExecutionResult;
import com.company.warehouse.common.industrial.opcua.handshake.HandshakeStep;
import com.company.warehouse.common.industrial.opcua.handshake.HandshakeStepType;
import com.company.warehouse.common.industrial.opcua.handshake.OpcUaHandshakeSequenceEngine;
import com.company.warehouse.common.industrial.opcua.model.*;
import com.company.warehouse.common.industrial.opcua.server.VirtualOpcUaServerEngine;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class OpcUaHandshakeSequenceEngineTest {

    private VirtualOpcUaServerEngine server;
    private OpcUaHandshakeSequenceEngine handshakeEngine;
    private ScheduledExecutorService executor;

    @BeforeEach
    void setUp() {
        server = new VirtualOpcUaServerEngine();
        server.start(OpcUaServerConfig.builder()
                .serverCode("PLC_SIMULATOR")
                .bindPort(4840)
                .build());

        handshakeEngine = new OpcUaHandshakeSequenceEngine();
        executor = Executors.newSingleThreadScheduledExecutor();

        // Register PLC nodes
        server.registerNode(OpcUaTagDefinition.builder().tagKey("PalletPresent").nodeIdStr("ns=2;s=Station.Present").dataType(OpcUaDataType.BOOLEAN).build(), false);
        server.registerNode(OpcUaTagDefinition.builder().tagKey("Barcode").nodeIdStr("ns=2;s=Station.Barcode").dataType(OpcUaDataType.STRING).build(), "PAL-8888");
        server.registerNode(OpcUaTagDefinition.builder().tagKey("WeightKg").nodeIdStr("ns=2;s=Station.Weight").dataType(OpcUaDataType.DOUBLE).build(), 350.0);
        server.registerNode(OpcUaTagDefinition.builder().tagKey("TargetLane").nodeIdStr("ns=2;s=Station.Lane").dataType(OpcUaDataType.INT32).build(), 0);
        server.registerNode(OpcUaTagDefinition.builder().tagKey("WcsAck").nodeIdStr("ns=2;s=Station.WcsAck").dataType(OpcUaDataType.BOOLEAN).build(), false);
        server.registerNode(OpcUaTagDefinition.builder().tagKey("PlcDone").nodeIdStr("ns=2;s=Station.PlcDone").dataType(OpcUaDataType.BOOLEAN).build(), false);

        server.registerTagGroup(OpcUaTagGroupDefinition.builder()
                .groupKey("STATION_INPUTS")
                .tagKeys(List.of("Barcode", "WeightKg"))
                .build());
    }

    @AfterEach
    void tearDown() {
        if (server != null) server.stop();
        if (executor != null) executor.shutdownNow();
    }

    @Test
    void testSuccessfulConveyorLoadingHandshake() {
        List<HandshakeStep> steps = List.of(
                HandshakeStep.builder().stepOrder(1).stepType(HandshakeStepType.AWAIT_TRIGGER).tagKey("PalletPresent").expectedValue(true).timeoutMs(2000L).build(),
                HandshakeStep.builder().stepOrder(2).stepType(HandshakeStepType.READ_GROUP).groupKey("STATION_INPUTS").timeoutMs(2000L).build(),
                HandshakeStep.builder().stepOrder(3).stepType(HandshakeStepType.WRITE_SINGLE).tagKey("TargetLane").writeValue("#{routedLane}").timeoutMs(2000L).build(),
                HandshakeStep.builder().stepOrder(4).stepType(HandshakeStepType.WRITE_SINGLE).tagKey("WcsAck").writeValue(true).timeoutMs(2000L).build(),
                HandshakeStep.builder().stepOrder(5).stepType(HandshakeStepType.AWAIT_CONFIRMATION).tagKey("PlcDone").expectedValue(true).timeoutMs(2000L).build(),
                HandshakeStep.builder().stepOrder(6).stepType(HandshakeStepType.RESET).tagKey("WcsAck").writeValue(false).timeoutMs(2000L).build()
        );

        // Simulate PLC asynchronous operations
        executor.schedule(() -> {
            server.writeSingle("PalletPresent", true);
        }, 100, TimeUnit.MILLISECONDS);

        server.subscribe("WcsAck", ackVal -> {
            if (Boolean.TRUE.equals(ackVal.value())) {
                executor.schedule(() -> server.writeSingle("PlcDone", true), 100, TimeUnit.MILLISECONDS);
            }
        });

        Map<String, Object> context = Map.of("routedLane", 4);
        HandshakeExecutionResult result = handshakeEngine.executeSequence(server, steps, context);

        assertTrue(result.success());
        assertEquals("COMPLETED", result.state());
        assertEquals("PAL-8888", result.outputData().get("Barcode"));
        assertEquals(350.0, result.outputData().get("WeightKg"));

        // Verify writes on PLC
        assertEquals(4, server.readSingle("TargetLane").value());
        assertEquals(Boolean.FALSE, server.readSingle("WcsAck").value());
    }

    @Test
    void testHandshakeTimeoutFault() {
        List<HandshakeStep> steps = List.of(
                HandshakeStep.builder().stepOrder(1).stepType(HandshakeStepType.AWAIT_TRIGGER).tagKey("PalletPresent").expectedValue(true).timeoutMs(300L).build()
        );

        HandshakeExecutionResult result = handshakeEngine.executeSequence(server, steps, Map.of());
        assertFalse(result.success());
        assertEquals("TIMEOUT_FAULT", result.state());
    }
}
