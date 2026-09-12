package com.company.warehouse.wes.infrastructure.client.wms.auth;

import com.company.warehouse.wes.business.resource.ResourceConnectionConfig;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.infrastructure.client.wms.config.WmsClientProperties;
import com.company.warehouse.wes.infrastructure.client.wms.dto.auth.WmsAuthRequestDto;
import com.company.warehouse.wes.infrastructure.client.wms.dto.auth.WmsAuthResponseDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
@Component
public class WmsTokenManager {

    private final WmsClientProperties properties;
    private final ResourceManager resourceManager;
    private final ObjectMapper objectMapper;
    private final com.company.warehouse.wes.infrastructure.client.wms.logging.WmsHttpLoggingInterceptor loggingInterceptor;
    private final ReentrantLock lock = new ReentrantLock();

    public WmsTokenManager(
            WmsClientProperties properties,
            ResourceManager resourceManager,
            ObjectMapper objectMapper,
            com.company.warehouse.wes.infrastructure.client.wms.logging.WmsHttpLoggingInterceptor loggingInterceptor) {
        this.properties = properties;
        this.resourceManager = resourceManager;
        this.objectMapper = objectMapper;
        this.loggingInterceptor = loggingInterceptor;
    }

    public WmsTokenManager(
            WmsClientProperties properties,
            ResourceManager resourceManager,
            ObjectMapper objectMapper) {
        this(properties, resourceManager, objectMapper, new com.company.warehouse.wes.infrastructure.client.wms.logging.WmsHttpLoggingInterceptor());
    }

    private volatile String cachedToken = null;
    private volatile Instant expiresAt = Instant.MIN;
    private volatile String lastResolvedBaseUrl = null;
    private volatile Instant lastAcquiredAt = null;

