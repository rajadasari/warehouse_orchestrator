package com.company.warehouse.wes.business.workflow.node.equipment;

import com.company.warehouse.wes.business.resource.composer.service.EntityServiceDispatcher;
import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceActionHandlerTest {

    @Mock
    private EntityServiceDispatcher entityServiceDispatcher;

    private ResourceActionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ResourceActionHandler(entityServiceDispatcher);
    }

    @Test
    @DisplayName("Supports RESOURCE_ACTION and EQUIPMENT_METHOD")
    void testSupports() {
        assertThat(handler.supports("RESOURCE_ACTION")).isTrue();
        assertThat(handler.supports("EQUIPMENT_METHOD")).isTrue();
        assertThat(handler.supports("OTHER")).isFalse();
    }

    @Test
    @DisplayName("Execute RESOURCE_ACTION in live mode resolves parameters and calls dispatcher")
    void testExecuteLiveResourceAction() {
        Map<String, Object> nodeConfig = Map.of(
                "resourceId", "CONV-01",
                "methodName", "START_MOTOR",
                "outputVariable", "motorResult",
                "parameterBindings", Map.of(
                        "speed", "#{context.targetSpeed}",
                        "directParam", "CONSTANT_VALUE"
                )
        );

        Map<String, Object> workflowContext = Map.of(
                "targetSpeed", 1.85,
                "palletLpn", "LPN-998877"
        );

        WorkflowNodeExecutionContext ctx = new WorkflowNodeExecutionContext(
                "node-1",
                "RESOURCE_ACTION",
                "Start Conveyor 01",
                nodeConfig,
                workflowContext,
                null,
                false // simulationMode = false
        );

        when(entityServiceDispatcher.execute(eq("CONV-01"), eq("START_MOTOR"), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn(MethodExecutionResult.builder()
                        .success(true)
                        .resourceId("CONV-01")
                        .methodName("START_MOTOR")
                        .data(Map.of("writtenValue", 1.85, "statusCode", "GOOD"))
                        .statusCode(200)
                        .build());

        NodeExecutionResult result = handler.execute(ctx);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getOutputData()).containsKey("motorResult");
        assertThat(result.getOutputData()).containsEntry("lastExecutedMethod", "START_MOTOR");
        assertThat(result.getOutputData()).containsEntry("lastExecutedResource", "CONV-01");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(entityServiceDispatcher).execute(eq("CONV-01"), eq("START_MOTOR"), paramsCaptor.capture());

        Map<String, Object> captured = paramsCaptor.getValue();
        assertThat(captured).containsEntry("speed", 1.85);
        assertThat(captured).containsEntry("directParam", "CONSTANT_VALUE");
    }

    @Test
    @DisplayName("Execute RESOURCE_ACTION in simulation mode returns simulated success")
    void testExecuteSimulatedResourceAction() {
        Map<String, Object> nodeConfig = Map.of(
                "resourceId", "AMR-01",
                "methodName", "NAVIGATE_TO_NODE",
                "outputVariable", "navResult",
                "parameterBindings", Map.of("nodeId", "STATION-A")
        );

        WorkflowNodeExecutionContext ctx = new WorkflowNodeExecutionContext(
                "node-2",
                "RESOURCE_ACTION",
                "Navigate AMR",
                nodeConfig,
                Map.of(),
                null,
                true // simulationMode = true
        );

        NodeExecutionResult result = handler.execute(ctx);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getOutputData()).containsKey("navResult");
        @SuppressWarnings("unchecked")
        Map<String, Object> nav = (Map<String, Object>) result.getOutputData().get("navResult");
        assertThat(nav).containsEntry("status", "SIMULATED_SUCCESS");
        assertThat(nav).containsEntry("simulated", true);
    }
}
