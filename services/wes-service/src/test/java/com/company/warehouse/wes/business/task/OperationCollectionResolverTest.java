package com.company.warehouse.wes.business.task;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.entity.ResourceRelationshipEntity;
import com.company.warehouse.wes.data.repository.ResourceRelationshipRepository;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OperationCollectionResolverTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private ResourceRelationshipRepository relationshipRepository;

    private OperationCollectionResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new OperationCollectionResolver(resourceRepository, relationshipRepository);
    }

    @Test
    @DisplayName("Should dynamically assign CONVEYOR_TRANSPORT when source location is registered conveyor resource")
    void testDynamicConveyorResourceResolution() {
        ResourceEntity conveyorResource = ResourceEntity.builder()
                .id(UUID.randomUUID())
                .resourceId("SPUR-IN-01")
                .name("Inbound Conveyor Spur 01")
                .type("CONVEYOR")
                .category("HARDWARE")
                .status("ACTIVE")
                .build();

        when(resourceRepository.findActiveByResourceId("SPUR-IN-01"))
                .thenReturn(Optional.of(conveyorResource));

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("LPN-DYN-01")
                .sourceLocation("SPUR-IN-01")
                .inboundType("STANDARD_RECEIPT")
                .palletTypeCode("EUR_WOOD")
                .itemCode("MAT-01")
                .actualWeightKg(BigDecimal.valueOf(400))
                .build();

        PalletValidationContext context = new PalletValidationContext(request);
        ValidationResult valResult = new ValidationResult();

        List<PlannedOperation> ops = resolver.resolveOperations(context, valResult);

        assertThat(ops).anyMatch(op -> op.getOperationType() == TaskOperationType.CONVEYOR_TRANSPORT);
        assertThat(ops).noneMatch(op -> op.getOperationType() == TaskOperationType.FORKLIFT_MANUAL_MOVE);
    }

    @Test
    @DisplayName("Should assign CONVEYOR_TRANSPORT when location has active TRANSFERS_TO relationship")
    void testDynamicTopologyRelationshipResolution() {
        when(resourceRepository.findActiveByResourceId("STN-ENTRY-99"))
                .thenReturn(Optional.empty());

        ResourceRelationshipEntity rel = ResourceRelationshipEntity.builder()
                .sourceResourceId("STN-ENTRY-99")
                .targetResourceId("CONV-MAIN-LINE")
                .relationType("TRANSFERS_TO")
                .active(true)
                .build();

        when(relationshipRepository.findBySourceResourceIdAndRelationTypeAndActiveTrue("STN-ENTRY-99", "TRANSFERS_TO"))
                .thenReturn(List.of(rel));

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("LPN-DYN-02")
                .sourceLocation("STN-ENTRY-99")
                .inboundType("STANDARD_RECEIPT")
                .palletTypeCode("EUR_WOOD")
                .itemCode("MAT-01")
                .actualWeightKg(BigDecimal.valueOf(400))
                .build();

        PalletValidationContext context = new PalletValidationContext(request);
        List<PlannedOperation> ops = resolver.resolveOperations(context, new ValidationResult());

        assertThat(ops).anyMatch(op -> op.getOperationType() == TaskOperationType.CONVEYOR_TRANSPORT);
    }

    @Test
    @DisplayName("Should assign FORKLIFT_MANUAL_MOVE when no conveyor resource or topology exists")
    void testManualFallbackResolution() {
        when(resourceRepository.findActiveByResourceId("DOCK-DOOR-04"))
                .thenReturn(Optional.empty());
        when(relationshipRepository.findBySourceResourceIdAndRelationTypeAndActiveTrue("DOCK-DOOR-04", "TRANSFERS_TO"))
                .thenReturn(List.of());

        InboundPalletSubmissionRequest request = InboundPalletSubmissionRequest.builder()
                .palletLpn("LPN-MAN-03")
                .sourceLocation("DOCK-DOOR-04")
                .inboundType("STANDARD_RECEIPT")
                .palletTypeCode("EUR_WOOD")
                .itemCode("MAT-01")
                .actualWeightKg(BigDecimal.valueOf(400))
                .build();

        PalletValidationContext context = new PalletValidationContext(request);
        List<PlannedOperation> ops = resolver.resolveOperations(context, new ValidationResult());

        assertThat(ops).anyMatch(op -> op.getOperationType() == TaskOperationType.FORKLIFT_MANUAL_MOVE);
        assertThat(ops).noneMatch(op -> op.getOperationType() == TaskOperationType.CONVEYOR_TRANSPORT);
    }
}
