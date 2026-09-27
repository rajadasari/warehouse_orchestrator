package com.company.warehouse.common.client.software.integration.handshake;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Configuration for synchronous or asynchronous handshakes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HandshakeConfig implements Serializable {

    @Builder.Default
    private HandshakeMode mode = HandshakeMode.SYNC_IMMEDIATE;

    @Builder.Default
    private int timeoutSeconds = 60;

    @Builder.Default
    private int pollingIntervalSeconds = 5;

    private String pollEndpointUrl;
    private String pollSuccessJsonField;

    @Builder.Default
    private String callbackHeaderKey = "X-Correlation-ID";

    /**
     * Template for technical ACK returned immediately to caller.
     * Example: "{\"status\":\"ACCEPTED\",\"trackingId\":\"{{correlationKey}}\"}"
     */
    private String ackPayloadTemplate;

    @Builder.Default
    private int maxRetries = 3;
}
