package com.company.warehouse.common.industrial.opcua;

import com.company.warehouse.common.industrial.opcua.model.*;
import com.company.warehouse.common.industrial.opcua.server.VirtualOpcUaServerEngine;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class VirtualOpcUaServerEngineTest {

    private VirtualOpcUaServerEngine server;

    @BeforeEach
    void setUp() {
        server = new VirtualOpcUaServerEngine();
        server.start(OpcUaServerConfig.builder()
                .serverCode("TEST_SERVER")
                .bindPort(4840)
                .endpointPath("/test")
                .namespaceUri("urn:test:opcua")
                .build());
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop();
        }
    }

    @Test
    void testSingleTagReadWrite() {
        OpcUaTagDefinition tag = OpcUaTagDefinition.builder()
                .tagKey("PalletBarcode")
                .nodeIdStr("ns=2;s=Line1.PalletBarcode")
                .dataType(OpcUaDataType.STRING)
                .accessLevel("READ_WRITE")
                .build();

        server.registerNode(tag, "INITIAL_BC");

        OpcUaTagValue initialVal = server.readSingle("PalletBarcode");
        assertNotNull(initialVal);
        assertTrue(initialVal.isGood());
        assertEquals("INITIAL_BC", initialVal.value());

        boolean writeOk = server.writeSingle("PalletBarcode", "PAL10099");
        assertTrue(writeOk);

        OpcUaTagValue updatedVal = server.readSingle("PalletBarcode");
        assertEquals("PAL10099", updatedVal.value());
    }

    @Test
    void testTagGroupBatchReadWrite() {
        OpcUaTagDefinition tag1 = OpcUaTagDefinition.builder()
                .tagKey("PalletPresent")
                .nodeIdStr("ns=2;s=Station.Present")
                .dataType(OpcUaDataType.BOOLEAN)
                .build();

        OpcUaTagDefinition tag2 = OpcUaTagDefinition.builder()
                .tagKey("WeightKg")
                .nodeIdStr("ns=2;s=Station.Weight")
                .dataType(OpcUaDataType.DOUBLE)
                .build();

        OpcUaTagDefinition tag3 = OpcUaTagDefinition.builder()
                .tagKey("TargetLane")
                .nodeIdStr("ns=2;s=Station.Lane")
                .dataType(OpcUaDataType.INT32)
                .build();

        server.registerNode(tag1, false);
        server.registerNode(tag2, 0.0);
        server.registerNode(tag3, 0);

        OpcUaTagGroupDefinition group = OpcUaTagGroupDefinition.builder()
                .groupKey("STATION_GROUP")
                .description("Loading Station Telegram")
                .tagKeys(List.of("PalletPresent", "WeightKg", "TargetLane"))
                .build();

        server.registerTagGroup(group);

        // Batch write
        Map<String, Boolean> writeResults = server.writeGroup("STATION_GROUP", Map.of(
                "PalletPresent", true,
                "WeightKg", 425.5,
                "TargetLane", 3
        ));
        assertEquals(3, writeResults.size());
        assertTrue(writeResults.values().stream().allMatch(Boolean::booleanValue));

        // Group read
        Map<String, OpcUaTagValue> readResults = server.readGroup("STATION_GROUP");
        assertEquals(3, readResults.size());
        assertEquals(Boolean.TRUE, readResults.get("PalletPresent").value());
        assertEquals(425.5, readResults.get("WeightKg").value());
        assertEquals(3, readResults.get("TargetLane").value());
    }

    @Test
    void testSubscriptionChangeNotification() {
        OpcUaTagDefinition tag = OpcUaTagDefinition.builder()
                .tagKey("TriggerFlag")
                .nodeIdStr("ns=2;s=Trigger")
                .dataType(OpcUaDataType.BOOLEAN)
                .build();

        server.registerNode(tag, false);

        AtomicReference<Object> receivedValue = new AtomicReference<>();
        String subId = server.subscribe("TriggerFlag", tv -> receivedValue.set(tv.value()));
        assertNotNull(subId);

        server.writeSingle("TriggerFlag", true);
        assertEquals(Boolean.TRUE, receivedValue.get());

        server.unsubscribe(subId);
    }
}
