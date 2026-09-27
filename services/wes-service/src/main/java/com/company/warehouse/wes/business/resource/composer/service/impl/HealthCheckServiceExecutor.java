package com.company.warehouse.wes.business.resource.composer.service.impl;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.service.EntityServiceExecutor;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

/**
 * Service executor handling diagnostic health checks and connectivity pings.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HealthCheckServiceExecutor implements EntityServiceExecutor {

    private final TokenManager tokenManager;

    private static final Set<String> SUPPORTED = Set.of("HEALTH_CHECK", "PING", "DIAGNOSTIC");

    @Override
    public boolean supports(String serviceName, String protocol, String category) {
        if (serviceName == null) return false;
        return SUPPORTED.contains(serviceName.trim().toUpperCase());
    }

    @Override
    public MethodExecutionResult execute(ComposedEntityInstance instance, String serviceName, Map<String, Object> parameters) {
        long start = System.currentTimeMillis();
        String resourceId = instance.getResourceId();
        String mName = serviceName.trim().toUpperCase();

        String protocol = instance.getProtocol() != null && !instance.getProtocol().isBlank() ? instance.getProtocol() : "http";
        String host = instance.getHost() != null ? instance.getHost() : "127.0.0.1";
        int port = instance.getPort();
        String baseUrl = (port > 0)
                ? String.format("%s://%s:%d", protocol, host, port)
                : String.format("%s://%s", protocol, host);

        Map<String, Object> methodsConfig = instance.getMethodsConfig() != null ? instance.getMethodsConfig() : Collections.emptyMap();
        @SuppressWarnings("unchecked")
        Map<String, Object> activeMethodConfig = methodsConfig.containsKey(mName) && methodsConfig.get(mName) instanceof Map
                ? (Map<String, Object>) methodsConfig.get(mName)
                : Collections.emptyMap();

        String healthPath = activeMethodConfig.containsKey("path") ? String.valueOf(activeMethodConfig.get("path")) : "/actuator/health";
        if (!healthPath.startsWith("/")) healthPath = "/" + healthPath;

        String targetUrl = baseUrl + healthPath;
        log.info("Executing Health Check on target: {}", targetUrl);

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(3000);
            factory.setReadTimeout(3000);

            RestClient.Builder clientBuilder = RestClient.builder()
                    .baseUrl(baseUrl)
                    .requestFactory(factory);

            String token = tokenManager.getBearerToken(resourceId);
            if (token != null && !token.isBlank() && !token.equals("dummy-disabled-token")) {
                clientBuilder.defaultHeader("Authorization", "Bearer " + token);
            }

            var response = clientBuilder.build()
                    .get()
                    .uri(healthPath)
                    .retrieve()
                    .toBodilessEntity();

            long duration = System.currentTimeMillis() - start;
            int statusCode = response.getStatusCode().value();

            return MethodExecutionResult.builder()
                    .success(statusCode >= 200 && statusCode < 300)
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message("Target service connectivity verified at " + targetUrl + " (HTTP " + statusCode + ")")
                    .statusCode(statusCode)
                    .executionTimeMs(duration)
                    .build();

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            log.warn("Health check failed for '{}': {}", targetUrl, e.getMessage());
            return MethodExecutionResult.builder()
                    .success(false)
                    .methodName(mName)
                    .resourceId(resourceId)
                    .message("Health check failed at " + targetUrl + ": " + e.getMessage())
                    .statusCode(503)
                    .executionTimeMs(duration)
                    .error(e.getMessage())
                    .build();
        }
    }
}
