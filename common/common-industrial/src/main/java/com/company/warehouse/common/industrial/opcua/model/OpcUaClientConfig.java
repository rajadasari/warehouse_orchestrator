package com.company.warehouse.common.industrial.opcua.model;

import lombok.Builder;

/**
 * Configuration parameters for connecting to an external industrial OPC UA Server / PLC.
 */
@Builder
public record OpcUaClientConfig(
        String clientCode,
        String endpointUrl,
        OpcUaSecurityPolicy securityPolicy,
        OpcUaAuthType authType,
        String username,
        String password,
        String keystorePath,
        String keystorePassword,
        String certificateAlias,
        String jwtToken,
        Long requestTimeoutMs,
        Long sessionTimeoutMs,
        Long reconnectIntervalMs,
        Integer keepaliveFailuresAllowed
) {
    public OpcUaClientConfig {
        if (clientCode == null || clientCode.isBlank()) {
            throw new IllegalArgumentException("clientCode cannot be null or blank");
        }
        if (endpointUrl == null || endpointUrl.isBlank()) {
            throw new IllegalArgumentException("endpointUrl cannot be null or blank");
        }
        if (securityPolicy == null) {
            securityPolicy = OpcUaSecurityPolicy.NONE;
        }
        if (authType == null) {
            authType = OpcUaAuthType.ANONYMOUS;
        }
        if (requestTimeoutMs == null || requestTimeoutMs <= 0) {
            requestTimeoutMs = 5000L;
        }
        if (sessionTimeoutMs == null || sessionTimeoutMs <= 0) {
            sessionTimeoutMs = 60000L;
        }
        if (reconnectIntervalMs == null || reconnectIntervalMs <= 0) {
            reconnectIntervalMs = 3000L;
        }
        if (keepaliveFailuresAllowed == null || keepaliveFailuresAllowed <= 0) {
            keepaliveFailuresAllowed = 4;
        }
    }
}
