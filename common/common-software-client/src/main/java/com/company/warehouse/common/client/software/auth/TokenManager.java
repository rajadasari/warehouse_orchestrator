package com.company.warehouse.common.client.software.auth;

import com.company.warehouse.common.client.software.client.ClientConnectionProperties;
import com.company.warehouse.common.client.software.dynamic.DynamicResponseExtractor;
import com.company.warehouse.common.client.software.logging.HttpLoggingInterceptor;
import com.company.warehouse.common.client.software.model.ResourceConfigProvider;
import com.company.warehouse.common.client.software.model.ResourceConnectionConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Universal, high-performance Token Manager for external software integration.
 * Handles dynamic Bearer token acquisition, lock-safe caching, expiration
 * parsing,
 * and test-connection verification.
 */
@Slf4j
@Component
public class TokenManager {

    private final ClientConnectionProperties properties;
    private final ResourceConfigProvider resourceConfigProvider;
    private final DynamicResponseExtractor responseExtractor;
    private final ObjectMapper objectMapper;
    private final HttpLoggingInterceptor loggingInterceptor;
    private final ReentrantLock lock = new ReentrantLock();

    private final Map<String, TokenCacheEntry> tokenCache = new ConcurrentHashMap<>();

    @Autowired
    public TokenManager(
            ClientConnectionProperties properties,
            Optional<ResourceConfigProvider> resourceConfigProvider,
            DynamicResponseExtractor responseExtractor,
            ObjectMapper objectMapper,
            HttpLoggingInterceptor loggingInterceptor) {
        this.properties = properties != null ? properties : new ClientConnectionProperties();
        this.resourceConfigProvider = resourceConfigProvider.orElse(null);
        this.responseExtractor = responseExtractor != null ? responseExtractor : new DynamicResponseExtractor();
        this.objectMapper = objectMapper != null ? objectMapper.copy().findAndRegisterModules()
                : new ObjectMapper().findAndRegisterModules();
        this.loggingInterceptor = loggingInterceptor != null ? loggingInterceptor : new HttpLoggingInterceptor();
    }

    public TokenManager(
            ClientConnectionProperties properties,
            ResourceConfigProvider resourceConfigProvider,
            ObjectMapper objectMapper) {
        this(properties, Optional.ofNullable(resourceConfigProvider), new DynamicResponseExtractor(), objectMapper,
                new HttpLoggingInterceptor());
    }

    @Data
    @Builder
    public static class TokenCacheEntry {
        private String token;
        private Instant expiresAt;
        private Instant lastAcquiredAt;
        private String resolvedBaseUrl;
        private String lastError;
        private Integer lastStatusCode;
    }

    // ==========================================
    // Public Token Retrieval & Lifecycle Methods
    // ==========================================

    public String getBearerToken() {
        return getBearerToken(null);
    }

    public String getBearerToken(String resourceId) {
        if (!properties.isEnabled()) {
            return "dummy-disabled-token";
        }

        String targetResId = resolveResourceId(resourceId);
        if (targetResId == null)
            return null;

        TokenCacheEntry entry = tokenCache.get(targetResId);
        if (isEntryValid(entry)) {
            return entry.getToken();
        }

        lock.lock();
        try {
            entry = tokenCache.get(targetResId);
            if (isEntryValid(entry)) {
                return entry.getToken();
            }
            return acquireNewToken(targetResId);
        } finally {
            lock.unlock();
        }
    }

    public String forceRefreshToken() {
        return forceRefreshToken(null);
    }

    public String forceRefreshToken(String resourceId) {
        String targetResId = resolveResourceId(resourceId);
        lock.lock();
        try {
            invalidateToken(targetResId);
            return acquireNewToken(targetResId);
        } finally {
            lock.unlock();
        }
    }

    public boolean isTokenValid() {
        return isTokenValid(null);
    }

    public boolean isTokenValid(String resourceId) {
        String targetResId = resolveResourceId(resourceId);
        return targetResId != null && isEntryValid(tokenCache.get(targetResId));
    }

    public void invalidateToken() {
        invalidateToken(null);
    }

    public void invalidateToken(String resourceId) {
        String targetResId = resolveResourceId(resourceId);
        if (targetResId != null) {
            log.info("Invalidating cached software integration token for resource '{}'", targetResId);
            tokenCache.remove(targetResId);
        }
    }

