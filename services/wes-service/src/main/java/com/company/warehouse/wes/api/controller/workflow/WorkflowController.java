package com.company.warehouse.wes.api.controller.workflow;

import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.api.dto.workflow.WorkflowDefinitionDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowExecutionLogDto;
import com.company.warehouse.wes.api.dto.workflow.WorkflowInstanceDto;
import com.company.warehouse.wes.business.workflow.WorkflowEngineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    @PostMapping("/trigger")
    public ResponseEntity<WorkflowInstanceDto> triggerWorkflow(@Valid @RequestBody TriggerWorkflowRequest request) {
        log.info("Triggering workflow: code='{}', entity='{}'", request.getWorkflowCode(), request.getEntityReference());
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

    @GetMapping("/instances")
    public ResponseEntity<List<WorkflowInstanceDto>> getInstances(
            @RequestParam(required = false) String workflowCode) {
        return ResponseEntity.ok(engineService.getInstances(workflowCode));
    }

    @GetMapping("/instances/{id}/logs")
    public ResponseEntity<List<WorkflowExecutionLogDto>> getInstanceLogs(@PathVariable UUID id) {
        return ResponseEntity.ok(engineService.getInstanceLogs(id));
    }
}
