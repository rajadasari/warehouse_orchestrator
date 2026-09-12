package com.company.warehouse.wes.business.process.step;

import com.company.warehouse.common.core.enums.TaskOperationType;
import com.company.warehouse.wes.business.process.flow.PalletFlowContext;

public interface PalletFlowStepHandler {

    /**
     * The task operation type handled by this step.
     */
    TaskOperationType getOperationType();

    /**
     * Executes the step logic using WMS SPI, updates context, and returns true if successful.
     */
    boolean execute(PalletFlowContext context);
}
