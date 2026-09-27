package com.company.warehouse.common.industrial.opcua.model;

import org.eclipse.milo.opcua.stack.core.security.SecurityPolicy;

/**
 * Supported OPC UA security policies adhering to IEC 62443.
 */
public enum OpcUaSecurityPolicy {
    NONE(SecurityPolicy.None, false),
    BASIC256_SHA256(SecurityPolicy.Basic256Sha256, true),
    AES128_SHA256_RSAOAEP(SecurityPolicy.Aes128_Sha256_RsaOaep, true);

    private final SecurityPolicy miloPolicy;
    private final boolean iec62443Compliant;

    OpcUaSecurityPolicy(SecurityPolicy miloPolicy, boolean iec62443Compliant) {
        this.miloPolicy = miloPolicy;
        this.iec62443Compliant = iec62443Compliant;
    }

    public SecurityPolicy getMiloPolicy() {
        return miloPolicy;
    }

    public boolean isIec62443Compliant() {
        return iec62443Compliant;
    }
}
