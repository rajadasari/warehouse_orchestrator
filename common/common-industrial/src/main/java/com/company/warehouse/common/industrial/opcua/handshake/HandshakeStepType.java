package com.company.warehouse.common.industrial.opcua.handshake;

/**
 * Step types for industrial machine/PLC handshake sequences.
 */
public enum HandshakeStepType {
    AWAIT_TRIGGER,
    READ_SINGLE,
    READ_GROUP,
    WRITE_SINGLE,
    WRITE_GROUP,
    AWAIT_CONFIRMATION,
    RESET
}
