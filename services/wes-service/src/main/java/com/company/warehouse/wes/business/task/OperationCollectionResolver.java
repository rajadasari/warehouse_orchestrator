package com.company.warehouse.wes.business.task;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.entity.ResourceRelationshipEntity;
import com.company.warehouse.wes.data.repository.ResourceRelationshipRepository;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
public class OperationCollectionResolver {

    private static final Set<String> OUTBOUND_FLOW_TYPES = Set.of(
            "CROSS_DOCK",
            "OUTBOUND_SHIPMENT",
            "TRANSFER_OUTBOUND"
    );

    private static final Set<String> CONVEYOR_RESOURCE_TYPES = Set.of(
            "CONVEYOR",
            "TURNTABLE",
            "TRANSFER_PORT"
    );

    private final Optional<ResourceRepository> resourceRepository;
    private final Optional<ResourceRelationshipRepository> relationshipRepository;

    public OperationCollectionResolver() {
        this.resourceRepository = Optional.empty();
        this.relationshipRepository = Optional.empty();
    }

    @Autowired
    public OperationCollectionResolver(
            @Autowired(required = false) ResourceRepository resourceRepository,
            @Autowired(required = false) ResourceRelationshipRepository relationshipRepository) {
        this.resourceRepository = Optional.ofNullable(resourceRepository);
        this.relationshipRepository = Optional.ofNullable(relationshipRepository);
    }

    /**
     * Resolves the ordered collection of operations based on the validated pallet combination.
     */
    public List<PlannedOperation> resolveOperations(PalletValidationContext context, ValidationResult validationResult) {
        List<PlannedOperation> operations = new ArrayList<>();
        int seq = 1;

        boolean isOutboundOrTransfer = context.getInboundType() != null 
                && OUTBOUND_FLOW_TYPES.contains(context.getInboundType().trim().toUpperCase());

        if (isOutboundOrTransfer) {
            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.WMS_PRE_ANNOUNCE)
                    .handlerType("WMS")
                    .description("Pre-announce pallet data to Third-Party WMS")
                    .build());

            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.WMS_CREATE_ORDER)
                    .handlerType("WMS")
                    .description("Create order in Third-Party WMS")
                    .build());

            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.WMS_RESERVE_ORDER)
                    .handlerType("WMS")
                    .description("Reserve order allocation in Third-Party WMS")
                    .build());

            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.WMS_SEND_TO_OUTBOUND)
                    .handlerType("WMS")
                    .description("Release pallet to Outbound staging lane in Third-Party WMS")
                    .build());

            return operations;
        }

        // Operation 1: Profile & weigh verification (for conveyor or high-bay racking)
        operations.add(PlannedOperation.builder()
                .sequence(seq++)
                .operationType(TaskOperationType.PROFILE_SCAN_WEIGH)
                .handlerType("WCS")
                .description("Verify pallet physical profile and scale weight")
                .build());

        // Operation 2: Request storage bin from Third-Party WMS
        operations.add(PlannedOperation.builder()
                .sequence(seq++)
                .operationType(TaskOperationType.WMS_BIN_ALLOCATION)
                .handlerType("WMS")
                .description("Request directed putaway storage bin from Third-Party WMS")
                .build());

        // Operation 3: Physical transport resolved dynamically via Resource & Topology Repository
        boolean requiresConveyor = isConveyorTransportRequired(context);
        if (requiresConveyor) {
            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.CONVEYOR_TRANSPORT)
                    .handlerType("WCS")
                    .description("Transport pallet via conveyor line to destination spur")
                    .build());
        } else {
            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.FORKLIFT_MANUAL_MOVE)
                    .handlerType("OPERATOR")
                    .description("Manual forklift transport from receiving dock to assigned bin")
                    .build());
        }

        // Operation 4: Special QA Inspection if Allergen or Quarantine is flagged
        if (validationResult.hasWarningCode("ALLERGEN_PRESENT") || "RAW_MATERIAL_PO".equalsIgnoreCase(context.getInboundType())) {
            operations.add(PlannedOperation.builder()
                    .sequence(seq++)
                    .operationType(TaskOperationType.QA_ALLERGEN_SAMPLING)
                    .handlerType("OPERATOR")
                    .description("QA allergen inspection and sample verification")
                    .build());
        }

        // Final Operation: WMS Confirmation and inventory sync
        operations.add(PlannedOperation.builder()
                .sequence(seq++)
                .operationType(TaskOperationType.WMS_PUTAWAY_CONFIRM)
                .handlerType("WMS")
                .description("Confirm putaway completion to Third-Party WMS and mark pallet STORED")
                .build());

        return operations;
    }

    /**
     * Dynamically determines whether the pallet's source location or topology indicates conveyor transport.
     */
    private boolean isConveyorTransportRequired(PalletValidationContext context) {
        String loc = context.getSourceLocation();
        if (loc == null || loc.trim().isEmpty()) {
            return false;
        }
        String cleanLoc = loc.trim();

        // 1. Check if sourceLocation is a registered automation/conveyor resource
        if (resourceRepository.isPresent()) {
            Optional<ResourceEntity> resOpt = resourceRepository.get().findActiveByResourceId(cleanLoc);
            if (resOpt.isPresent()) {
                ResourceEntity res = resOpt.get();
                if (res.getType() != null && CONVEYOR_RESOURCE_TYPES.contains(res.getType().trim().toUpperCase())) {
                    log.debug("Location '{}' identified as conveyor resource type '{}'", cleanLoc, res.getType());
                    return true;
                }
            }
        }

        // 2. Check if sourceLocation has active TRANSFERS_TO relationships in material flow
        if (relationshipRepository.isPresent()) {
            List<ResourceRelationshipEntity> rels = relationshipRepository.get()
                    .findBySourceResourceIdAndRelationTypeAndActiveTrue(cleanLoc, "TRANSFERS_TO");
            if (!rels.isEmpty()) {
                log.debug("Location '{}' has active TRANSFERS_TO relationships: count={}", cleanLoc, rels.size());
                return true;
            }
        }

        // 3. Compatibility fallback when running in repository-less mock environments
        if (resourceRepository.isEmpty() && relationshipRepository.isEmpty()) {
            return cleanLoc.toUpperCase().contains("CONV");
        }

        return false;
    }
}
