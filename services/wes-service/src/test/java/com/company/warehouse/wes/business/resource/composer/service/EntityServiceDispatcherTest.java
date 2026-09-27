package com.company.warehouse.wes.business.resource.composer.service;

import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EntityServiceDispatcherTest {

    @Mock
    private ResourceManager resourceManager;

    @Mock
    private EntityServiceExecutor mockExecutor;

    private EntityServiceDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        dispatcher = new EntityServiceDispatcher(resourceManager, List.of(mockExecutor));
    }

    @Test
    @DisplayName("Dispatcher routes method to matching executor strategy")
    void testDispatchToMatchedExecutor() {
        ResourceResponseDto mockDto = ResourceResponseDto.builder()
                .resourceId("TEST-WMS")
                .name("Test WMS")
                .protocol("http")
                .host("127.0.0.1")
                .port(8080)
                .category("SOFTWARE")
                .effectiveProperties(Map.of("authType", "OAUTH2_BEARER"))
                .build();

        when(resourceManager.getResourceById("TEST-WMS")).thenReturn(mockDto);
        when(mockExecutor.supports("AUTHENTICATE", "http", "SOFTWARE")).thenReturn(true);
        when(mockExecutor.execute(any(ComposedEntityInstance.class), eq("AUTHENTICATE"), any()))
                .thenReturn(MethodExecutionResult.builder().success(true).statusCode(200).build());

        MethodExecutionResult result = dispatcher.execute("TEST-WMS", "AUTHENTICATE", Map.of());

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatusCode()).isEqualTo(200);
        verify(mockExecutor).execute(any(ComposedEntityInstance.class), eq("AUTHENTICATE"), any());
    }

    @Test
    @DisplayName("Dispatcher returns 404 when no executor supports the method")
    void testNoExecutorFound() {
        ResourceResponseDto mockDto = ResourceResponseDto.builder()
                .resourceId("TEST-WMS")
                .protocol("http")
                .category("SOFTWARE")
                .build();

        when(resourceManager.getResourceById("TEST-WMS")).thenReturn(mockDto);
        when(mockExecutor.supports(any(), any(), any())).thenReturn(false);

        MethodExecutionResult result = dispatcher.execute("TEST-WMS", "UNSUPPORTED_METHOD", Map.of());

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getStatusCode()).isEqualTo(404);
        assertThat(result.getMessage()).contains("No executor strategy registered");
    }
}
