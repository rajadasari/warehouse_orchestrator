package com.company.warehouse.wes.business.validation;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.TaskOperationEntity;
import com.company.warehouse.wes.data.entity.WesTaskEntity;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.TaskOperationRepository;
import com.company.warehouse.wes.data.repository.WesTaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskTrackingEngineTest {

    @Mock private WesTaskRepository taskRepo;
    @Mock private TaskOperationRepository operationRepo;
    @Mock private PalletRepository palletRepo;

    private TaskTrackingEngine engine;

    @BeforeEach
    void setUp() {
        engine = new TaskTrackingEngine(taskRepo, operationRepo, palletRepo);
    }

    @Test
    @DisplayName("Task Creation: Sets Op #1 to IN_PROGRESS and subsequent ops to PENDING")
    void testTaskCreation() {
        UUID taskId = UUID.randomUUID();
        WesTaskEntity savedTask = WesTaskEntity.builder()
                .id(taskId)
                .taskNumber("TSK-INB-1001")
                .palletLpn("PLT-2026-901")
                .status("IN_PROGRESS")
                .currentOperationSeq(1)
                .build();
        when(taskRepo.save(any(WesTaskEntity.class))).thenReturn(savedTask);
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(savedTask));

        InboundPalletSubmissionRequest req = InboundPalletSubmissionRequest.builder()
                .palletLpn("PLT-2026-901")
                .sourceLocation("RCV-01")
                .actualWeightKg(BigDecimal.valueOf(500))
                .operatorId("OP-01")
                .build();
        PalletValidationContext ctx = new PalletValidationContext(req);

        List<PlannedOperation> ops = List.of(
                new PlannedOperation(1, TaskOperationType.PROFILE_SCAN_WEIGH, "WCS", "Weigh and scan"),
                new PlannedOperation(2, TaskOperationType.WMS_BIN_ALLOCATION, "WMS", "Allocate bin"),
                new PlannedOperation(3, TaskOperationType.WMS_PUTAWAY_CONFIRM, "WMS", "Confirm putaway")
        );

        WesTaskEntity result = engine.createAndStartTask(ctx, ops);
        assertNotNull(result);
        assertEquals("IN_PROGRESS", result.getStatus());

        ArgumentCaptor<TaskOperationEntity> opCaptor = ArgumentCaptor.forClass(TaskOperationEntity.class);
        verify(operationRepo, org.mockito.Mockito.times(3)).save(opCaptor.capture());

        List<TaskOperationEntity> savedOps = opCaptor.getAllValues();
        assertEquals("IN_PROGRESS", savedOps.get(0).getStatus());
        assertEquals("PENDING", savedOps.get(1).getStatus());
        assertEquals("PENDING", savedOps.get(2).getStatus());
    }

    @Test
    @DisplayName("Operation Complete: Advances to next operation sequence")
    void testCompleteOperationAdvancement() {
        UUID taskId = UUID.randomUUID();
        WesTaskEntity task = WesTaskEntity.builder()
                .id(taskId)
                .taskNumber("TSK-INB-1002")
                .palletLpn("PLT-2026-902")
                .status("IN_PROGRESS")
                .currentOperationSeq(1)
                .build();

        TaskOperationEntity op1 = TaskOperationEntity.builder()
                .id(UUID.randomUUID())
                .task(task)
                .sequence(1)
                .operationType("WMS_BIN_ALLOCATION")
                .status("IN_PROGRESS")
                .build();

        TaskOperationEntity op2 = TaskOperationEntity.builder()
                .id(UUID.randomUUID())
                .task(task)
                .sequence(2)
                .operationType("CONVEYOR_TRANSPORT")
                .status("PENDING")
                .build();

        when(taskRepo.findById(taskId)).thenReturn(Optional.of(task));
        when(operationRepo.findByTaskIdAndSequence(taskId, 1)).thenReturn(Optional.of(op1));
        when(operationRepo.findByTaskIdAndSequence(taskId, 2)).thenReturn(Optional.of(op2));

        engine.completeOperation(taskId, 1, "{\"allocatedBin\": \"A-04-12\"}", "A-04-12");

        assertEquals("COMPLETED", op1.getStatus());
        assertEquals("IN_PROGRESS", op2.getStatus());
        assertEquals(2, task.getCurrentOperationSeq());
        assertEquals("A-04-12", task.getAllocatedLocation());
    }

    @Test
    @DisplayName("Final Operation Complete: Completes task and syncs pallet to STORED")
    void testFinalOperationCompletesTaskAndSyncsPallet() {
        UUID taskId = UUID.randomUUID();
        WesTaskEntity task = WesTaskEntity.builder()
                .id(taskId)
                .taskNumber("TSK-INB-1003")
                .palletLpn("PLT-2026-903")
                .status("IN_PROGRESS")
                .currentOperationSeq(2)
                .allocatedLocation("A-04-12")
                .build();

        TaskOperationEntity op2 = TaskOperationEntity.builder()
                .id(UUID.randomUUID())
                .task(task)
                .sequence(2)
                .operationType("WMS_PUTAWAY_CONFIRM")
                .status("IN_PROGRESS")
                .build();

        PalletEntity pallet = PalletEntity.builder()
                .id(UUID.randomUUID())
                .palletLpn("PLT-2026-903")
                .status("RECEIVED")
                .currentLocation("RCV-01")
                .build();

        when(taskRepo.findById(taskId)).thenReturn(Optional.of(task));
        when(operationRepo.findByTaskIdAndSequence(taskId, 2)).thenReturn(Optional.of(op2));
        when(operationRepo.findByTaskIdAndSequence(taskId, 3)).thenReturn(Optional.empty()); // No more ops
        when(palletRepo.findByPalletLpn("PLT-2026-903")).thenReturn(Optional.of(pallet));

        engine.completeOperation(taskId, 2, "{\"status\": \"CONFIRMED\"}", "A-04-12");

        assertEquals("COMPLETED", op2.getStatus());
        assertEquals("COMPLETED", task.getStatus());

        // Verify Pallet sync
        ArgumentCaptor<PalletEntity> palletCaptor = ArgumentCaptor.forClass(PalletEntity.class);
        verify(palletRepo).save(palletCaptor.capture());
        assertEquals("STORED", palletCaptor.getValue().getStatus());
        assertEquals("A-04-12", palletCaptor.getValue().getCurrentLocation());
    }
}
