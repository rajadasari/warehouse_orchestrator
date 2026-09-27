package com.company.warehouse.wcs;

import com.company.warehouse.common.industrial.opcua.handshake.HandshakeExecutionResult;
import com.company.warehouse.common.industrial.opcua.model.OpcUaDataType;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagDefinition;
import com.company.warehouse.common.industrial.opcua.server.OpcUaServerEngine;
import com.company.warehouse.wcs.api.controller.WcsWorkflowNodeComposerController;
import com.company.warehouse.wcs.api.dto.StationNodeGenerateRequest;
import com.company.warehouse.wcs.api.dto.StationNodeGenerateResponse;
import com.company.warehouse.wcs.business.service.WcsOpcUaRuntimeManager;
import com.company.warehouse.wcs.business.service.WcsWorkflowNodeComposerService;
import com.company.warehouse.wcs.data.entity.OpcUaServerConfigEntity;
import com.company.warehouse.wcs.data.entity.OpcUaStationTemplateEntity;
import com.company.warehouse.wcs.data.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WcsWorkflowNodeComposerTest {

    @Mock
    private OpcUaStationTemplateRepository templateRepository;
    @Mock
    private OpcUaClientConfigRepository clientConfigRepository;
    @Mock
    private OpcUaServerConfigRepository serverConfigRepository;
    @Mock
    private OpcUaTagMappingRepository tagMappingRepository;
    @Mock
    private OpcUaTagGroupRepository tagGroupRepository;

    private WcsOpcUaRuntimeManager runtimeManager;
    private WcsWorkflowNodeComposerService composerService;
    private WcsWorkflowNodeComposerController controller;
    private ObjectMapper objectMapper;
    private ScheduledExecutorService executor;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        runtimeManager = new WcsOpcUaRuntimeManager(
                clientConfigRepository, serverConfigRepository, tagMappingRepository, tagGroupRepository
        );
        composerService = new WcsWorkflowNodeComposerService(templateRepository, runtimeManager, objectMapper);
        controller = new WcsWorkflowNodeComposerController(composerService);
        executor = Executors.newSingleThreadScheduledExecutor();
    }

    @AfterEach
    void tearDown() {
        runtimeManager.shutdown();
        if (executor != null) executor.shutdownNow();
    }

    @Test
    void testGenerateStationNodeForMultipleStations() {
        OpcUaStationTemplateEntity template = OpcUaStationTemplateEntity.builder()
                .templateCode("LOADING_STATION_TEMPLATE")
                .name("Conveyor Loading Station Sequence")
                .sequenceStepsJson("""
                    [
                        {"stepOrder": 1, "stepType": "AWAIT_TRIGGER", "tagKey": "PalletPresent", "expectedValue": true},
                        {"stepOrder": 2, "stepType": "READ_SINGLE", "tagKey": "Barcode", "outputVariable": "palletBarcode"},
                        {"stepOrder": 3, "stepType": "WRITE_SINGLE", "tagKey": "TargetLane", "writeValue": "#{targetLane}"},
                        {"stepOrder": 4, "stepType": "WRITE_SINGLE", "tagKey": "WcsAck", "writeValue": true},
                        {"stepOrder": 5, "stepType": "AWAIT_CONFIRMATION", "tagKey": "PlcDone", "expectedValue": true},
                        {"stepOrder": 6, "stepType": "RESET", "tagKey": "WcsAck", "writeValue": false}
                    ]
                """)
                .outputVariable("loadingResult")
                .build();

        when(templateRepository.findByTemplateCode("LOADING_STATION_TEMPLATE")).thenReturn(Optional.of(template));

        // 1. Generate node for Station 1 on Line 1
        StationNodeGenerateRequest reqStn1 = StationNodeGenerateRequest.builder()
                .templateCode("LOADING_STATION_TEMPLATE")
                .stationCode("CONV_STN_01")
                .stationLabel("Line 1 - Inbound Loading Station 01")
                .tagPrefix("ns=2;s=Line1.Station01.")
                .clientCode("PLC_LINE_01")
                .build();

        ResponseEntity<StationNodeGenerateResponse> resp1 = controller.generateStationNode(reqStn1);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        StationNodeGenerateResponse body1 = resp1.getBody();
        assertNotNull(body1);
        assertEquals("node-conv-stn-01", body1.node().get("id"));
        assertEquals("OPCUA_STATION_ACTION", body1.node().get("type"));
        assertTrue(body1.requiredInputs().contains("targetLane"));
        assertTrue(body1.outputVariables().contains("palletBarcode"));

        // 2. Generate node for Station 2 on Line 2 reusing the SAME template!
        StationNodeGenerateRequest reqStn2 = StationNodeGenerateRequest.builder()
                .templateCode("LOADING_STATION_TEMPLATE")
                .stationCode("CONV_STN_02")
                .stationLabel("Line 2 - Inbound Loading Station 02")
                .tagPrefix("ns=2;s=Line2.Station02.")
                .clientCode("PLC_LINE_02")
                .build();

        ResponseEntity<StationNodeGenerateResponse> resp2 = controller.generateStationNode(reqStn2);
        StationNodeGenerateResponse body2 = resp2.getBody();
        assertNotNull(body2);
        assertEquals("node-conv-stn-02", body2.node().get("id"));
        assertEquals("OPCUA_STATION_ACTION", body2.node().get("type"));
        @SuppressWarnings("unchecked")
        Map<String, Object> cfg2 = (Map<String, Object>) body2.node().get("config");
        assertEquals("ns=2;s=Line2.Station02.", cfg2.get("tagPrefix"));
        assertEquals("PLC_LINE_02", cfg2.get("clientCode"));
    }

    @Test
    void testExecuteStationSequenceLiveAgainstVirtualServer() {
        // Start virtual server in runtime manager
        OpcUaServerConfigEntity serverConfig = OpcUaServerConfigEntity.builder()
                .serverCode("WCS_VIRTUAL_SERVER")
                .bindPort(4840)
                .endpointPath("/wcs/opcua")
                .namespaceUri("urn:company:warehouse:wcs")
                .build();

        OpcUaServerEngine server = runtimeManager.startServer(serverConfig);

        // Register Station 01 prefixed tags on server
        String prefix = "ns=2;s=Line1.Stn01.";
        server.registerNode(OpcUaTagDefinition.builder().tagKey(prefix + "PalletPresent").nodeIdStr(prefix + "PalletPresent").dataType(OpcUaDataType.BOOLEAN).build(), false);
        server.registerNode(OpcUaTagDefinition.builder().tagKey(prefix + "Barcode").nodeIdStr(prefix + "Barcode").dataType(OpcUaDataType.STRING).build(), "PAL-9999");
        server.registerNode(OpcUaTagDefinition.builder().tagKey(prefix + "TargetLane").nodeIdStr(prefix + "TargetLane").dataType(OpcUaDataType.INT32).build(), 0);
        server.registerNode(OpcUaTagDefinition.builder().tagKey(prefix + "WcsAck").nodeIdStr(prefix + "WcsAck").dataType(OpcUaDataType.BOOLEAN).build(), false);
        server.registerNode(OpcUaTagDefinition.builder().tagKey(prefix + "PlcDone").nodeIdStr(prefix + "PlcDone").dataType(OpcUaDataType.BOOLEAN).build(), false);

        OpcUaStationTemplateEntity template = OpcUaStationTemplateEntity.builder()
                .templateCode("LOADING_TEMPLATE")
                .name("Loading Template")
                .sequenceStepsJson("""
                    [
                        {"stepOrder": 1, "stepType": "AWAIT_TRIGGER", "tagKey": "PalletPresent", "expectedValue": true, "timeoutMs": 2000},
                        {"stepOrder": 2, "stepType": "READ_SINGLE", "tagKey": "Barcode", "outputVariable": "palletBarcode", "timeoutMs": 2000},
                        {"stepOrder": 3, "stepType": "WRITE_SINGLE", "tagKey": "TargetLane", "writeValue": "#{lane}", "timeoutMs": 2000},
                        {"stepOrder": 4, "stepType": "WRITE_SINGLE", "tagKey": "WcsAck", "writeValue": true, "timeoutMs": 2000},
                        {"stepOrder": 5, "stepType": "AWAIT_CONFIRMATION", "tagKey": "PlcDone", "expectedValue": true, "timeoutMs": 2000},
                        {"stepOrder": 6, "stepType": "RESET", "tagKey": "WcsAck", "writeValue": false, "timeoutMs": 2000}
                    ]
                """)
                .outputVariable("stnResult")
                .build();

        when(templateRepository.findByTemplateCode("LOADING_TEMPLATE")).thenReturn(Optional.of(template));

        // Asynchronously simulate PLC behaviour
        executor.schedule(() -> server.writeSingle(prefix + "PalletPresent", true), 100, TimeUnit.MILLISECONDS);
        server.subscribe(prefix + "WcsAck", ackVal -> {
            if (Boolean.TRUE.equals(ackVal.value())) {
                executor.schedule(() -> server.writeSingle(prefix + "PlcDone", true), 100, TimeUnit.MILLISECONDS);
            }
        });

        Map<String, Object> payload = Map.of(
                "templateCode", "LOADING_TEMPLATE",
                "stationCode", "CONV_STN_01",
                "tagPrefix", prefix,
                "clientCode", "WCS_VIRTUAL_SERVER",
                "context", Map.of("lane", 5)
        );

        ResponseEntity<HandshakeExecutionResult> resultResp = controller.executeStationSequence(payload);
        assertEquals(HttpStatus.OK, resultResp.getStatusCode());
        HandshakeExecutionResult result = resultResp.getBody();
        assertNotNull(result);
        assertTrue(result.success());
        assertEquals("COMPLETED", result.state());
        assertEquals("PAL-9999", result.outputData().get("palletBarcode"));
        assertEquals(5, server.readSingle(prefix + "TargetLane").value());
    }
}
