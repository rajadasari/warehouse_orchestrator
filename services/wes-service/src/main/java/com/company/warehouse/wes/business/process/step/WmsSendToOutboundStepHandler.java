package com.company.warehouse.wes.business.process.step;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.process.flow.PalletFlowContext;
import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.task.TaskTrackingEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WmsSendToOutboundStepHandler implements PalletFlowStepHandler {

    private final WmsIntegrationSpi wmsSpi;
    private final TaskTrackingEngine taskTrackingEngine;

    @Override
    public TaskOperationType getOperationType() {
        return TaskOperationType.WMS_SEND_TO_OUTBOUND;
    }

    @Override
    public boolean execute(PalletFlowContext context) {
        log.info("Executing Send to Outbound Step for Pallet LPN: {}, WmsOrderId: {}",
                context.getPalletLpn(), context.getWmsOrderId());

        SendToOutboundCommand command = SendToOutboundCommand.builder()
                .wmsOrderId(context.getWmsOrderId())
                .palletLpn(context.getPalletLpn())
                .targetLocation("OUTBOUND-BAY-01")
                .dispatchCarrier("STANDARD_LOGISTICS")
                .build();

        WmsOutboundResult result = wmsSpi.sendToOutbound(command);

        if (!result.isSuccessful()) {
            log.error("Outbound release failed for LPN {}: {}", context.getPalletLpn(), result.getErrorMessage());
            context.setFailureReason(result.getErrorMessage());
            taskTrackingEngine.failOperation(context.getTaskId(), context.getCurrentSequence(), result.getErrorMessage());
            return false;
        }

        context.setOutboundStageLocation(result.getOutboundStageSpur());
        taskTrackingEngine.completeOperation(
                context.getTaskId(),
                context.getCurrentSequence(),
                "Released to Outbound Spur: " + result.getOutboundStageSpur(),
                result.getOutboundStageSpur()
        );

        return true;
    }
}
