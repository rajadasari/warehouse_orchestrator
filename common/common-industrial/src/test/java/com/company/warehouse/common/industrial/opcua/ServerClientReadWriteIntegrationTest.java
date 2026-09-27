package com.company.warehouse.common.industrial.opcua;

import com.company.warehouse.common.industrial.opcua.model.*;
import com.company.warehouse.common.industrial.opcua.server.VirtualOpcUaServerEngine;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("OPC UA Server to Client Data Read & Write Verification Test")
class ServerClientReadWriteIntegrationTest {

    private VirtualOpcUaServerEngine serverEngine;

    @BeforeEach
    void setUp() {
        // 1. Configure and start Server (Matching OPC_SERVER_01 resource configuration)
        serverEngine = new VirtualOpcUaServerEngine();
        serverEngine.start(OpcUaServerConfig.builder()
                .serverCode("OPC_SERVER_01")
                .bindPort(4840)
                .endpointPath("/wcs/opcua")
                .namespaceUri("urn:company:warehouse:wcs")
                .build());

        // 2. Register standard industrial tags into Server Address Space
        serverEngine.registerNode(OpcUaTagDefinition.builder()
                .tagKey("PalletBarcode")
                .nodeIdStr("ns=2;s=Line1.PalletBarcode")
                .dataType(OpcUaDataType.STRING)
                .accessLevel("READ_WRITE")
                .build(), "INITIAL_BC_0000");

        serverEngine.registerNode(OpcUaTagDefinition.builder()
                .tagKey("LineSpeed")
                .nodeIdStr("ns=2;s=Line1.LineSpeed")
                .dataType(OpcUaDataType.DOUBLE)
                .accessLevel("READ_WRITE")
                .build(), 0.0);

        serverEngine.registerNode(OpcUaTagDefinition.builder()
                .tagKey("TargetLane")
                .nodeIdStr("ns=2;s=Line1.TargetLane")
                .dataType(OpcUaDataType.INT32)
                .accessLevel("READ_WRITE")
                .build(), 1);
    }

    @AfterEach
    void tearDown() {
        if (serverEngine != null) {
            serverEngine.stop();
        }
    }

    @Test
    @DisplayName("Verify Client Write and Read on Server Address Space")
    void testClientWriteAndReadSingle() {
        // Client writes to Server
        boolean writeBarcodeOk = serverEngine.writeSingle("PalletBarcode", "PAL-2026-X99");
        assertTrue(writeBarcodeOk, "Client write to PalletBarcode should succeed");

        boolean writeSpeedOk = serverEngine.writeSingle("LineSpeed", 48.5);
        assertTrue(writeSpeedOk, "Client write to LineSpeed should succeed");

        boolean writeLaneOk = serverEngine.writeSingle("TargetLane", 4);
        assertTrue(writeLaneOk, "Client write to TargetLane should succeed");

        // Client reads from Server
        OpcUaTagValue barcodeVal = serverEngine.readSingle("PalletBarcode");
        assertNotNull(barcodeVal);
        assertTrue(barcodeVal.isGood(), "Tag status code must be Good");
        assertEquals("PAL-2026-X99", barcodeVal.value());

        OpcUaTagValue speedVal = serverEngine.readSingle("LineSpeed");
        assertNotNull(speedVal);
        assertTrue(speedVal.isGood());
        assertEquals(48.5, speedVal.value());

        OpcUaTagValue laneVal = serverEngine.readSingle("TargetLane");
        assertNotNull(laneVal);
        assertTrue(laneVal.isGood());
        assertEquals(4, laneVal.value());
    }

    @Test
    @DisplayName("Verify Client Batch Read on Server")
    void testClientBatchRead() {
        // Write values first
        serverEngine.writeSingle("PalletBarcode", "PAL-BATCH-100");
        serverEngine.writeSingle("LineSpeed", 30.0);
        serverEngine.writeSingle("TargetLane", 2);

        // Client executes batch read
        Map<String, OpcUaTagValue> batch = serverEngine.readBatch(List.of("PalletBarcode", "LineSpeed", "TargetLane"));
        assertEquals(3, batch.size());
        assertEquals("PAL-BATCH-100", batch.get("PalletBarcode").value());
        assertEquals(30.0, batch.get("LineSpeed").value());
        assertEquals(2, batch.get("TargetLane").value());
    }

    @Test
    @DisplayName("Verify Real-Time Telemetry Subscription between Server and Client")
    void testClientTelemetrySubscription() {
        AtomicReference<Object> telemetryCapture = new AtomicReference<>();
        String subscriptionId = serverEngine.subscribe("PalletBarcode", tagValue -> {
            telemetryCapture.set(tagValue.value());
        });

        assertNotNull(subscriptionId, "Subscription ID must be issued by Server");

        // Server value update pushes event to subscriber
        serverEngine.writeSingle("PalletBarcode", "PAL-REALTIME-PUSH");

        assertEquals("PAL-REALTIME-PUSH", telemetryCapture.get(), "Subscriber should receive real-time value push");

        serverEngine.unsubscribe(subscriptionId);
    }
}
