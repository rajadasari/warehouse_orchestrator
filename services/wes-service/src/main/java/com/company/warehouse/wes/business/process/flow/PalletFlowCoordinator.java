package com.company.warehouse.wes.business.process.flow;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.process.step.PalletFlowStepHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PalletFlowCoordinator {

    private final List<PalletFlowStepHandler> stepHandlers;

    /**
     * Executes the process-based pipeline for the pallet flow:
     * Pre-Announce -> Create Order -> Reserve Order -> Send to Outbound.
     */
    public boolean executeFlow(PalletFlowContext context) {
        log.info("Starting Pallet Flow Pipeline for LPN: {}, Task: {}",
                context.getPalletLpn(), context.getTaskNumber());

        Map<TaskOperationType, PalletFlowStepHandler> handlerMap = stepHandlers.stream()
                .collect(Collectors.toMap(PalletFlowStepHandler::getOperationType, Function.identity()));

        List<TaskOperationType> pipeline = List.of(
                TaskOperationType.WMS_PRE_ANNOUNCE,
                TaskOperationType.WMS_CREATE_ORDER,
                TaskOperationType.WMS_RESERVE_ORDER,
                TaskOperationType.WMS_SEND_TO_OUTBOUND
        );

        int seq = 1;
        for (TaskOperationType opType : pipeline) {
            context.setCurrentSequence(seq);
            PalletFlowStepHandler handler = handlerMap.get(opType);

            if (handler == null) {
                log.error("No handler registered for operation type {}", opType);
                return false;
            }

            log.info("Executing Pipeline Step #{}: {} for Pallet {}",
                    seq, opType, context.getPalletLpn());

            boolean success = handler.execute(context);
            if (!success) {
                log.warn("Pipeline halted at Step #{} ({}) for Pallet {}. Reason: {}",
                        seq, opType, context.getPalletLpn(), context.getFailureReason());
                return false;
            }

            seq++;
        }

        log.info("Pallet Flow Pipeline completed successfully for LPN: {}, Outbound Location: {}",
                context.getPalletLpn(), context.getOutboundStageLocation());
        return true;
    }
}
