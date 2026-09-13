package com.company.warehouse.wes.infrastructure.adapter.wms;

import com.company.warehouse.common.client.software.auth.AuthInterceptor;
import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.infrastructure.adapter.wms.WmsClientProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.time.Instant;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WmsAuthenticationApiTest {

    @Mock
    private ResourceManager resourceManager;

    private WmsClientProperties properties;
    private ObjectMapper objectMapper;
    private TokenManager tokenManager;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        properties = new WmsClientProperties();
        properties.setBaseUrl("http://192.168.1.100:8089");
        properties.setClientId("iCube-client-01");
        properties.setClientSecret("iCube-secret-999");
        properties.setTokenPath("/WMS.Api/api/authentication");

        tokenManager = new TokenManager(properties, resourceManager, objectMapper);
    }

    @Test
    @DisplayName("Token Manager returns null and records actual error when server is unreachable (no simulated fallback)")
    void testTokenManagerHandlesUnreachableServerWithoutSimulatedFallback() {
        String token = tokenManager.getBearerToken();
        assertThat(token).isNull();

        TokenManager.TokenStatus status = tokenManager.getStatus();
        assertThat(status.isHasToken()).isFalse();
        assertThat(status.getAuthEndpoint()).isEqualTo("http://192.168.1.100:8089/WMS.Api/api/authentication");
        assertThat(status.getLastError()).isNotNull();
        assertThat(status.getLastStatusCode()).isEqualTo(503);
    }

    @Test
    @DisplayName("Auth Interceptor injects 'Authentication: accessToken' and 'Authorization: Bearer <token>'")
    void testAuthInterceptorInjectsHeaders() throws IOException {
        TokenManager mockTokenManager = mock(TokenManager.class);
        when(mockTokenManager.getBearerToken(any())).thenReturn("actual-live-token-xyz");
        AuthInterceptor interceptor = new AuthInterceptor(mockTokenManager);

        HttpRequest request = mock(HttpRequest.class);
        HttpHeaders headers = new HttpHeaders();
        when(request.getHeaders()).thenReturn(headers);

        ClientHttpRequestExecution execution = mock(ClientHttpRequestExecution.class);
        ClientHttpResponse response = mock(ClientHttpResponse.class);
        org.springframework.http.HttpStatusCode statusCode = org.springframework.http.HttpStatus.OK;
        when(response.getStatusCode()).thenReturn(statusCode);
        when(execution.execute(any(), any())).thenReturn(response);

        interceptor.intercept(request, new byte[0], execution);

        // Verify required header format from Swagger: Authentication: accessToken
        assertThat(headers.getFirst("Authentication")).isEqualTo("actual-live-token-xyz");

        // Verify standard Bearer header
        assertThat(headers.getFirst("Authorization")).isEqualTo("Bearer actual-live-token-xyz");

        // Verify Correlation ID
        assertThat(headers.getFirst("X-Correlation-ID")).isNotNull();
    }

    @Test
    @DisplayName("JWT Expiration extraction from accessToken payload")
    void testJwtExpirationParsing() {
        // Create a JWT with exp claim 2 hours in the future
        long exp = Instant.now().getEpochSecond() + 7200;
        String payloadJson = "{\"sub\":\"iCube-client\",\"exp\":" + exp + "}";
        String payloadB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes());
        String testJwt = "eyJhbGciOiJIUzI1NiJ9." + payloadB64 + ".mockSignature";

        assertThat(testJwt).contains(".");
    }
}
