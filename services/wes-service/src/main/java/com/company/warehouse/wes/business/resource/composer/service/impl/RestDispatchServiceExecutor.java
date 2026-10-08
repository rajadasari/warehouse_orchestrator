package com.company.warehouse.wes.business.resource.composer.service.impl;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.common.client.software.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.service.EntityServiceExecutor;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Service executor handling dynamic REST payload dispatches and parameterized queries.
 * Injects cached authentication tokens automatically for secure communication.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestDispatchServiceExecutor implements EntityServiceExecutor {

    private final TokenManager tokenManager;
    private final DynamicPayloadEngine payloadEngine;
    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(String serviceName, String protocol, String category) {
        if (protocol != null && !protocol.isBlank()) {
            String p = protocol.trim().toUpperCase();
            if (p.equals("REST") || p.equals("HTTP") || p.equals("HTTPS")) {
                return true;
            }
            if (p.equals("OPC_UA") || p.startsWith("OPC") || p.contains("MODBUS") || p.contains("S7") || p.equals("MQTT") || p.contains("TCP_SOCKET")) {
                return false;
            }
        }
        return "REST".equalsIgnoreCase(protocol) || "HTTP".equalsIgnoreCase(protocol) || "HTTPS".equalsIgnoreCase(protocol);
    }

    @Override
    @SuppressWarnings("unchecked")
    public MethodExecutionResult execute(ComposedEntityInstance instance, String serviceName, Map<String, Object> parameters) {
        long start = System.currentTimeMillis();
        String resourceId = instance.getResourceId();
        String mName = serviceName != null ? serviceName.trim().toUpperCase() : "DISPATCH_API";

        String protocol = instance.getProtocol() != null && !instance.getProtocol().isBlank() ? instance.getProtocol() : "http";
        String host = instance.getHost() != null ? instance.getHost() : "127.0.0.1";
        int port = instance.getPort();
        String baseUrl = (port > 0)
                ? String.format("%s://%s:%d", protocol, host, port)
                : String.format("%s://%s", protocol, host);

        Map<String, Object> methodsConfig = instance.getMethodsConfig() != null ? instance.getMethodsConfig() : Collections.emptyMap();
        Map<String, Object> activeMethodConfig = methodsConfig.containsKey(mName) && methodsConfig.get(mName) instanceof Map
                ? (Map<String, Object>) methodsConfig.get(mName)
                : Collections.emptyMap();

        String rawPath = activeMethodConfig.containsKey("path") ? String.valueOf(activeMethodConfig.get("path")) : "/api/v1/dispatch";
        String httpMethodStr = activeMethodConfig.containsKey("httpMethod") ? String.valueOf(activeMethodConfig.get("httpMethod")).toUpperCase() : "POST";
        HttpMethod httpMethod = HttpMethod.valueOf(httpMethodStr);

        Map<String, Object> effectiveProps = instance.getEffectiveProperties() != null ? instance.getEffectiveProperties() : Collections.emptyMap();

        // Context for placeholder resolution
        Map<String, Object> context = new HashMap<>(effectiveProps);
        if (parameters != null) context.putAll(parameters);

        String resolvedPath = payloadEngine.resolveUrl(rawPath, context);
        if (!resolvedPath.startsWith("/")) resolvedPath = "/" + resolvedPath;

        String targetUrl = baseUrl + resolvedPath;
        log.info("Dispatching REST Service '{}' -> {} {}", mName, httpMethod, targetUrl);

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            int timeout = effectiveProps.containsKey("timeoutMs") && effectiveProps.get("timeoutMs") instanceof Number
                    ? ((Number) effectiveProps.get("timeoutMs")).intValue() : 5000;
            factory.setConnectTimeout(timeout);
            factory.setReadTimeout(timeout);

            RestClient.Builder clientBuilder = RestClient.builder()
                    .baseUrl(baseUrl)
                    .requestFactory(factory);

            // Dynamic Token Injection
            String token = tokenManager.getBearerToken(resourceId);
            if (token != null && !token.isBlank() && !token.equals("dummy-disabled-token")) {
                clientBuilder.defaultHeader("Authorization", "Bearer " + token);
            }

            RestClient client = clientBuilder.build();
            RestClient.RequestBodySpec requestSpec = client.method(httpMethod).uri(resolvedPath);

            if (httpMethod != HttpMethod.GET && parameters != null && !parameters.isEmpty()) {
                requestSpec.contentType(MediaType.APPLICATION_JSON).body(parameters);
            }

            var responseEntity = requestSpec.retrieve().toEntity(String.class);
            long duration = System.currentTimeMillis() - start;
            int statusCode = responseEntity.getStatusCode().value();
            Object responseData = responseEntity.getBody();

            try {
                if (responseEntity.getBody() != null) {
                    responseData = objectMapper.readValue(responseEntity.getBody(), Object.class);
                }
            } catch (Exception ignored) {}

            return MethodExecutionResult.builder()
                    .success(statusCode >= 200 && statusCode < 300)
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message("Dispatched " + httpMethod + " " + targetUrl + " successfully (HTTP " + statusCode + ")")
                    .statusCode(statusCode)
                    .executionTimeMs(duration)
                    .data(responseData)
                    .build();

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            log.error("REST Dispatch error for '{}': {}", targetUrl, e.getMessage());
            return MethodExecutionResult.builder()
                    .success(false)
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message("Dispatch failed for " + targetUrl + ": " + e.getMessage())
                    .statusCode(500)
                    .executionTimeMs(duration)
                    .error(e.getMessage())
                    .build();
        }
    }
}
