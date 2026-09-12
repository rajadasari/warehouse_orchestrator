package com.company.warehouse.wes.business.process.trigger;

import com.company.warehouse.common.core.enums.ValidationOutcome;
import com.company.warehouse.wes.api.dto.InboundExecutionResponse;
import com.company.warehouse.wes.business.task.OperationCollectionResolver;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import com.company.warehouse.wes.business.task.model.PlannedOperation;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.PalletItemEntity;
import com.company.warehouse.wes.data.entity.WesTaskEntity;
import com.company.warehouse.wes.data.repository.PalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessTriggerRouter {

    private final OperationCollectionResolver operationResolver;
    private final TaskTrackingEngine taskTrackingEngine;
    private final PalletRepository palletRepository;
    private final com.company.warehouse.wes.business.process.flow.PalletFlowCoordinator palletFlowCoordinator;

    @Transactional
    public InboundExecutionResponse routeAndTrigger(PalletValidationContext context, ValidationResult validationResult) {
        String lpn = context.getPalletLpn();

        // 1. REJECT Outcome: Halt immediately, do not persist pallet or task
        if (validationResult.isRejected()) {
            log.warn("Pallet LPN {} validation REJECTED. Halting ingestion.", lpn);
            return InboundExecutionResponse.rejected(lpn, validationResult.getErrors());
        }

        // 2. Persist Pallet in wes.pallet
        String palletStatus = validationResult.getOutcome() == ValidationOutcome.WARNING ? "RECEIVED_WARNING" : "RECEIVED";
        
        List<PalletItemEntity> items = new ArrayList<>();
        PalletEntity pallet = PalletEntity.builder()
                .palletLpn(lpn)
                .loadType(context.getLoadType() != null ? context.getLoadType() : "MATERIAL_WITH_SKU")
                .palletType(context.getResolvedPalletType())
                .item(context.getResolvedItem())
                .status(palletStatus)
                .currentLocation(context.getSourceLocation())
                .actualWeightKg(context.getActualWeightKg())
                .items(items)
                .build();

        // Add line item if material / quantity present
        if (context.getResolvedItem() != null && context.getQuantity() != null) {
            int pkgCount = 1;
            if (context.getResolvedSku() != null && context.getResolvedSku().getUnitsPerPackage() != null && context.getResolvedSku().getUnitsPerPackage().doubleValue() > 0) {
                pkgCount = Math.max(1, (int) Math.round(context.getQuantity().doubleValue() / context.getResolvedSku().getUnitsPerPackage().doubleValue()));
            }

            PalletItemEntity lineItem = PalletItemEntity.builder()
                    .pallet(pallet)
                    .item(context.getResolvedItem())
                    .sku(context.getResolvedSku())
                    .packageCount(pkgCount)
                    .totalQuantity(context.getQuantity())
                    .lotNumber(context.getLotNumber())
                    .expiryDate(context.getExpiryDate())
                    .build();
            items.add(lineItem);
        }

        PalletEntity savedPallet = palletRepository.save(pallet);
        log.info("Persisted Pallet {} in wes.pallet with status {}", savedPallet.getPalletLpn(), savedPallet.getStatus());

        // 3. Resolve Operations for this combination
        List<PlannedOperation> plannedOps = operationResolver.resolveOperations(context, validationResult);

        // 4. Create and start the Task
        WesTaskEntity task = taskTrackingEngine.createAndStartTask(context, plannedOps);

        // 5. Execute automated process pipeline if outbound / transfer flow
        boolean isOutboundOrTransfer = "CROSS_DOCK".equalsIgnoreCase(context.getInboundType())
                || "OUTBOUND_SHIPMENT".equalsIgnoreCase(context.getInboundType())
                || "TRANSFER_OUTBOUND".equalsIgnoreCase(context.getInboundType());

        if (isOutboundOrTransfer) {
            com.company.warehouse.wes.business.process.flow.PalletFlowContext flowContext =
                    com.company.warehouse.wes.business.process.flow.PalletFlowContext.fromValidationContext(context, task.getId(), task.getTaskNumber());
            palletFlowCoordinator.executeFlow(flowContext);
        }

        // 6. Build Response
        if (validationResult.getOutcome() == ValidationOutcome.WARNING) {
            return InboundExecutionResponse.acceptedWithWarnings(lpn, task.getId(), task.getTaskNumber(), validationResult.getWarnings());
        } else {
            return InboundExecutionResponse.accepted(lpn, task.getId(), task.getTaskNumber(), validationResult.getInfos());
        }
    }
}
