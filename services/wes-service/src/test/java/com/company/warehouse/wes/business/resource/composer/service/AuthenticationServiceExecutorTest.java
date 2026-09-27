package com.company.warehouse.wes.business.resource.composer.service;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityInstance;
import com.company.warehouse.wes.business.resource.composer.service.impl.AuthenticationServiceExecutor;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceExecutorTest {

    @Mock
    private TokenManager tokenManager;

    private AuthenticationServiceExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new AuthenticationServiceExecutor(tokenManager);
    }

    @Test
    @DisplayName("Authentication executor identifies supported services")
    void testSupports() {
        assertThat(executor.supports("AUTHENTICATE", "REST", "SOFTWARE")).isTrue();
        assertThat(executor.supports("AUTH", "REST", "SOFTWARE")).isTrue();
        assertThat(executor.supports("TOKEN_REFRESH", "REST", "SOFTWARE")).isTrue();
        assertThat(executor.supports("HEALTH_CHECK", "REST", "SOFTWARE")).isFalse();
    }

    @Test
    @DisplayName("Execute AUTHENTICATE pulls resolved credentials and delegates to TokenManager")
    void testExecuteAuthentication() {
        ComposedEntityInstance instance = ComposedEntityInstance.builder()
                .resourceId("LOGIQS-WMS")
                .protocol("http")
                .host("10.0.0.50")
                .port(8089)
                .effectiveProperties(Map.of(
                        "authType", "OAUTH2_BEARER",
                        "tokenPath", "/api/v1/auth/token",
                        "clientId", "logiqs-app",
                        "clientSecret", "secret123"
                ))
                .build();

        TokenManager.TokenTestResult mockResult = TokenManager.TokenTestResult.builder()
                .success(true)
                .token("mock-jwt-token-xyz")
                .message("Token acquired")
                .build();

        when(tokenManager.testAndCacheToken(
                eq("LOGIQS-WMS"),
                eq("http://10.0.0.50:8089"),
                eq("/api/v1/auth/token"),
                eq("access_token"),
                eq("OAUTH2_BEARER"),
                any(),
                eq("X-API-KEY"),
                eq(""),
                eq("logiqs-app"),
                eq("secret123")
        )).thenReturn(mockResult);

        MethodExecutionResult result = executor.execute(instance, "AUTHENTICATE", Map.of());

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatusCode()).isEqualTo(200);
        assertThat(result.getMethodName()).isEqualTo("AUTHENTICATE");
        assertThat(result.getMessage()).isEqualTo("Token acquired");
    }
}
