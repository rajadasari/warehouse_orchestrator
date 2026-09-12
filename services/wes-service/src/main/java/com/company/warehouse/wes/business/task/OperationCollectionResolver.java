package com.company.warehouse.wes.business.task;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class OperationCollectionResolver {

    /**
     * Resolves the ordered collection of operations based on the validated pallet combination.
     */
    public List<PlannedOperation> resolveOperations(PalletValidationContext context, ValidationResult validationResult) {
        List<PlannedOperation> operations = new ArrayList<>();
        int seq = 1;

        String loadType = context.getLoadType() != null ? context.getLoadType() : "MATERIAL_WITH_SKU";

        boolean isOutboundOrTransfer = "CROSS_DOCK".equalsIgnoreCase(context.getInboundType())
                || "OUTBOUND_SHIPMENT".equalsIgnoreCase(context.getInboundType())
                || "TRANSFER_OUTBOUND".equalsIgnoreCase(context.getInboundType());

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

        // Operation 3: Physical transport (Conveyor vs Forklift)
        boolean hasConveyor = context.getSourceLocation() != null && context.getSourceLocation().toUpperCase().contains("CONV");
        if (hasConveyor) {
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
}
