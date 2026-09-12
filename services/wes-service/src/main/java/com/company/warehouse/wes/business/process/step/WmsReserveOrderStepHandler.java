package com.company.warehouse.wes.business.process.step;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.process.flow.PalletFlowContext;
import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WmsReserveOrderStepHandler implements PalletFlowStepHandler {

    private final WmsIntegrationSpi wmsSpi;
    private final TaskTrackingEngine taskTrackingEngine;

    @Override
    public TaskOperationType getOperationType() {
        return TaskOperationType.WMS_RESERVE_ORDER;
    }

    @Override
    public boolean execute(PalletFlowContext context) {
        log.info("Executing Reserve Order Step for Pallet LPN: {}, WmsOrderId: {}",
                context.getPalletLpn(), context.getWmsOrderId());

        ReserveOrderCommand command = ReserveOrderCommand.builder()
                .wmsOrderId(context.getWmsOrderId())
                .palletLpn(context.getPalletLpn())
                .build();

        WmsReserveResult result = wmsSpi.reserveOrder(command);

        if (!result.isSuccessful()) {
            log.error("Order reservation failed for LPN {}: {}", context.getPalletLpn(), result.getErrorMessage());
            context.setFailureReason(result.getErrorMessage());
            taskTrackingEngine.failOperation(context.getTaskId(), context.getCurrentSequence(), result.getErrorMessage());
            return false;
        }

        context.setReservationId(result.getReservationId());
        taskTrackingEngine.completeOperation(
                context.getTaskId(),
                context.getCurrentSequence(),
                "Reserved Order in WMS: " + result.getReservationId(),
                null
        );

        return true;
    }
}
