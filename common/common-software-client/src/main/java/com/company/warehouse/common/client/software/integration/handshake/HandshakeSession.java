package com.company.warehouse.common.client.software.integration.handshake;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.Map;

/**
 * Active in-memory session tracking a sync or async handshake lifecycle.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HandshakeSession implements Serializable {

    private String correlationKey;
    private String channelCode;
    private HandshakeMode mode;
    private String status; // CREATED, PENDING_CALLBACK, PENDING_POLL, COMPLETED, TIMED_OUT, FAILED
    private Map<String, Object> initialContext;
    private Map<String, Object> completionData;
    private String errorMessage;
    private Instant createdAt;
    private Instant expiresAt;
    private Instant completedAt;

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }
}
