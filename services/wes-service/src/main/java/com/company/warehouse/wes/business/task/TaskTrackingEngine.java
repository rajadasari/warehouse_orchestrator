package com.company.warehouse.wes.business.task;

import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.TaskOperationEntity;
import com.company.warehouse.wes.data.entity.WesTaskEntity;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.TaskOperationRepository;
import com.company.warehouse.wes.data.repository.WesTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskTrackingEngine {

    private final WesTaskRepository taskRepository;
    private final TaskOperationRepository operationRepository;
    private final PalletRepository palletRepository;

    @Transactional
    public WesTaskEntity createAndStartTask(PalletValidationContext context, List<PlannedOperation> plannedOps) {
        String taskNumber = "TSK-INB-" + System.currentTimeMillis() + "-" + (int) (Math.random() * 900 + 100);

        WesTaskEntity task = WesTaskEntity.builder()
                .taskNumber(taskNumber)
                .taskType("INBOUND_PUTAWAY")
                .palletLpn(context.getPalletLpn())
                .status("IN_PROGRESS")
                .currentOperationSeq(1)
                .sourceLocation(context.getSourceLocation())
                .submittedBy(context.getOperatorId())
                .build();

        WesTaskEntity savedTask = taskRepository.save(task);

        for (PlannedOperation plan : plannedOps) {
            TaskOperationEntity op = TaskOperationEntity.builder()
                    .task(savedTask)
                    .sequence(plan.getSequence())
                    .operationType(plan.getOperationType().name())
                    .handlerType(plan.getHandlerType())
                    .status(plan.getSequence() == 1 ? "IN_PROGRESS" : "PENDING")
                    .startedAt(plan.getSequence() == 1 ? Instant.now() : null)
                    .build();
            operationRepository.save(op);
        }

        log.info("Created and started Task {} for Pallet {} with {} operations",
                taskNumber, context.getPalletLpn(), plannedOps.size());

        return taskRepository.findById(savedTask.getId()).orElse(savedTask);
    }

    @Transactional
    public WesTaskEntity completeOperation(UUID taskId, int sequence, String outputResult, String allocatedLocation) {
        WesTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        TaskOperationEntity op = operationRepository.findByTaskIdAndSequence(taskId, sequence)
                .orElseThrow(() -> new IllegalArgumentException("Operation seq " + sequence + " not found on task " + taskId));

        op.setStatus("COMPLETED");
        op.setOutputResult(outputResult);
        op.setCompletedAt(Instant.now());
        operationRepository.save(op);

        if (allocatedLocation != null && !allocatedLocation.trim().isEmpty()) {
            task.setAllocatedLocation(allocatedLocation.trim());
        }

        int nextSeq = sequence + 1;
        Optional<TaskOperationEntity> nextOpOpt = operationRepository.findByTaskIdAndSequence(taskId, nextSeq);

        if (nextOpOpt.isPresent()) {
            TaskOperationEntity nextOp = nextOpOpt.get();
            nextOp.setStatus("IN_PROGRESS");
            nextOp.setStartedAt(Instant.now());
            operationRepository.save(nextOp);

            task.setCurrentOperationSeq(nextSeq);
            taskRepository.save(task);

            log.info("Task {} advanced from Op #{} to Op #{}: {}",
                    task.getTaskNumber(), sequence, nextSeq, nextOp.getOperationType());
        } else {
            // All operations completed
            task.setStatus("COMPLETED");
            task.setCompletedAt(Instant.now());
            taskRepository.save(task);

            // Sync wes.pallet
            palletRepository.findByPalletLpn(task.getPalletLpn()).ifPresent(pallet -> {
                pallet.setStatus("STORED");
                if (task.getAllocatedLocation() != null) {
                    pallet.setCurrentLocation(task.getAllocatedLocation());
                }
                palletRepository.save(pallet);
                log.info("Pallet {} inventory synchronized: Status=STORED, Location={}",
                        pallet.getPalletLpn(), pallet.getCurrentLocation());
            });

            log.info("Task {} successfully completed all operations!", task.getTaskNumber());
        }

        return taskRepository.findById(taskId).orElse(task);
    }

    @Transactional
    public WesTaskEntity failOperation(UUID taskId, int sequence, String errorMessage) {
        WesTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        TaskOperationEntity op = operationRepository.findByTaskIdAndSequence(taskId, sequence)
                .orElseThrow(() -> new IllegalArgumentException("Operation seq " + sequence + " not found on task " + taskId));

        op.setStatus("FAILED");
        op.setErrorMessage(errorMessage);
        op.setCompletedAt(Instant.now());
        operationRepository.save(op);

        task.setStatus("FAILED");
        taskRepository.save(task);

        log.error("Task {} failed at Op #{}: {}", task.getTaskNumber(), sequence, errorMessage);
        return task;
    }
}
