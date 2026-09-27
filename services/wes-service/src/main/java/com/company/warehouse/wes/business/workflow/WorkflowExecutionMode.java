package com.company.warehouse.wes.business.workflow;

/**
 * Execution mode of the WES/MES Workflow Engine.
 * REAL: Dispatches live I/O to physical shop-floor PLCs, WCS, and external REST APIs.
 * SIMULATION: Routes through virtual digital twin OPC UA servers and deterministic emulators.
 */
public enum WorkflowExecutionMode {
    REAL,
    SIMULATION
}
