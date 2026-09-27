package com.company.warehouse.common.client.software.integration;

import com.company.warehouse.common.client.software.dynamic.DynamicPayloadEngine;
import com.company.warehouse.common.client.software.integration.handshake.HandshakeConfig;
import com.company.warehouse.common.client.software.integration.handshake.HandshakeMode;
import com.company.warehouse.common.client.software.integration.handshake.HandshakeSession;
import com.company.warehouse.common.client.software.integration.handshake.UniversalHandshakeManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class UniversalHandshakeManagerTest {

    private UniversalHandshakeManager handshakeManager;

    @BeforeEach
    void setUp() {
        DynamicPayloadEngine payloadEngine = new DynamicPayloadEngine(new ObjectMapper());
        handshakeManager = new UniversalHandshakeManager(payloadEngine);
    }

    @Test
    void testSyncImmediateHandshake() {
        HandshakeConfig config = HandshakeConfig.builder()
                .mode(HandshakeMode.SYNC_IMMEDIATE)
                .build();

        HandshakeSession session = handshakeManager.initiateSession("SYNC_CHANNEL", config, Map.of("orderId", "ORD-1"));
        assertEquals("COMPLETED", session.getStatus());

        Map<String, Object> ack = handshakeManager.renderTechnicalAck(session, config);
        assertEquals("SYNC_IMMEDIATE", ack.get("mode"));
        assertEquals("COMPLETED", ack.get("status"));
        assertTrue(ack.containsKey("correlationKey"));
    }

    @Test
    void testAsyncCallbackHandshakeLifecycle() {
        HandshakeConfig config = HandshakeConfig.builder()
                .mode(HandshakeMode.ASYNC_CALLBACK)
                .timeoutSeconds(30)
                .build();

        HandshakeSession session = handshakeManager.initiateSession("ASYNC_CHANNEL", config, Map.of("palletLpn", "PLT-100"));
        assertEquals("PENDING_CALLBACK", session.getStatus());
        String corrKey = session.getCorrelationKey();

        // 1. Render immediate technical receipt (202 Accepted)
        Map<String, Object> ack = handshakeManager.renderTechnicalAck(session, config);
        assertEquals("PENDING_CALLBACK", ack.get("status"));
        assertEquals(corrKey, ack.get("correlationKey"));

        // 2. Simulate downstream callback arrival
        HandshakeSession completed = handshakeManager.handleCallback(corrKey, Map.of("result", "PHYSICAL_STORE_DONE", "bay", "B-12"));
        assertEquals("COMPLETED", completed.getStatus());
        assertNotNull(completed.getCompletedAt());
        assertEquals("PHYSICAL_STORE_DONE", completed.getCompletionData().get("result"));
    }

    @Test
    void testCallbackOnUnknownSessionThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
                handshakeManager.handleCallback("NON-EXISTENT-KEY", Map.of())
        );
    }
}
