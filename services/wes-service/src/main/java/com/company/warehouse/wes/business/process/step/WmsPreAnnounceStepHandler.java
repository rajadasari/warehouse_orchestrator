package com.company.warehouse.wes.business.process.step;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.process.flow.PalletFlowContext;
import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WmsPreAnnounceStepHandler implements PalletFlowStepHandler {

    private final WmsIntegrationSpi wmsSpi;
    private final TaskTrackingEngine taskTrackingEngine;

    @Override
    public TaskOperationType getOperationType() {
        return TaskOperationType.WMS_PRE_ANNOUNCE;
    }

    @Override
    public boolean execute(PalletFlowContext context) {
        log.info("Executing Pre-Announce Step for Pallet LPN: {}", context.getPalletLpn());

        PalletPreAnnounceCommand command = PalletPreAnnounceCommand.builder()
                .palletLpn(context.getPalletLpn())
                .palletTypeCode(context.getPalletTypeCode())
                .itemCode(context.getItemCode())
                .skuCode(context.getSkuCode())
                .quantity(context.getQuantity())
                .uom(context.getUom())
                .lotNumber(context.getLotNumber())
                .expiryDate(context.getExpiryDate())
                .actualWeightKg(context.getActualWeightKg())
                .sourceLocation(context.getSourceLocation())
                .build();

        WmsPreAnnounceResult result = wmsSpi.preAnnouncePallet(command);

        if (!result.isSuccessful()) {
            log.error("Pre-Announce failed for LPN {}: {}", context.getPalletLpn(), result.getErrorMessage());
            context.setFailureReason(result.getErrorMessage());
            taskTrackingEngine.failOperation(context.getTaskId(), context.getCurrentSequence(), result.getErrorMessage());
            return false;
        }

        context.setPreAnnounceId(result.getPreAnnounceId());
        taskTrackingEngine.completeOperation(
                context.getTaskId(),
                context.getCurrentSequence(),
                "Pre-Announced to WMS: " + result.getPreAnnounceId(),
                null
        );

        return true;
    }
}
