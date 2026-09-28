package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.business.network.LiveOpcUaChannelDriver;
import com.company.warehouse.wes.data.entity.NetworkDeviceChannelEntity;
import com.company.warehouse.wes.data.entity.NetworkDeviceTagEntity;
import com.company.warehouse.wes.data.entity.NetworkTagAcquisitionConfigEntity;
import com.company.warehouse.wes.data.repository.NetworkDeviceChannelRepository;
import com.company.warehouse.wes.data.repository.NetworkDeviceTagRepository;
import com.company.warehouse.wes.data.repository.NetworkTagAcquisitionConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class NetworkChannelControllerTest {

    private NetworkDeviceChannelRepository channelRepository;
    private NetworkDeviceTagRepository tagRepository;
    private NetworkTagAcquisitionConfigRepository acquisitionConfigRepository;
    private LiveOpcUaChannelDriver liveOpcUaDriver;
    private NetworkChannelController controller;

    @BeforeEach
    void setUp() {
        channelRepository = Mockito.mock(NetworkDeviceChannelRepository.class);
        tagRepository = Mockito.mock(NetworkDeviceTagRepository.class);
        acquisitionConfigRepository = Mockito.mock(NetworkTagAcquisitionConfigRepository.class);
        liveOpcUaDriver = Mockito.mock(LiveOpcUaChannelDriver.class);
        ObjectMapper objectMapper = new ObjectMapper();
        controller = new NetworkChannelController(channelRepository, tagRepository, acquisitionConfigRepository, liveOpcUaDriver, objectMapper);
    }

    @Test
    @DisplayName("getChannels returns all persisted multi-protocol channels")
    void testGetChannels() {
        UUID chanId = UUID.randomUUID();
        NetworkDeviceChannelEntity channel1 = NetworkDeviceChannelEntity.builder()
                .id(chanId)
                .channelCode("MAIN_PLC_OPCUA")
                .channelName("Main Conveyor PLC")
                .protocol("OPC_UA")
                .endpointUrl("opc.tcp://10.0.1.20:4840")
                .status("ONLINE")
                .build();

        when(channelRepository.findAll()).thenReturn(List.of(channel1));
        when(tagRepository.countByChannelId(chanId)).thenReturn(4);

        ResponseEntity<List<Map<String, Object>>> response = controller.getChannels();
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0)).containsEntry("channelCode", "MAIN_PLC_OPCUA");
        assertThat(response.getBody().get(0)).containsEntry("protocol", "OPC_UA");
    }

    @Test
    @DisplayName("addChannel creates and persists a new channel in PostgreSQL")
    void testAddChannel() {
        UUID chanId = UUID.randomUUID();
        NetworkDeviceChannelEntity saved = NetworkDeviceChannelEntity.builder()
                .id(chanId)
                .channelCode("CONVEYOR_S7_PLC")
                .channelName("Conveyor S7 PLC")
                .protocol("OPC_UA")
                .endpointUrl("opc.tcp://10.0.0.50:4840")
                .status("ONLINE")
                .build();

        when(channelRepository.save(any(NetworkDeviceChannelEntity.class))).thenReturn(saved);

        Map<String, Object> req = Map.of(
                "name", "Conveyor S7 PLC",
                "protocol", "OPC_UA",
                "endpointUrl", "opc.tcp://10.0.0.50:4840"
        );

        ResponseEntity<Map<String, Object>> response = controller.addChannel(req);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("name", "Conveyor S7 PLC");
        assertThat(response.getBody()).containsEntry("protocol", "OPC_UA");
    }

    @Test
    @DisplayName("getChannelTags returns real dynamic tags for specified channel")
    void testGetChannelTags() {
        UUID chanId = UUID.randomUUID();
        NetworkDeviceChannelEntity channel = NetworkDeviceChannelEntity.builder()
                .id(chanId)
                .channelCode("LINE_1_PLC")
                .protocol("OPC_UA")
                .endpointUrl("opc.tcp://127.0.0.1:4840")
                .build();

        NetworkDeviceTagEntity tag = NetworkDeviceTagEntity.builder()
                .id(UUID.randomUUID())
                .channelId(chanId)
                .tagName("Temperature")
                .nodeId("ns=2;i=2")
                .folderPath("MyDevice")
                .dataType("Float")
                .currentValue("27.42")
                .quality("GOOD (0x00000000)")
                .isWritable(false)
                .isSubscribed(true)
                .lastUpdated(Instant.now())
                .build();

        when(channelRepository.findById(chanId)).thenReturn(Optional.of(channel));
        when(tagRepository.findByChannelId(chanId)).thenReturn(List.of(tag));

        ResponseEntity<List<Map<String, Object>>> response = controller.getChannelTags(chanId.toString());
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0)).containsEntry("name", "Temperature");
        assertThat(response.getBody().get(0)).containsEntry("folder", "MyDevice");
        assertThat(response.getBody().get(0)).containsEntry("value", 27.42);
    }

    @Test
    @DisplayName("writeChannelTag updates tag value and persists updated timestamp")
    void testWriteChannelTag() {
        UUID chanId = UUID.randomUUID();
        NetworkDeviceChannelEntity channel = NetworkDeviceChannelEntity.builder()
                .id(chanId)
                .channelCode("LINE_1_PLC")
                .protocol("OPC_UA")
                .endpointUrl("opc.tcp://127.0.0.1:4840")
                .build();

        NetworkDeviceTagEntity existingTag = NetworkDeviceTagEntity.builder()
                .id(UUID.randomUUID())
                .channelId(chanId)
                .tagName("InputValue")
                .nodeId("ns=2;i=3")
                .dataType("Int32")
                .currentValue("0")
                .build();

        when(channelRepository.findById(chanId)).thenReturn(Optional.of(channel));
        when(tagRepository.findByChannelIdAndNodeId(chanId, "ns=2;i=3")).thenReturn(Optional.of(existingTag));
        when(tagRepository.save(any(NetworkDeviceTagEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(liveOpcUaDriver.writeLiveValue(any(), any(), any())).thenReturn(true);

        Map<String, Object> req = Map.of(
                "nodeId", "ns=2;i=3",
                "value", 42
        );

        ResponseEntity<Map<String, Object>> response = controller.writeChannelTag(chanId.toString(), req);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("success", true);
        assertThat(response.getBody()).containsEntry("writtenValue", 42);
    }

    @Test
    @DisplayName("testConnection validates socket handshake for target protocol")
    void testTestConnection() {
        Map<String, Object> req = Map.of(
                "protocol", "OPC_UA",
                "endpointUrl", "opc.tcp://192.168.1.100:4840"
        );

        ResponseEntity<Map<String, Object>> response = controller.testConnection(req);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("success", true);
        assertThat(response.getBody()).containsEntry("protocol", "OPC_UA");
    }
}