    public TokenStatus getStatus() {
        return getStatus(null);
    }

    public TokenStatus getStatus(String resourceId) {
        String targetResId = resolveResourceId(resourceId);
        TokenCacheEntry entry = targetResId != null ? tokenCache.get(targetResId) : null;
        AuthConfig config = resolveAuthConfig(targetResId, null, null, null, null);
        String authUrl = combineUrl(config.baseUrl(), config.tokenPath());

        String token = entry != null ? entry.getToken() : null;
        String preview = (token != null && token.length() > 20)
                ? token.substring(0, 10) + "..." + token.substring(token.length() - 6)
                : token;

        return TokenStatus.builder()
                .resourceId(targetResId)
                .hasToken(token != null && !token.trim().isEmpty())
                .isValid(isEntryValid(entry))
                .tokenPreview(preview)
                .expiresAt(entry != null && entry.getExpiresAt() != null && entry.getExpiresAt() != Instant.MIN
                        ? entry.getExpiresAt().toString()
                        : null)
                .lastAcquiredAt(
                        entry != null && entry.getLastAcquiredAt() != null ? entry.getLastAcquiredAt().toString()
                                : null)
                .targetBaseUrl(config.baseUrl())
                .authEndpoint(authUrl)
                .headerFormat("Authentication: accessToken")
                .lastError(entry != null ? entry.getLastError() : null)
                .lastStatusCode(entry != null ? entry.getLastStatusCode() : null)
                .build();
    }

    public String resolveBaseUrl() {
        return resolveBaseUrl(null);
    }

    public String resolveBaseUrl(String resourceId) {
        String targetResId = resolveResourceId(resourceId);
        if (targetResId != null && resourceConfigProvider != null) {
            try {
                Optional<ResourceConnectionConfig> cfgOpt = resourceConfigProvider.getResourceConfig(targetResId);
                if (cfgOpt.isPresent()) {
                    return cfgOpt.get().getBaseUrl(properties.getBaseUrl());
                }
                Optional<String> ipOpt = resourceConfigProvider.getResourceIp(targetResId);
                if (ipOpt.isPresent() && !ipOpt.get().trim().isEmpty()) {
                    String ip = ipOpt.get().trim();
                    return ip.startsWith("http://") || ip.startsWith("https://") ? ip : "http://" + ip;
                }
            } catch (Exception e) {
                log.debug("Could not resolve IP from resource '{}': {}", targetResId, e.getMessage());
            }
        }
        return properties.getBaseUrl();
    }

    // ==========================================
    // Unified Token Acquisition Execution
    // ==========================================

    private String acquireNewToken(String targetResId) {
        AuthConfig config = resolveAuthConfig(targetResId, null, null, null, null);
        TokenAcquisitionResult result = executeHttpTokenRequest(targetResId, config.baseUrl(), config.tokenPath(),
                config.tokenField(), config.payload());
        recordCacheResult(targetResId, result, config.baseUrl());
        return result.token();
    }

