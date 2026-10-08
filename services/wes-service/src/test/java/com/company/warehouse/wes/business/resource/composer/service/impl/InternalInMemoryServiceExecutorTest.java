package com.company.warehouse.wes.business.resource.composer.service.impl;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class InternalInMemoryServiceExecutorTest {

    private ResourceRepository resourceRepository;
    private ObjectMapper objectMapper;
    private InternalInMemoryServiceExecutor executor;

    @BeforeEach
    void setUp() {
        resourceRepository = Mockito.mock(ResourceRepository.class);
        objectMapper = new ObjectMapper();
        executor = new InternalInMemoryServiceExecutor(resourceRepository, objectMapper);
    }

    @Test
    @DisplayName("supports() returns true for passive and in-memory protocols")
    void testSupportsPassiveProtocols() {
        assertThat(executor.supports("ANY_METHOD", "INTERNAL", "LOGICAL")).isTrue();
        assertThat(executor.supports("ANY_METHOD", "PUSH", "SOFTWARE")).isTrue();
        assertThat(executor.supports("ANY_METHOD", "IN_MEMORY", "VIRTUAL")).isTrue();
        assertThat(executor.supports("ANY_METHOD", "PASSIVE", "PHYSICAL")).isTrue();
        assertThat(executor.supports("UPDATE_PROPERTIES", "REST", "SOFTWARE")).isTrue();
        assertThat(executor.supports("READ_TAG", "OPC_UA", "PHYSICAL")).isFalse();
    }

    @Test
    @DisplayName("execute UPDATE_PROPERTIES updates and persists custom properties")
    void testUpdateProperties() {
        String resId = "INTERNAL_TWIN_01";
        ComposedEntityInstance instance = ComposedEntityInstance.builder()
                .resourceId(resId)
                .protocol("INTERNAL")
                .customProperties(new HashMap<>(Map.of("temp", 25.0)))
                .effectiveProperties(new HashMap<>(Map.of("temp", 25.0)))
                .build();

        ResourceEntity entity = ResourceEntity.builder()
                .resourceId(resId)
                .customProperties("{\"temp\":25.0}")
                .build();

        when(resourceRepository.findByResourceId(resId)).thenReturn(Optional.of(entity));
        when(resourceRepository.save(any(ResourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> params = Map.of("temp", 31.5, "pressure", 101.3);
        MethodExecutionResult result = executor.execute(instance, "UPDATE_PROPERTIES", params);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatusCode()).isEqualTo(200);
        assertThat(result.getData()).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> dataMap = (Map<String, Object>) result.getData();
        assertThat(dataMap).containsKey("updatedProperties");
    }

    @Test
    @DisplayName("execute COMPUTE evaluates in-memory logic successfully")
    void testCompute() {
        String resId = "CALC_NODE_01";
        ComposedEntityInstance instance = ComposedEntityInstance.builder()
                .resourceId(resId)
                .protocol("INTERNAL")
                .customProperties(Map.of())
                .effectiveProperties(Map.of())
                .build();

        Map<String, Object> params = Map.of("factor", 1.5, "base", 100);
        MethodExecutionResult result = executor.execute(instance, "COMPUTE", params);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatusCode()).isEqualTo(200);
        assertThat(result.getData()).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> dataMap = (Map<String, Object>) result.getData();
        assertThat(dataMap).containsEntry("status", "COMPLETED");
    }

    @Test
    @DisplayName("execute dynamic Java bytecode with trace logging and property write-back")
    void testDynamicJavaExecution() {
        String resId = "DYNAMIC_TWIN_01";
        ComposedEntityInstance instance = ComposedEntityInstance.builder()
                .resourceId(resId)
                .protocol("INTERNAL")
                .customProperties(new HashMap<>(Map.of("currentSpeed", 0.0)))
                .effectiveProperties(new HashMap<>(Map.of("currentSpeed", 0.0)))
                .build();

        String javaCode = """
            double sp = ((Number) params.get("targetSpeed")).doubleValue();
            double scale = ((Number) params.get("scale")).doubleValue();
            return Double.valueOf(sp * scale);
        """;

        Map<String, Object> params = new HashMap<>();
        params.put("javaCode", javaCode);
        params.put("targetSpeed", 45.0);
        params.put("scale", 2.0);
        params.put("storeResultToProperty", "currentSpeed");

        MethodExecutionResult result = executor.execute(instance, "CALCULATE_SPEED", params);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatusCode()).isEqualTo(200);
        assertThat(result.getData()).isEqualTo(90.0);
        assertThat(result.getTraceLogs()).isNotEmpty();
        assertThat(result.getUpdatedProperties()).containsEntry("currentSpeed", 90.0);
    }
}
