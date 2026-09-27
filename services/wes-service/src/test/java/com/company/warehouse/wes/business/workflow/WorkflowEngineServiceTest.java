package com.company.warehouse.wes.business.workflow;

import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.api.dto.workflow.WorkflowInstanceDto;
import com.company.warehouse.wes.business.workflow.logging.WorkflowStructuredLogger;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeRegistry;
import com.company.warehouse.wes.business.workflow.node.control.AsyncGateHandler;
import com.company.warehouse.wes.business.workflow.node.control.TerminatorHandler;
import com.company.warehouse.wes.business.workflow.node.integration.ValidationHandler;
import com.company.warehouse.wes.business.workflow.routing.WorkflowEdgeRouter;
import com.company.warehouse.wes.data.entity.workflow.WorkflowDefinitionEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowExecutionLogEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowDefinitionRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowExecutionLogRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowInstanceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowEngineServiceTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;

    @Mock
    private WorkflowInstanceRepository instanceRepository;

    @Mock
    private WorkflowExecutionLogRepository logRepository;

    private ObjectMapper objectMapper;
    private WorkflowEngineService workflowEngineService;

    private static final String SAMPLE_WORKFLOW_GRAPH = """
            {
              "nodes": [
                { "id": "node_trigger", "type": "TRIGGER", "label": "Pallet Scan", "config": { "triggerEvent": "INBOUND_PALLET_SCANNED" } },
                { "id": "node_validate", "type": "VALIDATION", "label": "Validate Data", "config": { "validationType": "PALLET_MASTER_DATA" } },
                { "id": "node_gate", "type": "ASYNC_GATE", "label": "Wait WMS", "config": { "waitEvent": "WMS_PALLET_CONFIRMATION", "timeoutSeconds": 300 } },
                { "id": "node_complete", "type": "TERMINATOR", "label": "Done", "config": { "completionStatus": "COMPLETED" } }
              ],
              "edges": [
                { "id": "e1", "source": "node_trigger", "target": "node_validate" },
                { "id": "e2", "source": "node_validate", "target": "node_gate" },
                { "id": "e3", "source": "node_gate", "target": "node_complete" }
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        WorkflowStructuredLogger structuredLogger = new WorkflowStructuredLogger(logRepository, objectMapper);
        WorkflowEdgeRouter edgeRouter = new WorkflowEdgeRouter();
        WorkflowNodeRegistry nodeRegistry = new WorkflowNodeRegistry(List.of(
                new ValidationHandler(),
                new AsyncGateHandler(),
                new TerminatorHandler()
        ));

        workflowEngineService = new WorkflowEngineService(
                definitionRepository,
                instanceRepository,
                logRepository,
                nodeRegistry,
                edgeRouter,
                structuredLogger,
                objectMapper
        );
    }

    @Test
    @DisplayName("Trigger workflow pauses at ASYNC_GATE waiting for callback")
    void testTriggerWorkflowPausesAtAsyncGate() {
        UUID defId = UUID.randomUUID();
        WorkflowDefinitionEntity defEntity = WorkflowDefinitionEntity.builder()
                .id(defId)
                .workflowCode("WF_TEST_INBOUND")
                .name("Test Inbound Workflow")
                .active(true)
                .canvasGraph(SAMPLE_WORKFLOW_GRAPH)
                .build();

        when(definitionRepository.findByWorkflowCode("WF_TEST_INBOUND"))
                .thenReturn(Optional.of(defEntity));

        when(instanceRepository.save(any(WorkflowInstanceEntity.class)))
                .thenAnswer(invocation -> {
                    WorkflowInstanceEntity inst = invocation.getArgument(0);
                    if (inst.getId() == null) {
                        inst.setId(UUID.randomUUID());
                    }
                    return inst;
                });

        TriggerWorkflowRequest request = TriggerWorkflowRequest.builder()
                .workflowCode("WF_TEST_INBOUND")
                .entityReference("PLT-TEST-001")
                .initialContext(new HashMap<>(Map.of("sku", "SKU-999", "quantity", 25)))
                .build();

        WorkflowInstanceDto instanceDto = workflowEngineService.triggerWorkflow(request);

        assertThat(instanceDto).isNotNull();
        assertThat(instanceDto.getStatus()).isEqualTo("WAITING_CALLBACK");
        assertThat(instanceDto.getCurrentNodeId()).isEqualTo("node_gate");
        assertThat(instanceDto.getCorrelationKey()).isNotNull().startsWith("CORR-");

        // Verify execution logs recorded
        verify(logRepository, atLeastOnce()).save(any(WorkflowExecutionLogEntity.class));
    }

    @Test
    @DisplayName("Process callback successfully resumes and completes workflow")
    void testProcessCallbackResumesWorkflow() {
        UUID instanceId = UUID.randomUUID();
        String corrKey = "CORR-TEST-123456";

        WorkflowDefinitionEntity defEntity = WorkflowDefinitionEntity.builder()
                .id(UUID.randomUUID())
                .workflowCode("WF_TEST_INBOUND")
                .name("Test Inbound Workflow")
                .active(true)
                .canvasGraph(SAMPLE_WORKFLOW_GRAPH)
                .build();

        WorkflowInstanceEntity instance = WorkflowInstanceEntity.builder()
                .id(instanceId)
                .workflowCode("WF_TEST_INBOUND")
                .status("WAITING_CALLBACK")
                .currentNodeId("node_gate")
                .correlationKey(corrKey)
                .contextData("{\"palletLpn\":\"PLT-TEST-001\"}")
                .build();

        when(instanceRepository.findByCorrelationKey(corrKey)).thenReturn(Optional.of(instance));
        when(definitionRepository.findByWorkflowCode("WF_TEST_INBOUND")).thenReturn(Optional.of(defEntity));
        when(instanceRepository.save(any(WorkflowInstanceEntity.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> callbackPayload = Map.of("wmsStatus", "STORED", "aisle", "A-04", "shelf", "S-12");

        WorkflowInstanceDto result = workflowEngineService.handleCallback(corrKey, callbackPayload);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getCurrentNodeId()).isEqualTo("node_complete");

        ArgumentCaptor<WorkflowExecutionLogEntity> logCaptor = ArgumentCaptor.forClass(WorkflowExecutionLogEntity.class);
        verify(logRepository, atLeastOnce()).save(logCaptor.capture());
        assertThat(logCaptor.getAllValues()).isNotEmpty();
    }
}
