package com.company.warehouse.wes.business.workflow;

import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.api.dto.workflow.WorkflowInstanceDto;
import com.company.warehouse.wes.business.workflow.logging.WorkflowStructuredLogger;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeRegistry;
import com.company.warehouse.wes.business.workflow.node.control.TerminatorHandler;
import com.company.warehouse.wes.business.workflow.node.integration.MathOperationHandler;
import com.company.warehouse.wes.business.workflow.node.integration.ValidationHandler;
import com.company.warehouse.wes.business.workflow.node.mes.InventoryAllocateHandler;
import com.company.warehouse.wes.business.workflow.node.mes.QualityInspectionHandler;
import com.company.warehouse.wes.business.workflow.routing.WorkflowEdgeRouter;
import com.company.warehouse.wes.data.entity.workflow.WorkflowDefinitionEntity;
import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowDefinitionRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowExecutionLogRepository;
import com.company.warehouse.wes.data.repository.workflow.WorkflowInstanceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowSimulationModeTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;

    @Mock
    private WorkflowInstanceRepository instanceRepository;

    @Mock
    private WorkflowExecutionLogRepository logRepository;

    @Mock
    private PalletRepository palletRepository;

    @Mock
    private ItemMasterRepository itemMasterRepository;

    private ObjectMapper objectMapper;
    private WorkflowEngineService engineService;

    private static final String SIMULATION_WORKFLOW_GRAPH = """
            {
              "nodes": [
                { "id": "trig_01", "type": "TRIGGER", "label": "Start Sim", "config": {} },
                { "id": "math_01", "type": "MATH", "label": "Tare Offset", "config": { "operation": "SUBTRACT", "operandA": "context.grossWeight", "operandB": "context.tareWeight", "outputVariable": "netWeight" } },
                { "id": "val_01", "type": "VALIDATION", "label": "Weight Check", "config": { "validationScope": "WEIGHT", "requiredFields": ["palletLpn", "grossWeight"] } },
                { "id": "qc_01", "type": "QUALITY_INSPECTION", "label": "QC Station", "config": { "inspectionCode": "QC_VISION_SIM" } },
                { "id": "done_01", "type": "TERMINATOR", "label": "End", "config": {} }
              ],
              "edges": [
                { "id": "e1", "source": "trig_01", "target": "math_01" },
                { "id": "e2", "source": "math_01", "target": "val_01" },
                { "id": "e3", "source": "val_01", "target": "qc_01" },
                { "id": "e4", "source": "qc_01", "target": "done_01" }
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        WorkflowStructuredLogger structuredLogger = new WorkflowStructuredLogger(logRepository, objectMapper);
        WorkflowEdgeRouter edgeRouter = new WorkflowEdgeRouter();

        WorkflowNodeRegistry nodeRegistry = new WorkflowNodeRegistry(List.of(
                new MathOperationHandler(),
                new ValidationHandler(),
                new QualityInspectionHandler(),
                new InventoryAllocateHandler(),
                new TerminatorHandler()
        ));

        com.company.warehouse.wes.business.workflow.validation.WorkflowGraphValidator graphValidator =
                new com.company.warehouse.wes.business.workflow.validation.WorkflowGraphValidator(nodeRegistry);

        engineService = new WorkflowEngineService(
                definitionRepository,
                instanceRepository,
                logRepository,
                nodeRegistry,
                edgeRouter,
                structuredLogger,
                graphValidator,
                objectMapper
        );
    }

    @Test
    @DisplayName("Engine mode defaults to REAL and can be toggled to SIMULATION")
    void testExecutionModeToggle() {
        assertThat(engineService.getExecutionMode()).isEqualTo(WorkflowExecutionMode.REAL);

        engineService.setExecutionMode(WorkflowExecutionMode.SIMULATION);
        assertThat(engineService.getExecutionMode()).isEqualTo(WorkflowExecutionMode.SIMULATION);

        engineService.setExecutionMode(WorkflowExecutionMode.REAL);
        assertThat(engineService.getExecutionMode()).isEqualTo(WorkflowExecutionMode.REAL);
    }

    @Test
    @DisplayName("Workflow runs end-to-end under SIMULATION mode without live equipment")
    void testEndToEndSimulationWorkflow() {
        UUID defId = UUID.randomUUID();
        WorkflowDefinitionEntity defEntity = WorkflowDefinitionEntity.builder()
                .id(defId)
                .workflowCode("WF_MES_SIMULATION_LINE")
                .name("MES Digital Twin Simulation")
                .active(true)
                .canvasGraph(SIMULATION_WORKFLOW_GRAPH)
                .build();

        when(definitionRepository.findByWorkflowCode("WF_MES_SIMULATION_LINE"))
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
                .workflowCode("WF_MES_SIMULATION_LINE")
                .entityReference("PLT-SIM-999")
                .simulationMode(true) // explicit simulation flag
                .initialContext(Map.of(
                        "palletLpn", "PLT-SIM-999",
                        "grossWeight", 1250.0,
                        "tareWeight", 25.0
                ))
                .build();

        WorkflowInstanceDto result = engineService.triggerWorkflow(request);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getCurrentNodeId()).isEqualTo("done_01");

        Map<String, Object> ctx = result.getContextData();
        assertThat(ctx.get("isSimulated")).isEqualTo(true);
        assertThat(ctx.get("netWeight")).isEqualTo(1225.0);
        assertThat(ctx.get("validationOutcome")).isEqualTo("APPROVED");
        assertThat(ctx.get("qcInspectionOutcome")).isEqualTo("PASSED");
    }
}