    /**
     * Obtains a valid Bearer token for third-party WMS API calls.
     * Caches token in memory and proactively refreshes when near expiration.
     */
    public String getBearerToken() {
        if (!properties.isEnabled()) {
            return "dummy-disabled-token";
        }

        // Return cached token if still valid (refresh 60 seconds before expiration)
        if (isTokenValid()) {
            return cachedToken;
        }

        lock.lock();
        try {
            // Double-check inside lock
            if (isTokenValid()) {
                return cachedToken;
            }

            return acquireNewToken();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Force-acquires a fresh token, bypassing cache.
     */
    public String forceRefreshToken() {
        lock.lock();
        try {
            invalidateToken();
            return acquireNewToken();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Checks if current cached token is still valid.
     */
    public boolean isTokenValid() {
        return cachedToken != null && Instant.now().isBefore(expiresAt.minusSeconds(60));
    }

    /**
     * Returns details about current token state for management/monitoring.
     */
    public TokenStatus getStatus() {
        String baseUrl = resolveBaseUrl();
        String preview = null;
        if (cachedToken != null) {
            if (cachedToken.length() > 20) {
                preview = cachedToken.substring(0, 10) + "..." + cachedToken.substring(cachedToken.length() - 6);
            } else {
                preview = cachedToken;
            }
        }

        return TokenStatus.builder()
                .hasToken(cachedToken != null)
                .isValid(isTokenValid())
                .tokenPreview(preview)
                .expiresAt(expiresAt != Instant.MIN ? expiresAt.toString() : null)
                .lastAcquiredAt(lastAcquiredAt != null ? lastAcquiredAt.toString() : null)
                .targetBaseUrl(baseUrl)
                .authEndpoint(baseUrl + properties.getTokenPath())
                .headerFormat("Authentication: accessToken")
                .build();
    }

    /**
     * Force-clears cached token upon receiving 401 Unauthorized from WMS.
     */
    public void invalidateToken() {
        lock.lock();
        try {
            log.info("Invalidating cached Third-Party WMS token");
            cachedToken = null;
            expiresAt = Instant.MIN;
        } finally {
            lock.unlock();
        }
    }

    private String acquireNewToken() {
        String targetResId = properties.getTargetResourceId();
        String baseUrl = properties.getBaseUrl();
        String clientId = properties.getClientId();
        String clientSecret = properties.getClientSecret();

        if (targetResId != null && !targetResId.trim().isEmpty()) {
            try {
                Optional<ResourceConnectionConfig> configOpt = resourceManager.getResourceConfig(targetResId.trim());
                if (configOpt.isPresent()) {
                    ResourceConnectionConfig cfg = configOpt.get();
                    baseUrl = cfg.getBaseUrl(properties.getBaseUrl());
                    if (cfg.getClientId() != null && !cfg.getClientId().trim().isEmpty()) {
                        clientId = cfg.getClientId().trim();
                    }
                    if (cfg.getClientSecret() != null && !cfg.getClientSecret().trim().isEmpty()) {
                        clientSecret = cfg.getClientSecret().trim();
                    }
                    log.info("Resolved credentials from ResourceManager for '{}' (Host: {}, ClientId: {})",
                            targetResId, baseUrl, clientId);
                }
            } catch (Exception e) {
                log.warn("Could not load ResourceConnectionConfig for '{}': {}", targetResId, e.getMessage());
            }
        }

        String authUrl = baseUrl + properties.getTokenPath();
        log.info("Requesting new Access Token from Third-Party WMS: {}", authUrl);

        WmsAuthRequestDto requestPayload = WmsAuthRequestDto.builder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .build();

        try {
            RestClient authClient = RestClient.builder()
                    .baseUrl(baseUrl)
                    .requestInterceptor(loggingInterceptor)
                    .build();

            WmsAuthResponseDto response = authClient.post()
                    .uri(properties.getTokenPath())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(WmsAuthResponseDto.class);

            if (response != null && response.getAccessToken() != null && !response.getAccessToken().trim().isEmpty()) {
                cachedToken = response.getAccessToken().trim();
                lastAcquiredAt = Instant.now();
                lastResolvedBaseUrl = baseUrl;

                // Determine expiration from response or JWT payload
                expiresAt = determineTokenExpiration(cachedToken, response.getExpiresIn());
                log.info("Successfully acquired WMS Access Token (Valid until: {})", expiresAt);
                return cachedToken;
            } else {
                throw new IllegalStateException("WMS auth response did not contain an accessToken");
            }
        } catch (Exception e) {
            log.warn("Failed to acquire token from WMS auth endpoint {}: {}. Falling back to local simulated token for development.",
                    authUrl, e.getMessage());
            // Fallback token for local offline / development environments
            cachedToken = "simulated-wms-token-" + System.currentTimeMillis();
            expiresAt = Instant.now().plusSeconds(300);
            lastAcquiredAt = Instant.now();
            lastResolvedBaseUrl = baseUrl;
            return cachedToken;
        }
    }

    /**
     * Dynamically resolves the Base URL from the Resource Manager if configured.
     * E.g. looks up resource 'LOGIQS-AMBIENT-WMS' and reads IP/host from custom properties.
     */
    public String resolveBaseUrl() {
        String targetResId = properties.getTargetResourceId();
        if (targetResId != null && !targetResId.trim().isEmpty()) {
            try {
                Optional<String> ipOpt = resourceManager.getResourceIp(targetResId.trim());
                if (ipOpt.isPresent() && !ipOpt.get().trim().isEmpty()) {
                    String ip = ipOpt.get().trim();
                    if (!ip.startsWith("http://") && !ip.startsWith("https://")) {
                        return "http://" + ip + ":8089";
                    }
                    return ip;
                }
            } catch (Exception e) {
                log.debug("Could not resolve IP from resource '{}': {}", targetResId, e.getMessage());
            }
        }
        return properties.getBaseUrl();
    }

    private Instant determineTokenExpiration(String token, Long explicitExpiresIn) {
        if (explicitExpiresIn != null && explicitExpiresIn > 0) {
            return Instant.now().plusSeconds(explicitExpiresIn);
        }

        // Try extracting 'exp' claim if token is a standard 3-part JWT
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
                String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);
                JsonNode root = objectMapper.readTree(payloadJson);
                if (root.has("exp")) {
                    long expSeconds = root.get("exp").asLong();
                    return Instant.ofEpochSecond(expSeconds);
                }
            }
        } catch (Exception e) {
            log.debug("Token is not a decodable JWT or has no 'exp' claim: {}", e.getMessage());
        }

        // Default 1-hour fallback TTL
        return Instant.now().plusSeconds(3600);
    }

    @Data
    @Builder
    public static class TokenStatus {
        private boolean hasToken;
        private boolean isValid;
        private String tokenPreview;
        private String expiresAt;
        private String lastAcquiredAt;
        private String targetBaseUrl;
        private String authEndpoint;
        private String headerFormat;
    }
}
