package com.company.warehouse.common.client.software.integration.handshake;

import com.company.warehouse.common.client.software.dynamic.DynamicPayloadEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Universal Handshake Manager.
 * Orchestrates synchronous and asynchronous handshakes, session correlation,
 * technical acknowledgment rendering, and completion signal resolution.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UniversalHandshakeManager {

    private final DynamicPayloadEngine payloadEngine;
    private final Map<String, HandshakeSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * Initializes a new handshake session.
     */
    public HandshakeSession initiateSession(String channelCode, HandshakeConfig config, Map<String, Object> context) {
        String corrKey = "CORR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant now = Instant.now();
        int ttl = config != null ? config.getTimeoutSeconds() : 60;
        Instant expires = now.plusSeconds(ttl);

        HandshakeMode mode = config != null ? config.getMode() : HandshakeMode.SYNC_IMMEDIATE;
        String initStatus = (mode == HandshakeMode.SYNC_IMMEDIATE) ? "COMPLETED" : "PENDING_CALLBACK";

        HandshakeSession session = HandshakeSession.builder()
                .correlationKey(corrKey)
                .channelCode(channelCode)
                .mode(mode)
                .status(initStatus)
                .initialContext(context != null ? new HashMap<>(context) : new HashMap<>())
                .createdAt(now)
                .expiresAt(expires)
                .build();

        activeSessions.put(corrKey, session);
        log.info("Initiated Handshake Session '{}' [Channel: {}, Mode: {}, TTL: {}s]",
                corrKey, channelCode, mode, ttl);

        return session;
    }

    /**
     * Resolves and renders the technical acknowledgment payload for the caller.
     */
    public Map<String, Object> renderTechnicalAck(HandshakeSession session, HandshakeConfig config) {
        Map<String, Object> ack = new HashMap<>();
        ack.put("correlationKey", session.getCorrelationKey());
        ack.put("channelCode", session.getChannelCode());
        ack.put("mode", session.getMode().name());
        ack.put("status", session.getStatus());
        ack.put("timestamp", Instant.now().toString());

        if (session.getMode() == HandshakeMode.SYNC_IMMEDIATE) {
            ack.put("message", "Request processed and completed synchronously");
            if (session.getCompletionData() != null) {
                ack.putAll(session.getCompletionData());
            }
        } else {
            ack.put("message", "Request accepted for asynchronous execution");
            ack.put("expiresAt", session.getExpiresAt().toString());
        }

        if (config != null && config.getAckPayloadTemplate() != null && !config.getAckPayloadTemplate().isBlank()) {
            try {
                Map<String, Object> tmplCtx = new HashMap<>(ack);
                if (session.getInitialContext() != null) tmplCtx.putAll(session.getInitialContext());
                String rendered = payloadEngine.buildPayload(config.getAckPayloadTemplate(), tmplCtx);
                ack.put("customAck", rendered);
            } catch (Exception e) {
                log.warn("Failed to render custom ACK template for correlation '{}': {}", session.getCorrelationKey(), e.getMessage());
            }
        }

        return ack;
    }

    /**
     * Handles an asynchronous callback from an external system or downstream worker.
     */
    public HandshakeSession handleCallback(String correlationKey, Map<String, Object> callbackData) {
        if (correlationKey == null || correlationKey.isBlank()) {
            throw new IllegalArgumentException("Correlation key cannot be empty");
        }

        HandshakeSession session = activeSessions.get(correlationKey.trim());
        if (session == null) {
            throw new IllegalArgumentException("No active handshake session found for correlation key: " + correlationKey);
        }

        if (session.isExpired()) {
            session.setStatus("TIMED_OUT");
            log.warn("Callback received for expired session '{}'", correlationKey);
            throw new IllegalStateException("Handshake session '" + correlationKey + "' has expired");
        }

        session.setStatus("COMPLETED");
        session.setCompletedAt(Instant.now());
        session.setCompletionData(callbackData != null ? callbackData : Map.of());

        log.info("Handshake Session '{}' marked COMPLETED via callback", correlationKey);
        return session;
    }

    public Optional<HandshakeSession> getSession(String correlationKey) {
        if (correlationKey == null) return Optional.empty();
        HandshakeSession s = activeSessions.get(correlationKey.trim());
        if (s != null && s.isExpired() && !"COMPLETED".equals(s.getStatus())) {
            s.setStatus("TIMED_OUT");
        }
        return Optional.ofNullable(s);
    }
}
