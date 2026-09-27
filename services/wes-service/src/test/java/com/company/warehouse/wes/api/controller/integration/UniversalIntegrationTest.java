package com.company.warehouse.wes.api.controller.integration;

import com.company.warehouse.common.client.software.dynamic.DynamicPayloadEngine;
import com.company.warehouse.common.client.software.integration.handshake.UniversalHandshakeManager;
import com.company.warehouse.common.client.software.integration.mapping.DynamicMappingEngine;
import com.company.warehouse.common.client.software.integration.parser.AutoDetectingDataParser;
import com.company.warehouse.common.client.software.integration.parser.JsonDataEngine;
import com.company.warehouse.common.client.software.integration.parser.XmlDataEngine;
import com.company.warehouse.common.client.software.integration.rules.RuleEngineDispatcher;
import com.company.warehouse.common.client.software.integration.rules.RuleStateTransitionManager;
import com.company.warehouse.common.client.software.integration.rules.impl.CalculatedExpressionEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.DatabaseLookupEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.KeyValueMatchEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.NumericComparisonEvaluator;
import com.company.warehouse.wes.business.integration.GenericIntegrationService;
import com.company.warehouse.wes.business.integration.lookup.WesDatabaseLookupProvider;
import com.company.warehouse.wes.business.workflow.WorkflowEngineService;
import com.company.warehouse.wes.data.entity.IntegrationChannelEntity;
import com.company.warehouse.wes.data.entity.IntegrationSessionEntity;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.repository.IntegrationChannelRepository;
import com.company.warehouse.wes.data.repository.IntegrationSessionRepository;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.PalletTypeMasterRepository;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UniversalIntegrationTest {

    @Mock
    private IntegrationChannelRepository channelRepository;
    @Mock
    private IntegrationSessionRepository sessionRepository;
    @Mock
    private PalletRepository palletRepository;
    @Mock
    private PalletTypeMasterRepository palletTypeRepository;
    @Mock
    private ItemMasterRepository itemMasterRepository;
    @Mock
    private ResourceRepository resourceRepository;
    @Mock
    private WorkflowEngineService workflowEngineService;

    private GenericIntegrationService integrationService;
    private GenericIntegrationController integrationController;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        XmlDataEngine xmlEngine = new XmlDataEngine();
        JsonDataEngine jsonEngine = new JsonDataEngine(objectMapper);
        AutoDetectingDataParser parser = new AutoDetectingDataParser(xmlEngine, jsonEngine);
        DynamicMappingEngine mappingEngine = new DynamicMappingEngine(parser);

        WesDatabaseLookupProvider lookupProvider = new WesDatabaseLookupProvider(
                itemMasterRepository, palletRepository, resourceRepository
        );

        RuleEngineDispatcher ruleDispatcher = new RuleEngineDispatcher(List.of(
                new KeyValueMatchEvaluator(),
                new DatabaseLookupEvaluator(Optional.of(lookupProvider)),
                new NumericComparisonEvaluator(),
                new CalculatedExpressionEvaluator()
        ));

        RuleStateTransitionManager stateManager = new RuleStateTransitionManager();
        DynamicPayloadEngine dynamicPayloadEngine = new DynamicPayloadEngine(objectMapper);
        UniversalHandshakeManager handshakeManager = new UniversalHandshakeManager(dynamicPayloadEngine);

        integrationService = new GenericIntegrationService(
                channelRepository,
                sessionRepository,
                mappingEngine,
                ruleDispatcher,
                stateManager,
                handshakeManager,
                workflowEngineService,
                palletRepository,
                palletTypeRepository,
                objectMapper
        );

        integrationController = new GenericIntegrationController(integrationService);
    }

    private IntegrationChannelEntity createMockInboundChannel() {
        return IntegrationChannelEntity.builder()
                .channelCode("INBOUND_PALLET_CHANNEL")
                .channelName("Inbound Pallet Channel")
                .direction("INGRESS")
                .domain("INBOUND")
                .payloadFormat("AUTO")
                .defaultSuccessState("ACCEPTED_IN_TRANSIT")
                .mappingRules("""
                        [
                          {"sourcePath": "//LENUM | $.palletLpn", "targetField": "palletLpn", "required": true},
                          {"sourcePath": "//MATNR | $.skuCode", "targetField": "skuCode", "required": true},
                          {"sourcePath": "//MENGE | $.quantity", "targetField": "quantity", "dataType": "NUMBER", "defaultValue": 1.0},
                          {"sourcePath": "//GEWEI | $.actualWeightKg", "targetField": "actualWeightKg", "dataType": "NUMBER", "defaultValue": 500.0},
                          {"sourcePath": "//MESTYP | $.messageType", "targetField": "messageType", "defaultValue": "WMTORD"}
                        ]
                        """)
                .validationRules("""
                        [
                          {
                            "id": "R1_TYPE",
                            "type": "KEY_VALUE_MATCH",
                            "field": "messageType",
                            "operator": "IN",
                            "expectedValues": ["WMTORD", "DELVRY", "PALLET_INBOUND"],
                            "critical": true,
                            "onFailureState": "REJECTED_INVALID_TYPE"
                          },
                          {
                            "id": "R2_SKU",
                            "type": "DATABASE_LOOKUP",
                            "field": "skuCode",
                            "lookupTarget": "SKU_EXISTS",
                            "critical": true,
                            "onFailureState": "QUARANTINE_UNKNOWN_SKU",
                            "failureMessage": "SKU does not exist in master catalog"
                          },
                          {
                            "id": "R3_WEIGHT",
                            "type": "NUMERIC_COMPARISON",
                            "field": "actualWeightKg",
                            "operator": "BETWEEN_INCLUSIVE",
                            "min": 25.0,
                            "max": 1500.0,
                            "critical": true,
                            "onFailureState": "REJECTED_WEIGHT_OUT_OF_BOUNDS"
                          }
                        ]
                        """)
                .handshakeConfig("""
                        {
                          "mode": "ASYNC_CALLBACK",
                          "timeoutSeconds": 60
                        }
                        """)
                .build();
    }

    @Test
    void testSuccessfulXmlIdocIngestionAsyncHandshake() {
        when(channelRepository.findByChannelCode("INBOUND_PALLET_CHANNEL"))
                .thenReturn(Optional.of(createMockInboundChannel()));
        when(itemMasterRepository.existsByItemCode("SKU-BEV-001")).thenReturn(true);
        when(palletRepository.findByPalletLpn("PLT-SAP-987")).thenReturn(Optional.empty());

        String xml = """
                <IDOC>
                    <EDI_DC40><MESTYP>WMTORD</MESTYP></EDI_DC40>
                    <E1WMTOD>
                        <LENUM>PLT-SAP-987</LENUM>
                        <MATNR>SKU-BEV-001</MATNR>
                        <MENGE>50.0</MENGE>
                        <GEWEI>750.0</GEWEI>
                    </E1WMTOD>
                </IDOC>
                """;

        ResponseEntity<Map<String, Object>> response = integrationController.ingest("INBOUND_PALLET_CHANNEL", xml);

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("ACCEPTED_IN_TRANSIT", body.get("finalState"));
        assertTrue(Boolean.TRUE.equals(body.get("allRulesPassed")));
        assertTrue(body.containsKey("correlationKey"));

        verify(palletRepository).save(any(PalletEntity.class));
        verify(sessionRepository).save(any(IntegrationSessionEntity.class));
    }

    @Test
    void testUnknownSkuTriggersQuarantineState() {
        when(channelRepository.findByChannelCode("INBOUND_PALLET_CHANNEL"))
                .thenReturn(Optional.of(createMockInboundChannel()));
        when(itemMasterRepository.existsByItemCode("SKU-NON-EXISTENT")).thenReturn(false);

        String json = """
                {
                    "messageType": "WMTORD",
                    "palletLpn": "PLT-BAD-SKU",
                    "skuCode": "SKU-NON-EXISTENT",
                    "quantity": 10,
                    "actualWeightKg": 300.0
                }
                """;

        ResponseEntity<Map<String, Object>> response = integrationController.ingest("INBOUND_PALLET_CHANNEL", json);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("QUARANTINE_UNKNOWN_SKU", body.get("finalState"));
        assertFalse(Boolean.TRUE.equals(body.get("allRulesPassed")));
    }

    @Test
    void testOverweightPalletTriggersRejectedState() {
        when(channelRepository.findByChannelCode("INBOUND_PALLET_CHANNEL"))
                .thenReturn(Optional.of(createMockInboundChannel()));
        when(itemMasterRepository.existsByItemCode("SKU-BEV-001")).thenReturn(true);

        String json = """
                {
                    "messageType": "WMTORD",
                    "palletLpn": "PLT-OVERWEIGHT",
                    "skuCode": "SKU-BEV-001",
                    "quantity": 10,
                    "actualWeightKg": 2100.0
                }
                """;

        ResponseEntity<Map<String, Object>> response = integrationController.ingest("INBOUND_PALLET_CHANNEL", json);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("REJECTED_WEIGHT_OUT_OF_BOUNDS", body.get("finalState"));
        assertFalse(Boolean.TRUE.equals(body.get("allRulesPassed")));
    }
}
