package com.company.warehouse.wes.api.controller.integration;

import com.company.warehouse.common.client.software.integration.handshake.HandshakeConfig;
import com.company.warehouse.common.client.software.integration.handshake.HandshakeMode;
import com.company.warehouse.common.client.software.integration.mapping.DynamicMappingEngine;
import com.company.warehouse.common.client.software.integration.mapping.FieldMappingRule;
import com.company.warehouse.common.client.software.integration.parser.AutoDetectingDataParser;
import com.company.warehouse.common.client.software.integration.parser.JsonDataEngine;
import com.company.warehouse.common.client.software.integration.parser.XmlDataEngine;
import com.company.warehouse.common.client.software.integration.rules.RuleEngineDispatcher;
import com.company.warehouse.common.client.software.integration.rules.RuleStateTransitionManager;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import com.company.warehouse.common.client.software.integration.rules.impl.CalculatedExpressionEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.KeyValueMatchEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.NumericComparisonEvaluator;
import com.company.warehouse.wes.api.dto.integration.ChannelDryRunRequest;
import com.company.warehouse.wes.api.dto.integration.ChannelDryRunResponse;
import com.company.warehouse.wes.api.dto.integration.IntegrationChannelDto;
import com.company.warehouse.wes.business.integration.IntegrationChannelConfigService;
import com.company.warehouse.wes.data.entity.IntegrationChannelEntity;
import com.company.warehouse.wes.data.repository.IntegrationChannelRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IntegrationChannelConfigTest {

    @Mock
    private IntegrationChannelRepository channelRepository;

    private IntegrationChannelConfigService configService;
    private IntegrationChannelConfigController controller;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        XmlDataEngine xmlEngine = new XmlDataEngine();
        JsonDataEngine jsonEngine = new JsonDataEngine(objectMapper);
        AutoDetectingDataParser parser = new AutoDetectingDataParser(xmlEngine, jsonEngine);
        DynamicMappingEngine mappingEngine = new DynamicMappingEngine(parser);

        RuleEngineDispatcher ruleDispatcher = new RuleEngineDispatcher(List.of(
                new KeyValueMatchEvaluator(),
                new NumericComparisonEvaluator(),
                new CalculatedExpressionEvaluator()
        ));
        RuleStateTransitionManager stateManager = new RuleStateTransitionManager();

        configService = new IntegrationChannelConfigService(
                channelRepository,
                parser,
                mappingEngine,
                ruleDispatcher,
                stateManager,
                objectMapper
        );

        controller = new IntegrationChannelConfigController(configService);
    }

    @Test
    void testAiSchemaEndpoint() {
        ResponseEntity<Map<String, Object>> response = controller.getAiSchema();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> schema = response.getBody();
        assertNotNull(schema);
        assertTrue(schema.containsKey("supportedDirections"));
        assertTrue(schema.containsKey("supportedHandshakeModes"));
        assertTrue(schema.containsKey("supportedRuleTypes"));
    }

    @Test
    void testCreateChannel() {
        IntegrationChannelDto dto = IntegrationChannelDto.builder()
                .channelCode("AI_CONFIGURED_CHANNEL")
                .channelName("AI Configured Inbound")
                .direction("INGRESS")
                .domain("INBOUND")
                .handshakeConfig(HandshakeConfig.builder().mode(HandshakeMode.ASYNC_CALLBACK).build())
                .build();

        when(channelRepository.existsByChannelCode("AI_CONFIGURED_CHANNEL")).thenReturn(false);
        when(channelRepository.save(any(IntegrationChannelEntity.class))).thenAnswer(inv -> {
            IntegrationChannelEntity e = inv.getArgument(0);
            return e;
        });

        ResponseEntity<IntegrationChannelDto> response = controller.createChannel(dto);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("AI_CONFIGURED_CHANNEL", response.getBody().getChannelCode());
    }

    @Test
    void testDryRunValidationPassScenario() {
        IntegrationChannelDto candidateConfig = IntegrationChannelDto.builder()
                .channelCode("TEST_CHANNEL")
                .channelName("Test Channel")
                .defaultSuccessState("ACCEPTED")
                .mappingRules(List.of(
                        FieldMappingRule.builder().sourcePath("$.palletLpn").targetField("palletLpn").required(true).build(),
                        FieldMappingRule.builder().sourcePath("$.weightKg").targetField("weightKg").dataType("NUMBER").build()
                ))
                .validationRules(List.of(
                        ValidationRule.builder()
                                .id("R_WEIGHT")
                                .type("NUMERIC_COMPARISON")
                                .field("weightKg")
                                .operator("BETWEEN_INCLUSIVE")
                                .min(10.0)
                                .max(1000.0)
                                .build()
                ))
                .build();

        String sampleJson = """
                {
                    "palletLpn": "PLT-AI-01",
                    "weightKg": 450.0
                }
                """;

        ChannelDryRunRequest req = ChannelDryRunRequest.builder()
                .channelConfig(candidateConfig)
                .samplePayload(sampleJson)
                .build();

        ResponseEntity<ChannelDryRunResponse> response = controller.dryRunValidation(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        ChannelDryRunResponse body = response.getBody();
        assertNotNull(body);
        assertTrue(body.isValid());
        assertEquals("JSON", body.getDetectedFormat());
        assertEquals("PLT-AI-01", body.getMappedCanonicalFields().get("palletLpn"));
        assertEquals("ACCEPTED", body.getResolvedFinalState());
    }

    @Test
    void testDryRunValidationFailureScenario() {
        IntegrationChannelDto candidateConfig = IntegrationChannelDto.builder()
                .channelCode("TEST_CHANNEL")
                .channelName("Test Channel")
                .defaultSuccessState("ACCEPTED")
                .mappingRules(List.of(
                        FieldMappingRule.builder().sourcePath("$.weightKg").targetField("weightKg").dataType("NUMBER").build()
                ))
                .validationRules(List.of(
                        ValidationRule.builder()
                                .id("R_WEIGHT")
                                .type("NUMERIC_COMPARISON")
                                .field("weightKg")
                                .operator("BETWEEN_INCLUSIVE")
                                .min(10.0)
                                .max(500.0)
                                .onFailureState("REJECTED_OVERWEIGHT")
                                .build()
                ))
                .build();

        String sampleJson = """
                {
                    "weightKg": 800.0
                }
                """;

        ChannelDryRunRequest req = ChannelDryRunRequest.builder()
                .channelConfig(candidateConfig)
                .samplePayload(sampleJson)
                .build();

        ResponseEntity<ChannelDryRunResponse> response = controller.dryRunValidation(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        ChannelDryRunResponse body = response.getBody();
        assertNotNull(body);
        assertFalse(body.isValid());
        assertEquals("REJECTED_OVERWEIGHT", body.getResolvedFinalState());
    }
}