    public TokenTestResult testAndCacheToken(String resourceId, String baseUrl, String tokenPath, String tokenField,
            String authMethod, Map<String, Object> customPayload, String apiKeyHeader, String apiKeyValue,
            String username, String password) {
        String targetResId = resolveResourceId(resourceId);
        String method = authMethod != null ? authMethod.trim().toUpperCase() : "OAUTH2_BEARER";

        if ("BASIC_AUTH".equals(method)) {
            String user = username;
            if ((user == null || user.trim().isEmpty()) && customPayload != null) {
                if (customPayload.containsKey("username")) user = String.valueOf(customPayload.get("username"));
            }
            return TokenTestResult.builder()
                    .success(user != null && !user.trim().isEmpty())
                    .message(user != null && !user.trim().isEmpty()
                            ? "HTTP Basic Auth validated for user '" + user + "'. Authorization header will be injected on all calls."
                            : "Username property is required for Basic Auth.")
                    .status(getStatus(targetResId))
                    .build();
        } else if ("API_KEY".equals(method)) {
            String header = (apiKeyHeader != null && !apiKeyHeader.trim().isEmpty()) ? apiKeyHeader.trim() : "X-API-KEY";
            return TokenTestResult.builder()
                    .success(apiKeyValue != null && !apiKeyValue.trim().isEmpty())
                    .message(apiKeyValue != null && !apiKeyValue.trim().isEmpty()
                            ? "API Key validated with header '" + header + "'. Key will be injected on all calls."
                            : "API Key value is missing.")
                    .status(getStatus(targetResId))
                    .build();
        } else if ("NONE".equals(method)) {
            return TokenTestResult.builder()
                    .success(true)
                    .message("No authentication required.")
                    .status(getStatus(targetResId))
                    .build();
        }

        // Default: OAUTH2_BEARER
        AuthConfig config = resolveAuthConfig(targetResId, baseUrl, tokenPath, tokenField, customPayload);
        TokenAcquisitionResult result = executeHttpTokenRequest(targetResId, config.baseUrl(), config.tokenPath(),
                config.tokenField(), config.payload());

        if (targetResId != null) {
            recordCacheResult(targetResId, result, config.baseUrl());
        }

        TokenStatus status = getStatus(targetResId);
        return TokenTestResult.builder()
                .success(result.isSuccess())
                .token(result.token())
                .status(status)
                .message(result.isSuccess()
                        ? "Access token acquired and saved in memory for future transactions"
                        : "Authentication failed: " + result.errorMessage())
                .error(result.errorMessage())
                .build();
    }

