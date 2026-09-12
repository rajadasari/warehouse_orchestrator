package com.company.warehouse.wes.business.process.step;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.process.flow.PalletFlowContext;
import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WmsCreateOrderStepHandler implements PalletFlowStepHandler {

    private final WmsIntegrationSpi wmsSpi;
    private final TaskTrackingEngine taskTrackingEngine;

    @Override
    public TaskOperationType getOperationType() {
        return TaskOperationType.WMS_CREATE_ORDER;
    }

    @Override
    public boolean execute(PalletFlowContext context) {
        log.info("Executing Create Order Step for Pallet LPN: {}", context.getPalletLpn());

        CreateOrderCommand command = CreateOrderCommand.builder()
                .clientOrderRef("ORD-REF-" + context.getPalletLpn() + "-" + System.currentTimeMillis())
                .orderType("OUTBOUND_SHIPMENT")
                .palletLpn(context.getPalletLpn())
                .itemCode(context.getItemCode())
                .skuCode(context.getSkuCode())
                .quantity(context.getQuantity())
                .destinationLocation("OUTBOUND-BAY-01")
                .build();

        WmsOrderResult result = wmsSpi.createOrder(command);

        if (!result.isSuccessful()) {
            log.error("Order creation failed for LPN {}: {}", context.getPalletLpn(), result.getErrorMessage());
            context.setFailureReason(result.getErrorMessage());
            taskTrackingEngine.failOperation(context.getTaskId(), context.getCurrentSequence(), result.getErrorMessage());
            return false;
        }

        context.setWmsOrderId(result.getWmsOrderId());
        context.setWmsOrderNumber(result.getOrderNumber());

        taskTrackingEngine.completeOperation(
                context.getTaskId(),
                context.getCurrentSequence(),
                "Created Order in WMS: " + result.getOrderNumber() + " (ID: " + result.getWmsOrderId() + ")",
                null
        );

        return true;
    }
}
