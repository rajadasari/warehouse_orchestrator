package com.company.warehouse.wes.api.controller.workflow;

import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.api.dto.workflow.WorkflowDefinitionDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowExecutionLogDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowInstanceDto;
import com.company.warehouse.wes.business.workflow.WorkflowEngineService;
import com.company.warehouse.wes.business.workflow.WorkflowExecutionMode;
import com.company.warehouse.wes.business.workflow.logging.WorkflowTraceDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/workflows")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkflowController {

    private final WorkflowEngineService engineService;

    // =========================================================================
    // EXECUTION MODE (REAL vs SIMULATION)
    // =========================================================================

    @GetMapping("/mode")
    public ResponseEntity<Map<String, String>> getExecutionMode() {
        WorkflowExecutionMode currentMode = engineService.getExecutionMode();
        return ResponseEntity.ok(Map.of(
                "mode", currentMode.name(),
                "description", currentMode == WorkflowExecutionMode.SIMULATION
                        ? "Simulation Mode: Using Virtual Digital Twin PLC & Emulated Gateways"
                        : "Real Mode: Live Industrial PLC, WCS, and Equipment I/O"
        ));
    }

    @PostMapping("/mode")
    public ResponseEntity<Map<String, String>> setExecutionMode(@RequestBody Map<String, String> request) {
        String modeStr = request.getOrDefault("mode", "REAL").toUpperCase();
        try {
            WorkflowExecutionMode targetMode = WorkflowExecutionMode.valueOf(modeStr);
            engineService.setExecutionMode(targetMode);
            log.info("Execution mode updated by operator to: {}", targetMode);
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "mode", targetMode.name(),
                    "message", "Workflow Engine execution mode switched to " + targetMode.name()
            ));
        } catch (IllegalArgumentException ex) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid mode: " + modeStr + ". Allowed values: REAL, SIMULATION");
        }
    }

    // =========================================================================
    // WORKFLOW DEFINITIONS
    // =========================================================================

    @GetMapping("/definitions")
    public ResponseEntity<List<WorkflowDefinitionDto>> getAllDefinitions() {
        return ResponseEntity.ok(engineService.getAllDefinitions());
    }

    @GetMapping("/definitions/{workflowCode}")
    public ResponseEntity<WorkflowDefinitionDto> getDefinitionByCode(@PathVariable String workflowCode) {
        return ResponseEntity.ok(engineService.getDefinitionByCode(workflowCode));
    }

    @PostMapping("/definitions")
    public ResponseEntity<WorkflowDefinitionDto> saveDefinition(@Valid @RequestBody WorkflowDefinitionDto dto) {
        log.info("Saving workflow definition: code='{}', name='{}'", dto.getWorkflowCode(), dto.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(engineService.saveDefinition(dto));
    }

    // =========================================================================
    // WORKFLOW TRIGGER & CALLBACKS
    // =========================================================================

    @PostMapping("/trigger")
    public ResponseEntity<WorkflowInstanceDto> triggerWorkflow(@Valid @RequestBody TriggerWorkflowRequest request) {
        log.info("Triggering workflow: code='{}', entity='{}', simulationMode='{}'",
                request.getWorkflowCode(), request.getEntityReference(), request.getSimulationMode());
        try {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(engineService.triggerWorkflow(request));
        } catch (IllegalArgumentException e) {
            log.warn("Workflow trigger rejected: {}", e.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            log.warn("Workflow state invalid: {}", e.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/callbacks/{correlationKey}")
    public ResponseEntity<WorkflowInstanceDto> handleCallback(
            @PathVariable String correlationKey,
            @RequestBody(required = false) Map<String, Object> payload) {
        log.info("Received callback for correlation key: '{}'", correlationKey);
        return ResponseEntity.ok(engineService.handleCallback(correlationKey, payload));
    }

    // =========================================================================
    // INSTANCE OBSERVABILITY & DIAGNOSTICS
    // =========================================================================

    @GetMapping("/instances")
    public ResponseEntity<List<WorkflowInstanceDto>> getInstances(
            @RequestParam(required = false) String workflowCode) {
        return ResponseEntity.ok(engineService.getInstances(workflowCode));
    }

    @GetMapping("/instances/{id}/logs")
    public ResponseEntity<List<WorkflowExecutionLogDto>> getInstanceLogs(@PathVariable UUID id) {
        return ResponseEntity.ok(engineService.getInstanceLogs(id));
    }

    @GetMapping("/instances/{id}/diagnostics")
    public ResponseEntity<WorkflowTraceDto> getExecutionTrace(@PathVariable UUID id) {
        return ResponseEntity.ok(engineService.getExecutionTrace(id));
    }
}
