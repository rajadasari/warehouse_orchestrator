package com.company.warehouse.common.industrial.opcua.model;

/**
 * Standard OPC UA User Identity Token Authentication Types.
 */
public enum OpcUaAuthType {
    ANONYMOUS,
    USERNAME_PASSWORD,
    X509_CERTIFICATE,
    JWT_TOKEN
}
