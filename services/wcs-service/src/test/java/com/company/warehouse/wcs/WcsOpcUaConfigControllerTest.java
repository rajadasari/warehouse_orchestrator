package com.company.warehouse.wcs;

import com.company.warehouse.wcs.api.controller.WcsOpcUaConfigController;
import com.company.warehouse.wcs.api.dto.*;
import com.company.warehouse.wcs.business.service.WcsOpcUaConfigService;
import com.company.warehouse.wcs.data.entity.*;
import com.company.warehouse.wcs.data.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WcsOpcUaConfigControllerTest {

    @Mock
    private OpcUaClientConfigRepository clientRepository;
    @Mock
    private OpcUaServerConfigRepository serverRepository;
    @Mock
    private OpcUaTagMappingRepository tagRepository;
    @Mock
    private OpcUaTagGroupRepository groupRepository;
    @Mock
    private OpcUaHandshakeFlowRepository flowRepository;
    @Mock
    private OpcUaStationTemplateRepository templateRepository;

    private WcsOpcUaConfigService configService;
    private WcsOpcUaConfigController controller;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        configService = new WcsOpcUaConfigService(
                clientRepository,
                serverRepository,
                tagRepository,
                groupRepository,
                flowRepository,
                templateRepository,
                objectMapper
        );
        controller = new WcsOpcUaConfigController(configService);
    }

    @Test
    void testGetAiSchemaSelfDescribing() {
        ResponseEntity<OpcUaAiSchemaDto> response = controller.getAiSchema();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        OpcUaAiSchemaDto schema = response.getBody();
        assertEquals("1.0.0-WCS-OPCUA", schema.version());
        assertTrue(schema.supportedDataTypes().contains("BOOLEAN"));
        assertTrue(schema.supportedDataTypes().contains("STRING"));
        assertTrue(schema.supportedDataTypes().contains("INT32"));
        assertTrue(schema.supportedSecurityPolicies().contains("BASIC256_SHA256"));
        assertTrue(schema.supportedAuthTypes().contains("ANONYMOUS"));
        assertTrue(schema.supportedAuthTypes().contains("USERNAME_PASSWORD"));
        assertTrue(schema.supportedAuthTypes().contains("X509_CERTIFICATE"));
        assertTrue(schema.handshakeStepTypes().contains("AWAIT_TRIGGER"));
        assertTrue(schema.handshakeStepTypes().contains("READ_GROUP"));
        assertTrue(schema.handshakeStepTypes().contains("WRITE_GROUP"));
        assertNotNull(schema.sampleWorkflowNode());
    }

    @Test
    void testValidateConfigValidAndInvalid() {
        // Valid client
        OpcUaValidateRequest validReq = OpcUaValidateRequest.builder()
                .targetType("CLIENT")
                .payload(Map.of("clientCode", "PLC_01", "endpointUrl", "opc.tcp://10.0.0.1:4840"))
                .build();
        ResponseEntity<OpcUaValidateResponse> validResp = controller.validateConfig(validReq);
        assertTrue(validResp.getBody().valid());

        // Invalid client (missing endpointUrl)
        OpcUaValidateRequest invalidReq = OpcUaValidateRequest.builder()
                .targetType("CLIENT")
                .payload(Map.of("clientCode", "PLC_01"))
                .build();
        ResponseEntity<OpcUaValidateResponse> invalidResp = controller.validateConfig(invalidReq);
        assertFalse(invalidResp.getBody().valid());
        assertFalse(invalidResp.getBody().errors().isEmpty());
    }

    @Test
    void testClientCrud() {
        OpcUaClientDto clientDto = OpcUaClientDto.builder()
                .clientCode("PLC_CONV_01")
                .endpointUrl("opc.tcp://192.168.1.100:4840")
                .securityPolicy("BASIC256_SHA256")
                .authType("USERNAME_PASSWORD")
                .username("wcs_app")
                .active(true)
                .build();

        OpcUaClientConfigEntity savedEntity = OpcUaClientConfigEntity.builder()
                .id(UUID.randomUUID())
                .clientCode("PLC_CONV_01")
                .endpointUrl("opc.tcp://192.168.1.100:4840")
                .securityPolicy("BASIC256_SHA256")
                .authType("USERNAME_PASSWORD")
                .username("wcs_app")
                .active(true)
                .build();

        when(clientRepository.findByClientCode("PLC_CONV_01")).thenReturn(Optional.empty());
        when(clientRepository.save(any(OpcUaClientConfigEntity.class))).thenReturn(savedEntity);

        ResponseEntity<OpcUaClientDto> postResp = controller.saveClient(clientDto);
        assertEquals(HttpStatus.CREATED, postResp.getStatusCode());
        assertEquals("PLC_CONV_01", postResp.getBody().clientCode());
    }

    @Test
    void testTagGroupCrud() {
        OpcUaTagGroupDto groupDto = OpcUaTagGroupDto.builder()
                .groupKey("DIVERT_TELEGRAM")
                .description("Divert spur scanner and solenoid tags")
                .equipmentCode("DIVERT_01")
                .tagKeys(List.of("PalletPresent", "Barcode", "DivertLane"))
                .build();

        OpcUaTagGroupEntity savedEntity = OpcUaTagGroupEntity.builder()
                .id(UUID.randomUUID())
                .groupKey("DIVERT_TELEGRAM")
                .description("Divert spur scanner and solenoid tags")
                .equipmentCode("DIVERT_01")
                .items(new ArrayList<>())
                .build();

        when(groupRepository.findByGroupKey("DIVERT_TELEGRAM")).thenReturn(Optional.empty());
        when(groupRepository.save(any(OpcUaTagGroupEntity.class))).thenReturn(savedEntity);

        ResponseEntity<OpcUaTagGroupDto> resp = controller.saveGroup(groupDto);
        assertEquals(HttpStatus.CREATED, resp.getStatusCode());
        assertEquals("DIVERT_TELEGRAM", resp.getBody().groupKey());
    }
}
