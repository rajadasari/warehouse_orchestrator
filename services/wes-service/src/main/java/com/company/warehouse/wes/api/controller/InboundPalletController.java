package com.company.warehouse.wes.api.controller;

import com.company.warehouse.common.core.enums.ValidationOutcome;
import com.company.warehouse.wes.api.dto.InboundExecutionResponse;
import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.business.process.trigger.ProcessTriggerRouter;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import com.company.warehouse.wes.business.validation.coordinator.PalletValidationCoordinator;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.data.entity.WesTaskEntity;
import com.company.warehouse.wes.data.repository.WesTaskRepository;
import jakarta.validation.Valid;
import lombok.Data;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/pallets/inbound")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InboundPalletController {

    private final PalletValidationCoordinator validationCoordinator;
    private final ProcessTriggerRouter processRouter;
    private final WesTaskRepository taskRepository;
    private final TaskTrackingEngine taskTrackingEngine;

    /**
     * Pre-validation endpoint for Handheld / Operator UI.
     * Evaluates all 3 tiers without persisting to database.
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidationResult> validateInboundPallet(
            @Valid @RequestBody InboundPalletSubmissionRequest request) {
        log.debug("POST /api/v1/wes/pallets/inbound/validate: Validating pallet LPN='{}'", request.getPalletLpn());
        PalletValidationContext context = new PalletValidationContext(request);
        ValidationResult result = validationCoordinator.validate(request, context);
        return ResponseEntity.ok(result);
    }

    /**
     * Ingestion submission endpoint.
     * Validates -> Persists Pallet -> Creates Task with Operations -> Starts execution.
     */
    @PostMapping("/submit")
    public ResponseEntity<InboundExecutionResponse> submitInboundPallet(
            @Valid @RequestBody InboundPalletSubmissionRequest request) {
        log.info("POST /api/v1/wes/pallets/inbound/submit: Submitting pallet LPN='{}', loadType='{}'",
                request.getPalletLpn(), request.getLoadType());
        PalletValidationContext context = new PalletValidationContext(request);
        ValidationResult validationResult = validationCoordinator.validate(request, context);

        InboundExecutionResponse response = processRouter.routeAndTrigger(context, validationResult);

        if (response.getOutcome() == ValidationOutcome.REJECT) {
            log.warn("POST /api/v1/wes/pallets/inbound/submit: Pallet LPN='{}' REJECTED", request.getPalletLpn());
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(response);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get task details with all operations and current progress.
     */
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<WesTaskEntity> getTaskById(@PathVariable UUID taskId) {
        log.debug("GET /api/v1/wes/pallets/inbound/tasks/{}: Fetching task details", taskId);
        return taskRepository.findById(taskId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Complete an operation on a task (e.g. WCS transport callback, WMS bin callback).
     */
    @PostMapping("/tasks/{taskId}/operations/{sequence}/complete")
    public ResponseEntity<WesTaskEntity> completeOperation(
            @PathVariable UUID taskId,
            @PathVariable int sequence,
            @RequestBody(required = false) CompleteOperationRequest request) {
        log.info("POST /api/v1/wes/pallets/inbound/tasks/{}/operations/{}/complete", taskId, sequence);
        String resultPayload = request != null ? request.getOutputResult() : "{}";
        String allocatedLocation = request != null ? request.getAllocatedLocation() : null;

        WesTaskEntity updatedTask = taskTrackingEngine.completeOperation(taskId, sequence, resultPayload, allocatedLocation);
        return ResponseEntity.ok(updatedTask);
    }

    /**
     * Fail an operation on a task.
     */
    @PostMapping("/tasks/{taskId}/operations/{sequence}/fail")
    public ResponseEntity<WesTaskEntity> failOperation(
            @PathVariable UUID taskId,
            @PathVariable int sequence,
            @RequestBody(required = false) FailOperationRequest request) {
        String reason = request != null && request.getReason() != null ? request.getReason() : "Operation failed";
        log.warn("POST /api/v1/wes/pallets/inbound/tasks/{}/operations/{}/fail: reason='{}'", taskId, sequence, reason);
        WesTaskEntity updatedTask = taskTrackingEngine.failOperation(taskId, sequence, reason);
        return ResponseEntity.ok(updatedTask);
    }

    @Data
    public static class CompleteOperationRequest {
        private String outputResult;
        private String allocatedLocation;
    }

    @Data
    public static class FailOperationRequest {
        private String reason;
    }
}
