package com.company.warehouse.wes.business.validation;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.common.core.enums.ValidationOutcome;
import com.company.warehouse.wes.api.dto.InboundExecutionResponse;
import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.business.process.trigger.ProcessTriggerRouter;
import com.company.warehouse.wes.business.task.OperationCollectionResolver;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.coordinator.PalletValidationCoordinator;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.subvalidators.tier1.ItemMasterExistenceValidator;
import com.company.warehouse.wes.business.validation.subvalidators.tier1.PalletLpnDuplicateValidator;
import com.company.warehouse.wes.business.validation.subvalidators.tier1.PalletTypeExistenceValidator;
import com.company.warehouse.wes.business.validation.subvalidators.tier2.PalletWeightCapacityValidator;
import com.company.warehouse.wes.business.validation.subvalidators.tier2.SkuItemCompatibilityValidator;
import com.company.warehouse.wes.business.validation.subvalidators.tier3.AllergenSegregationValidator;
import com.company.warehouse.wes.business.validation.subvalidators.tier3.BatchExpiryPolicyValidator;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import com.company.warehouse.wes.data.entity.SkuMasterEntity;
import com.company.warehouse.wes.data.entity.WesTaskEntity;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.PalletTypeMasterRepository;
import com.company.warehouse.wes.data.repository.SkuMasterRepository;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InboundValidationAndTaskEngineTest {

    @Mock private ItemMasterRepository itemRepo;
    @Mock private SkuMasterRepository skuRepo;
    @Mock private PalletTypeMasterRepository palletTypeRepo;
    @Mock private PalletRepository palletRepo;
    @Mock private WesTaskRepository taskRepo;
    @Mock private TaskOperationRepository operationRepo;

    private PalletValidationCoordinator coordinator;
    private OperationCollectionResolver operationResolver;
    private TaskTrackingEngine taskTrackingEngine;
    private ProcessTriggerRouter processRouter;

    private ItemMasterEntity itemEntity;
    private SkuMasterEntity skuEntity;
    private PalletTypeMasterEntity palletTypeEntity;

    @BeforeEach
    void setUp() {
        // Setup Sub-Validators
        ItemMasterExistenceValidator itemValidator = new ItemMasterExistenceValidator(itemRepo);
        PalletTypeExistenceValidator palletTypeValidator = new PalletTypeExistenceValidator(palletTypeRepo);
        PalletLpnDuplicateValidator lpnValidator = new PalletLpnDuplicateValidator(palletRepo);
        SkuItemCompatibilityValidator skuValidator = new SkuItemCompatibilityValidator(skuRepo);
        PalletWeightCapacityValidator weightValidator = new PalletWeightCapacityValidator();
        BatchExpiryPolicyValidator expiryValidator = new BatchExpiryPolicyValidator();
        AllergenSegregationValidator allergenValidator = new AllergenSegregationValidator();

        coordinator = new PalletValidationCoordinator(List.of(
                itemValidator, palletTypeValidator, lpnValidator,
                skuValidator, weightValidator, expiryValidator, allergenValidator
        ));

        operationResolver = new OperationCollectionResolver();
        taskTrackingEngine = new TaskTrackingEngine(taskRepo, operationRepo, palletRepo);
        com.company.warehouse.wes.business.process.flow.PalletFlowCoordinator flowCoordinator =
                new com.company.warehouse.wes.business.process.flow.PalletFlowCoordinator(List.of());
        processRouter = new ProcessTriggerRouter(operationResolver, taskTrackingEngine, palletRepo, flowCoordinator);

        // Standard Fixtures
        itemEntity = ItemMasterEntity.builder()
                .id(UUID.randomUUID())
                .itemCode("MAT-COCOA-01")
                .name("Cocoa Powder Pure")
                .status("ACTIVE")
                .customAttributes("{\"allergen\": \"none\"}")
                .build();

        skuEntity = SkuMasterEntity.builder()
                .id(UUID.randomUUID())
                .skuCode("SKU-COCOA-25KG")
                .item(itemEntity)
                .packageType("BAG")
                .unitsPerPackage(BigDecimal.valueOf(25))
                .isActive(true)
                .build();

        palletTypeEntity = PalletTypeMasterEntity.builder()
                .id(UUID.randomUUID())
                .code("EUR_WOOD")
                .name("Euro Pallet EPAL 1")
                .tareWeightKg(BigDecimal.valueOf(25.0))
                .maxPayloadKg(BigDecimal.valueOf(1500.0))
                .build();
    }

    @Test
    @DisplayName("Tier 1: Rejection on Unknown Item Code halts further validation")
    void testUnknownItemCodeRejection() {
        when(palletTypeRepo.findByCode("EUR_WOOD")).thenReturn(Optional.of(palletTypeEntity));
        when(palletRepo.findByPalletLpn("PLT-1001")).thenReturn(Optional.empty());
        when(itemRepo.findByItemCode("NON-EXISTENT")).thenReturn(Optional.empty());

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("PLT-1001")
                .itemCode("NON-EXISTENT")
                .palletTypeCode("EUR_WOOD")
                .sourceLocation("RCV-01")
                .actualWeightKg(BigDecimal.valueOf(500))
                .build();

        PalletValidationContext ctx = new PalletValidationContext(request);
        ValidationResult result = coordinator.validate(request, ctx);

        assertTrue(result.isRejected());
        assertEquals(ValidationOutcome.REJECT, result.getOutcome());
        assertEquals(1, result.getErrors().size());
        assertEquals("ITEM_NOT_FOUND", result.getErrors().get(0).getCode());

        // Process Router should reject without persisting pallet or task
        InboundExecutionResponse response = processRouter.routeAndTrigger(ctx, result);
        assertEquals("REJECTED", response.getStatus());
        verify(palletRepo, never()).save(any());
        verify(taskRepo, never()).save(any());
    }

    @Test
    @DisplayName("Tier 2: Rejection on Overweight Pallet (> tare + maxPayload)")
    void testOverweightPalletRejection() {
        when(palletTypeRepo.findByCode("EUR_WOOD")).thenReturn(Optional.of(palletTypeEntity));
        when(palletRepo.findByPalletLpn("PLT-1002")).thenReturn(Optional.empty());
        when(itemRepo.findByItemCode("MAT-COCOA-01")).thenReturn(Optional.of(itemEntity));
        when(skuRepo.findBySkuCode("SKU-COCOA-25KG")).thenReturn(Optional.of(skuEntity));

        // 1525kg limit, but submitting 1800kg
        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("PLT-1002")
                .itemCode("MAT-COCOA-01")
                .skuCode("SKU-COCOA-25KG")
                .palletTypeCode("EUR_WOOD")
                .sourceLocation("RCV-01")
                .quantity(BigDecimal.valueOf(50))
                .actualWeightKg(BigDecimal.valueOf(1800))
                .expiryDate(LocalDate.now().plusMonths(6))
                .build();

        PalletValidationContext ctx = new PalletValidationContext(request);
        ValidationResult result = coordinator.validate(request, ctx);

        assertTrue(result.isRejected());
        assertEquals("OVERWEIGHT_PALLET", result.getErrors().get(0).getCode());
    }

    @Test
    @DisplayName("Tier 3: Allergen presence generates WARNING and triggers specialized operations")
    void testAllergenPresenceWarningAndOperationResolution() {
        when(palletTypeRepo.findByCode("EUR_WOOD")).thenReturn(Optional.of(palletTypeEntity));
        when(palletRepo.findByPalletLpn("PLT-1003")).thenReturn(Optional.empty());
        when(itemRepo.findByItemCode("MAT-COCOA-01")).thenReturn(Optional.of(itemEntity));
        when(skuRepo.findBySkuCode("SKU-COCOA-25KG")).thenReturn(Optional.of(skuEntity));

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("PLT-1003")
                .itemCode("MAT-COCOA-01")
                .skuCode("SKU-COCOA-25KG")
                .palletTypeCode("EUR_WOOD")
                .sourceLocation("RCV-CONV-01") // Conveyor source
                .quantity(BigDecimal.valueOf(40))
                .actualWeightKg(BigDecimal.valueOf(1025))
                .expiryDate(LocalDate.now().plusMonths(12))
                .customAttributes(Map.of("allergenPresent", true, "allergen", "DAIRY"))
                .build();

        PalletValidationContext ctx = new PalletValidationContext(request);
        ValidationResult result = coordinator.validate(request, ctx);

        assertFalse(result.isRejected());
        assertEquals(ValidationOutcome.WARNING, result.getOutcome());
        assertTrue(result.hasWarningCode("ALLERGEN_PRESENT"));

        // Verify Operation Collection includes QA_ALLERGEN_SAMPLING
        List<PlannedOperation> ops = operationResolver.resolveOperations(ctx, result);
        assertTrue(ops.stream().anyMatch(o -> o.getOperationType() == TaskOperationType.QA_ALLERGEN_SAMPLING));
        assertTrue(ops.stream().anyMatch(o -> o.getOperationType() == TaskOperationType.CONVEYOR_TRANSPORT));
    }

    @Test
    @DisplayName("Clean Pass: INFO outcome generates standard task and operations")
    void testCleanPassStandardFlow() {
        when(palletTypeRepo.findByCode("EUR_WOOD")).thenReturn(Optional.of(palletTypeEntity));
        when(palletRepo.findByPalletLpn("PLT-1004")).thenReturn(Optional.empty());
        when(itemRepo.findByItemCode("MAT-COCOA-01")).thenReturn(Optional.of(itemEntity));
        when(skuRepo.findBySkuCode("SKU-COCOA-25KG")).thenReturn(Optional.of(skuEntity));

        PalletEntity savedPallet = PalletEntity.builder()
                .id(UUID.randomUUID())
                .palletLpn("PLT-1004")
                .status("RECEIVED")
                .currentLocation("RCV-01")
                .build();
        when(palletRepo.save(any(PalletEntity.class))).thenReturn(savedPallet);

        WesTaskEntity savedTask = WesTaskEntity.builder()
                .id(UUID.randomUUID())
                .taskNumber("TSK-INB-999")
                .palletLpn("PLT-1004")
                .status("IN_PROGRESS")
                .build();
        when(taskRepo.save(any(WesTaskEntity.class))).thenReturn(savedTask);
        when(taskRepo.findById(any())).thenReturn(Optional.of(savedTask));

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("PLT-1004")
                .itemCode("MAT-COCOA-01")
                .skuCode("SKU-COCOA-25KG")
                .palletTypeCode("EUR_WOOD")
                .sourceLocation("RCV-01")
                .quantity(BigDecimal.valueOf(40))
                .actualWeightKg(BigDecimal.valueOf(1025))
                .expiryDate(LocalDate.now().plusMonths(12))
                .build();

        PalletValidationContext ctx = new PalletValidationContext(request);
        ValidationResult result = coordinator.validate(request, ctx);

        assertEquals(ValidationOutcome.INFO, result.getOutcome());

        InboundExecutionResponse response = processRouter.routeAndTrigger(ctx, result);
        assertEquals("ACCEPTED", response.getStatus());
        assertNotNull(response.getTaskId());

        // Verify Pallet was persisted
        ArgumentCaptor<PalletEntity> palletCaptor = ArgumentCaptor.forClass(PalletEntity.class);
        verify(palletRepo).save(palletCaptor.capture());
        assertEquals("PLT-1004", palletCaptor.getValue().getPalletLpn());
        assertEquals("RECEIVED", palletCaptor.getValue().getStatus());
    }
}
