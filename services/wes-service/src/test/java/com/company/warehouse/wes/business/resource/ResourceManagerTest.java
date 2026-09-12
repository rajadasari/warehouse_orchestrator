package com.company.warehouse.wes.business.resource;

import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceManagerTest {

    @Mock
    private ResourceRepository resourceRepository;

    private ObjectMapper objectMapper;
    private ResourceManager resourceManager;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        resourceManager = new ResourceManager(resourceRepository, objectMapper);
    }

    @Test
    @DisplayName("Create Logiqs Ambient WMS Software resource with IP in custom properties")
    void testCreateLogiqsAmbientWmsResource() {
        ResourceRequestDto request = ResourceRequestDto.builder()
                .resourceId("LOGIQS-AMBIENT-WMS")
                .name("Logiqs Ambient WMS")
                .type("Software")
                .ip("192.168.1.100")
                .customProperties(Map.of("port", 8089, "protocol", "REST"))
                .build();

        when(resourceRepository.existsByResourceId("LOGIQS-AMBIENT-WMS")).thenReturn(false);

        ResourceEntity savedEntity = ResourceEntity.builder()
                .id(UUID.randomUUID())
                .resourceId("LOGIQS-AMBIENT-WMS")
                .name("Logiqs Ambient WMS")
                .type("SOFTWARE")
                .status("ACTIVE")
                .customProperties("{\"ip\":\"192.168.1.100\",\"port\":8089,\"protocol\":\"REST\"}")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(resourceRepository.save(any(ResourceEntity.class))).thenReturn(savedEntity);

        ResourceResponseDto response = resourceManager.createResource(request);

        assertThat(response.getResourceId()).isEqualTo("LOGIQS-AMBIENT-WMS");
        assertThat(response.getName()).isEqualTo("Logiqs Ambient WMS");
        assertThat(response.getType()).isEqualTo("SOFTWARE");
        assertThat(response.getIp()).isEqualTo("192.168.1.100");
        assertThat(response.getCustomProperties()).containsEntry("ip", "192.168.1.100");
        assertThat(response.getCustomProperties()).containsEntry("port", 8089);

        ArgumentCaptor<ResourceEntity> captor = ArgumentCaptor.forClass(ResourceEntity.class);
        verify(resourceRepository).save(captor.capture());
        ResourceEntity captured = captor.getValue();
        assertThat(captured.getResourceId()).isEqualTo("LOGIQS-AMBIENT-WMS");
        assertThat(captured.getType()).isEqualTo("SOFTWARE");
    }

    @Test
    @DisplayName("Get Resource IP by resourceId")
    void testGetResourceIp() {
        ResourceEntity entity = ResourceEntity.builder()
                .id(UUID.randomUUID())
                .resourceId("LOGIQS-AMBIENT-WMS")
                .name("Logiqs Ambient WMS")
                .type("SOFTWARE")
                .status("ACTIVE")
                .customProperties("{\"ip\":\"10.20.30.40\"}")
                .build();

        when(resourceRepository.findByResourceId("LOGIQS-AMBIENT-WMS")).thenReturn(Optional.of(entity));

        Optional<String> ipOpt = resourceManager.getResourceIp("LOGIQS-AMBIENT-WMS");

        assertThat(ipOpt).isPresent();
        assertThat(ipOpt.get()).isEqualTo("10.20.30.40");
    }
}
