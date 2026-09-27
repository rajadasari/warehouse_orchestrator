package com.company.warehouse.common.industrial.opcua.model;

import lombok.Builder;

import java.util.List;

/**
 * Configuration parameters for the WCS OPC UA Server.
 */
@Builder
public record OpcUaServerConfig(
        String serverCode,
        Integer bindPort,
        String endpointPath,
        String namespaceUri,
        List<OpcUaSecurityPolicy> supportedSecurityPolicies,
        List<OpcUaAuthType> supportedAuthTypes,
        Boolean autoStart
) {
    public OpcUaServerConfig {
        if (serverCode == null || serverCode.isBlank()) {
            throw new IllegalArgumentException("serverCode cannot be null or blank");
        }
        if (bindPort == null || bindPort <= 0) {
            bindPort = 4840;
        }
        if (endpointPath == null || endpointPath.isBlank()) {
            endpointPath = "/wcs/opcua";
        }
        if (namespaceUri == null || namespaceUri.isBlank()) {
            namespaceUri = "urn:company:warehouse:wcs";
        }
        if (supportedSecurityPolicies == null || supportedSecurityPolicies.isEmpty()) {
            supportedSecurityPolicies = List.of(OpcUaSecurityPolicy.NONE, OpcUaSecurityPolicy.BASIC256_SHA256);
        }
        if (supportedAuthTypes == null || supportedAuthTypes.isEmpty()) {
            supportedAuthTypes = List.of(OpcUaAuthType.ANONYMOUS, OpcUaAuthType.USERNAME_PASSWORD);
        }
        if (autoStart == null) {
            autoStart = true;
        }
    }
}