    public TokenTestResult testAndCacheToken(String resourceId, String baseUrl, String tokenPath, String clientId,
            String clientSecret) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (clientId != null && !clientId.trim().isEmpty()) payload.put("clientId", clientId.trim());
        if (clientSecret != null && !clientSecret.trim().isEmpty()) payload.put("clientSecret", clientSecret.trim());
        return testAndCacheToken(resourceId, baseUrl, tokenPath, null, "OAUTH2_BEARER", payload, null, null, null, null);
    }

    private record TokenAcquisitionResult(boolean isSuccess, String token, Instant expiresAt, int statusCode,
            String errorMessage) {
    }

    private TokenAcquisitionResult executeHttpTokenRequest(String targetResId, String baseUrl, String tokenPath,
            String tokenField, Map<String, Object> payload) {
        if (baseUrl == null || baseUrl.trim().isEmpty()) {
            return new TokenAcquisitionResult(false, null, null, 400,
                    "Resource '" + targetResId
                            + "' has no Base URL configured. Please provide server address in Resource Configuration.");
        }
        if (tokenPath == null || tokenPath.trim().isEmpty()) {
            return new TokenAcquisitionResult(false, null, null, 400,
                    "Resource '" + targetResId + "' has no Authentication Token Path configured.");
        }
        if (payload.isEmpty()) {
            return new TokenAcquisitionResult(false, null, null, 400,
                    "Resource '" + targetResId + "' has no Authentication credentials configured.");
        }

        String authUrl = combineUrl(baseUrl, tokenPath);
        log.info("Requesting Access Token from endpoint (Resource: {}): {} with payload keys: {}",
                targetResId, authUrl, payload.keySet());

        try {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(properties.getConnectTimeoutMs());
            requestFactory.setReadTimeout(properties.getReadTimeoutMs());

            RestClient authClient = RestClient.builder()
                    .baseUrl(baseUrl)
                    .requestFactory(requestFactory)
                    .requestInterceptor(loggingInterceptor)
                    .build();

            String responseBody = authClient.post()
                    .uri(tokenPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode responseJson = objectMapper.readTree(responseBody);
            String token = responseExtractor.extractToken(responseJson, tokenField).orElse(null);
            Long expiresIn = extractExpiresIn(responseJson);

            if (token != null && !token.trim().isEmpty()) {
                token = token.trim();
                Instant exp = determineTokenExpiration(token, expiresIn);
                log.info("Successfully acquired Bearer token for resource '{}'. Valid until: {}", targetResId, exp);
                return new TokenAcquisitionResult(true, token, exp, 200, null);
            } else {
                return new TokenAcquisitionResult(false, null, null, 500,
                        "Authentication response did not contain an access token under key '" + tokenField + "'");
            }
        } catch (Exception e) {
            int statusCode = 500;
            String errorMsg = e.getMessage();
            if (e instanceof RestClientResponseException re) {
                statusCode = re.getStatusCode().value();
                errorMsg = "HTTP " + statusCode + " " + re.getStatusText()
                        + (re.getResponseBodyAsString() != null && !re.getResponseBodyAsString().isEmpty()
                                ? ": " + re.getResponseBodyAsString()
                                : "");
            } else if (e instanceof ResourceAccessException ra) {
                statusCode = 503;
                errorMsg = "Server Unavailable: "
                        + (ra.getCause() != null ? ra.getCause().getMessage() : ra.getMessage());
            }

            log.warn("Failed to acquire token from endpoint {} for resource '{}': {} (status={})",
                    authUrl, targetResId, errorMsg, statusCode);
            return new TokenAcquisitionResult(false, null, null, statusCode, errorMsg);
        }
    }

    private void recordCacheResult(String targetResId, TokenAcquisitionResult result, String resolvedBaseUrl) {
        if (targetResId == null)
            return;

        tokenCache.put(targetResId, TokenCacheEntry.builder()
                .token(result.token())
                .expiresAt(result.isSuccess() ? result.expiresAt() : Instant.MIN)
                .lastAcquiredAt(Instant.now())
                .resolvedBaseUrl(resolvedBaseUrl)
                .lastError(result.errorMessage())
                .lastStatusCode(result.statusCode())
                .build());
    }

    // ==========================================
    // Configuration & Utility Helpers
    // ==========================================

    private record AuthConfig(String baseUrl, String tokenPath, String tokenField, Map<String, Object> payload) {
    }

    private AuthConfig resolveAuthConfig(String targetResId, String overrideBaseUrl, String overrideTokenPath,
            String overrideTokenField, Map<String, Object> overridePayload) {
        String baseUrl = overrideBaseUrl;
        String tokenPath = overrideTokenPath;
        String tokenField = overrideTokenField != null && !overrideTokenField.trim().isEmpty()
                ? overrideTokenField.trim()
                : "accessToken";
        Map<String, Object> payload = new LinkedHashMap<>();

        if (targetResId != null && resourceConfigProvider != null) {
            try {
                Optional<ResourceConnectionConfig> configOpt = resourceConfigProvider.getResourceConfig(targetResId);
                if (configOpt.isPresent()) {
                    ResourceConnectionConfig cfg = configOpt.get();
                    if (baseUrl == null || baseUrl.trim().isEmpty())
                        baseUrl = cfg.getBaseUrl(null);
                    Map<String, Object> props = cfg.getCustomProperties() != null ? cfg.getCustomProperties()
                            : Map.of();

                    if (props.containsKey("tokenPath") && props.get("tokenPath") != null && tokenPath == null) {
                        tokenPath = String.valueOf(props.get("tokenPath")).trim();
                    }
                    if (props.containsKey("tokenResponseField") && props.get("tokenResponseField") != null
                            && (overrideTokenField == null || overrideTokenField.trim().isEmpty())) {
                        tokenField = String.valueOf(props.get("tokenResponseField")).trim();
                    }

                    // Extract properties configured with useForAuth: true
                    if (props.containsKey("properties") && props.get("properties") instanceof List<?> propList) {
                        for (Object item : propList) {
                            if (item instanceof Map<?, ?> pMap) {
                                boolean useForAuth = Boolean.TRUE.equals(pMap.get("useForAuth"))
                                        || "true".equalsIgnoreCase(String.valueOf(pMap.get("useForAuth")));
                                String key = pMap.get("key") != null ? String.valueOf(pMap.get("key")).trim() : "";
                                if (useForAuth && !key.isEmpty()) {
                                    payload.put(key, pMap.get("value"));
                                }
                            }
                        }
                    }

                    if (props.containsKey("auth") && props.get("auth") instanceof Map<?, ?> authMap) {
                        if (tokenPath == null && authMap.get("tokenPath") != null)
                            tokenPath = String.valueOf(authMap.get("tokenPath")).trim();
                        if (authMap.get("tokenResponseField") != null
                                && (overrideTokenField == null || overrideTokenField.trim().isEmpty()))
                            tokenField = String.valueOf(authMap.get("tokenResponseField")).trim();
                        if (authMap.get("requestPayload") instanceof Map<?, ?> reqMap) {
                            reqMap.forEach((k, v) -> {
                                if (k != null)
                                    payload.put(String.valueOf(k).trim(), v);
                            });
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Could not load configuration for resource '{}': {}", targetResId, e.getMessage());
            }
        }

        // Apply any overrides from test-connection / caller
        if (overridePayload != null && !overridePayload.isEmpty()) {
            payload.putAll(overridePayload);
        }

        // Fallback to application.yml properties only if default resource and payload is still empty
        if (properties.getTargetResourceId() != null
                && properties.getTargetResourceId().equalsIgnoreCase(targetResId)) {
            if (baseUrl == null || baseUrl.trim().isEmpty())
                baseUrl = properties.getBaseUrl();
            if (tokenPath == null || tokenPath.trim().isEmpty())
                tokenPath = properties.getTokenPath();
            if ("accessToken".equals(tokenField) && properties.getTokenResponseField() != null) {
                tokenField = properties.getTokenResponseField().trim();
            }
            if (payload.isEmpty()) {
                if (properties.getClientId() != null && !properties.getClientId().trim().isEmpty())
                    payload.put("clientId", properties.getClientId());
                if (properties.getClientSecret() != null && !properties.getClientSecret().trim().isEmpty())
                    payload.put("clientSecret", properties.getClientSecret());
            }
        }

        if (baseUrl == null || baseUrl.trim().isEmpty()) {
            baseUrl = resolveBaseUrl(targetResId);
        }
        if (tokenPath == null || tokenPath.trim().isEmpty()) {
            tokenPath = properties.getTokenPath();
        }

        if (baseUrl != null && !baseUrl.trim().isEmpty() && !baseUrl.startsWith("http://")
                && !baseUrl.startsWith("https://")) {
            baseUrl = "http://" + baseUrl.trim();
        }

        return new AuthConfig(baseUrl, tokenPath, tokenField, payload);
    }

    private String resolveResourceId(String resourceId) {
        return (resourceId != null && !resourceId.trim().isEmpty())
                ? resourceId.trim()
                : properties.getTargetResourceId();
    }

    private boolean isEntryValid(TokenCacheEntry entry) {
        return entry != null && entry.getToken() != null
                && Instant.now().isBefore(entry.getExpiresAt().minusSeconds(60));
    }

    private String combineUrl(String base, String path) {
        if (base == null)
            return path;
        if (path == null)
            return base;
        boolean baseEnds = base.endsWith("/");
        boolean pathStarts = path.startsWith("/");
        if (baseEnds && pathStarts)
            return base + path.substring(1);
        if (!baseEnds && !pathStarts)
            return base + "/" + path;
        return base + path;
    }

    private Instant determineTokenExpiration(String token, Long explicitExpiresIn) {
        if (explicitExpiresIn != null && explicitExpiresIn > 0) {
            return Instant.now().plusSeconds(explicitExpiresIn);
        }
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
                JsonNode root = objectMapper.readTree(new String(payloadBytes, StandardCharsets.UTF_8));
                if (root.has("exp")) {
                    return Instant.ofEpochSecond(root.get("exp").asLong());
                }
            }
        } catch (Exception ignored) {
        }
        return Instant.now().plusSeconds(3600);
    }

    private Long extractExpiresIn(JsonNode root) {
        if (root == null || root.isNull())
            return null;
        for (String c : new String[] { "expiresIn", "expires_in", "expires" }) {
            JsonNode node = root.get(c);
            if (node != null && node.isNumber())
                return node.asLong();
        }
        if (root.has("data") && root.get("data").isObject()) {
            JsonNode data = root.get("data");
            for (String c : new String[] { "expiresIn", "expires_in", "expires" }) {
                JsonNode node = data.get(c);
                if (node != null && node.isNumber())
                    return node.asLong();
            }
        }
        return null;
    }

    @Data
    @Builder
    public static class TokenStatus {
        private String resourceId;
        private boolean hasToken;
        private boolean isValid;
        private String tokenPreview;
        private String expiresAt;
        private String lastAcquiredAt;
        private String targetBaseUrl;
        private String authEndpoint;
        private String headerFormat;
        private String lastError;
        private Integer lastStatusCode;
    }

    @Data
    @Builder
    public static class TokenTestResult {
        private boolean success;
        private String token;
        private TokenStatus status;
        private String message;
        private String error;
    }
}
