package com.company.warehouse.common.industrial.opcua.funcsupport;

/**
 * The 4 supported functional rule topologies for OPC UA tag operations.
 */
public enum RuleTopology {

    /** Single Tag Read → evaluate → Single Tag Write */
    SINGLE_READ_SINGLE_WRITE,

    /** Single Tag Read → evaluate → Multi Tag Write */
    SINGLE_READ_MULTI_WRITE,

    /** Multi Tag Read → ALL pass (AND) → Multi Tag Write */
    MULTI_READ_MULTI_WRITE,

    /** Multi Tag Read → ALL pass (AND) → Single Tag Write */
    MULTI_READ_SINGLE_WRITE
}
