package com.company.warehouse.wes.business.resource.composer.service.impl;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.service.EntityServiceExecutor;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Service executor handling dynamic authentication (OAuth2 Bearer, API Key, Basic Auth)
 * for entity instances. Caches acquired tokens in memory for subsequent API operations.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthenticationServiceExecutor implements EntityServiceExecutor {

    private final TokenManager tokenManager;

    private static final Set<String> SUPPORTED_SERVICE_NAMES = Set.of(
            "AUTHENTICATE", "AUTH", "LOGIN", "TOKEN_REFRESH", "CONNECT"
    );

    @Override
    public boolean supports(String serviceName, String protocol, String category) {
        if (serviceName == null) return false;
        return SUPPORTED_SERVICE_NAMES.contains(serviceName.trim().toUpperCase());
    }

    @Override
    public MethodExecutionResult execute(ComposedEntityInstance instance, String serviceName, Map<String, Object> parameters) {
        long start = System.currentTimeMillis();
        String resourceId = instance.getResourceId();
        String mName = serviceName.trim().toUpperCase();

        log.info("Executing Dynamic Authentication Service '{}' for resource '{}'", mName, resourceId);

        String protocol = instance.getProtocol() != null && !instance.getProtocol().isBlank() ? instance.getProtocol() : "http";
        String host = instance.getHost() != null ? instance.getHost() : "127.0.0.1";
        int port = instance.getPort();
        String baseUrl = (port > 0)
                ? String.format("%s://%s:%d", protocol, host, port)
                : String.format("%s://%s", protocol, host);

        Map<String, Object> effectiveProps = instance.getEffectiveProperties() != null ? instance.getEffectiveProperties() : Collections.emptyMap();
        Map<String, Object> methodsConfig = instance.getMethodsConfig() != null ? instance.getMethodsConfig() : Collections.emptyMap();

        @SuppressWarnings("unchecked")
        Map<String, Object> activeMethodConfig = methodsConfig.containsKey(mName) && methodsConfig.get(mName) instanceof Map
                ? (Map<String, Object>) methodsConfig.get(mName)
                : Collections.emptyMap();

        @SuppressWarnings("unchecked")
        Map<String, Object> parameterBindings = activeMethodConfig.containsKey("parameterBindings") && activeMethodConfig.get("parameterBindings") instanceof Map
                ? (Map<String, Object>) activeMethodConfig.get("parameterBindings")
                : Collections.emptyMap();

        // 1. Resolve strategy
        String strategy = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "authType", "strategy", "authMethod", "auth_method");
        if (strategy == null || strategy.isBlank()) {
            strategy = "OAUTH2_BEARER";
        }
        strategy = strategy.trim().toUpperCase();

        // 2. Resolve token path / URL
        String tokenPath = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "tokenPath", "tokenEndpoint", "path", "token_endpoint", "authUrl");
        if (tokenPath == null || tokenPath.isBlank()) {
            tokenPath = "/api/v1/auth/token";
        }

        // 3. Resolve token response field
        String tokenField = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "tokenResponseField", "token_field", "tokenField");
        if (tokenField == null || tokenField.isBlank()) {
            tokenField = "access_token";
        }

        // 4. Resolve credentials
        String clientId = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "clientId", "client_id", "username", "user");
        String clientSecret = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "clientSecret", "client_secret", "password", "pass");
        String apiKeyHeader = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "apiKeyHeader", "api_key_header", "headerName", "header");
        String apiKeyValue = resolveConfig(activeMethodConfig, effectiveProps, parameterBindings, "apiKey", "apiKeyValue", "api_key", "secret");

        // 5. Build dynamic payload
        Map<String, Object> payload = new LinkedHashMap<>();
        if (clientId != null && !clientId.trim().isEmpty()) {
            payload.put("clientId", clientId.trim());
        }
        if (clientSecret != null && !clientSecret.trim().isEmpty()) {
            payload.put("clientSecret", clientSecret.trim());
        }
        if (parameters != null) {
            payload.putAll(parameters);
        }

        try {
            TokenManager.TokenTestResult result = tokenManager.testAndCacheToken(
                    resourceId,
                    baseUrl,
                    tokenPath,
                    tokenField,
                    strategy,
                    payload,
                    apiKeyHeader != null ? apiKeyHeader : "X-API-KEY",
                    apiKeyValue != null ? apiKeyValue : "",
                    clientId != null ? clientId : "",
                    clientSecret != null ? clientSecret : ""
            );

            long duration = System.currentTimeMillis() - start;
            int statusCode = result.isSuccess() ? 200 : 401;

            return MethodExecutionResult.builder()
                    .success(result.isSuccess())
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message(result.getMessage())
                    .statusCode(statusCode)
                    .executionTimeMs(duration)
                    .data(result)
                    .error(result.getError())
                    .build();

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            log.error("Authentication execution error for resource '{}': {}", resourceId, e.getMessage());
            return MethodExecutionResult.builder()
                    .success(false)
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message("Authentication failed: " + e.getMessage())
                    .statusCode(500)
                    .executionTimeMs(duration)
                    .error(e.getMessage())
                    .build();
        }
    }

    private String resolveConfig(Map<String, Object> methodCfg, Map<String, Object> props, Map<String, Object> bindings, String... keys) {
        for (String k : keys) {
            if (methodCfg != null && methodCfg.containsKey(k) && methodCfg.get(k) != null) {
                String val = String.valueOf(methodCfg.get(k)).trim();
                if (!val.isEmpty()) return val;
            }
            if (bindings != null && bindings.containsKey(k) && bindings.get(k) != null) {
                String val = String.valueOf(bindings.get(k)).trim();
                if (!val.isEmpty()) return val;
            }
            if (props != null && props.containsKey(k) && props.get(k) != null) {
                String val = String.valueOf(props.get(k)).trim();
                if (!val.isEmpty()) return val;
            }
        }
        return null;
    }
}
