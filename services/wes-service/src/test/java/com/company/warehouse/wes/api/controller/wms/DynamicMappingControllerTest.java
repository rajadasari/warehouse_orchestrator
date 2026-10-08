package com.company.warehouse.wes.api.controller.wms;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.data.repository.ApiIntegrationMappingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class DynamicMappingControllerTest {

    @Mock
    private ApiIntegrationMappingRepository mappingRepository;
    @Mock
    private DynamicPayloadEngine dynamicEngine;
    @Mock
    private TokenManager tokenManager;

    private ObjectMapper objectMapper;
    private DynamicMappingController controller;

    private static HttpServer mockServer;
    private static int mockServerPort;

    @BeforeAll
    static void startHttpServer() throws Exception {
        mockServer = HttpServer.create(new InetSocketAddress(0), 0);
        mockServerPort = mockServer.getAddress().getPort();

        // 200 OK endpoint
        mockServer.createContext("/api/success", exchange -> {
            String response = "{\"status\":\"ACTUAL_OK\",\"serverTime\":123456}";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });

        // 400 Bad Request endpoint
        mockServer.createContext("/api/bad-request", exchange -> {
            String response = "{\"error\":\"INVALID_PALLET_FORMAT\",\"code\":4001}";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(400, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });

        // 500 Internal Server Error endpoint
        mockServer.createContext("/api/error", exchange -> {
            String response = "{\"error\":\"DATABASE_DOWN\",\"code\":5001}";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(500, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });

        // Expired token endpoint (first call returns 401, second call returns 200)
        AtomicInteger expiredCallCount = new AtomicInteger(0);
        mockServer.createContext("/api/expired-token", exchange -> {
            int count = expiredCallCount.incrementAndGet();
            if (count == 1) {
                String response = "{\"detail\":\"Token expired\"}";
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(401, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            } else {
                String response = "{\"status\":\"SUCCESS_AFTER_REAUTH\"}";
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
        });

        // Auth Header verification endpoint
        mockServer.createContext("/api/check-auth", exchange -> {
            String auth = exchange.getRequestHeaders().getFirst("Authorization");
            String response = "{\"authHeader\":\"" + (auth != null ? auth : "") + "\"}";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });

        // Mock login endpoint returning access_token
        mockServer.createContext("/api/mock-login", exchange -> {
            String response = "{\"access_token\":\"live-login-token-999\",\"token_type\":\"bearer\"}";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });

        mockServer.start();
    }

    @AfterAll
    static void stopHttpServer() {
        if (mockServer != null) {
            mockServer.stop(0);
        }
    }

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        controller = new DynamicMappingController(
                mappingRepository,
                dynamicEngine,
                tokenManager,
                objectMapper
        );

        lenient().when(tokenManager.resolveBaseUrl(any())).thenReturn("http://localhost:" + mockServerPort);
        lenient().when(tokenManager.getBearerToken(any())).thenReturn(null);
        lenient().when(dynamicEngine.buildPayload(any(), any())).thenReturn("{\"testKey\":\"testVal\"}");
        lenient().when(dynamicEngine.buildPayload(any(), any(), anyBoolean())).thenReturn("{\"testKey\":\"testVal\"}");
        lenient().when(dynamicEngine.buildHeaders(any(), any())).thenReturn(Map.of("Content-Type", "application/json"));
        lenient().when(dynamicEngine.resolveUrl(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Test-run returns actual 200 response from live server without simulation")
    void testRunReturnsActualSuccessResponse() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/success");
        request.setPayloadTemplate("{}");
        request.setHeadersTemplate("{}");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(true);
        assertThat(body.get("statusCode")).isEqualTo(200);
        assertThat(body.get("responsePayload")).asString().contains("ACTUAL_OK");
        assertThat(body.containsKey("simulated")).isFalse();
        assertThat(body.containsKey("note")).isFalse();
    }

    @Test
    @DisplayName("Test-run returns actual 400 error from live server without simulation")
    void testRunReturnsActual400ErrorResponse() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/bad-request");
        request.setPayloadTemplate("{}");
        request.setHeadersTemplate("{}");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(false);
        assertThat(body.get("statusCode")).isEqualTo(400);
        assertThat(body.get("responsePayload")).asString().contains("INVALID_PALLET_FORMAT");
        assertThat(body.containsKey("simulated")).isFalse();
        assertThat(body.containsKey("note")).isFalse();
    }

    @Test
    @DisplayName("Test-run returns actual 500 error from live server without simulation")
    void testRunReturnsActual500ErrorResponse() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/error");
        request.setPayloadTemplate("{}");
        request.setHeadersTemplate("{}");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(false);
        assertThat(body.get("statusCode")).isEqualTo(500);
        assertThat(body.get("responsePayload")).asString().contains("DATABASE_DOWN");
        assertThat(body.containsKey("simulated")).isFalse();
        assertThat(body.containsKey("note")).isFalse();
    }

    @Test
    @DisplayName("Test-run returns HTTP 503 when server is unreachable / offline without simulation")
    void testRunReturns503WhenServerUnavailable() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        // Using an unassigned port to guarantee connection refusal
        request.setEndpointUrl("http://127.0.0.1:59981/api/non-existent");
        request.setPayloadTemplate("{}");
        request.setHeadersTemplate("{}");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(false);
        assertThat(body.get("statusCode")).isEqualTo(503);
        assertThat(body.get("responsePayload")).asString().contains("Server Unavailable");
        assertThat(body.get("responsePayload")).asString().doesNotContain("TEST-ACK");
        assertThat(body.containsKey("simulated")).isFalse();
        assertThat(body.containsKey("note")).isFalse();
    }

    @Test
    @DisplayName("Test-run formats JSON payload to form-url-encoded when Content-Type is x-www-form-urlencoded")
    void testRunFormUrlEncodedPayloadConversion() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/success");
        request.setPayloadTemplate("{\"username\":\"admin\",\"password\":\"secret\"}");
        request.setHeadersTemplate("{\"Content-Type\":\"application/x-www-form-urlencoded\"}");

        lenient().when(dynamicEngine.buildPayload(any(), any())).thenReturn("{\"username\":\"admin\",\"password\":\"secret\"}");
        lenient().when(dynamicEngine.buildHeaders(any(), any())).thenReturn(Map.of("Content-Type", "application/x-www-form-urlencoded"));

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(true);
        assertThat(body.get("requestPayload")).asString().contains("username=admin");
        assertThat(body.get("requestPayload")).asString().contains("password=secret");
    }

    @Test
    @DisplayName("Test-run executes reactive re-authentication and retries when status matches user-configured trigger")
    void testRunReactiveReauthenticationOnExpiredToken() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/expired-token");
        request.setPayloadTemplate("{\"key\":\"val\"}");
        request.setHeadersTemplate("{\"Content-Type\":\"application/json\"}");

        // Mock auth mapping with user-configured TokenRefreshConfig in conditionRules
        com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity authMapping = new com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity();
        authMapping.setTargetResourceId("LOGIQS-AMBIENT-WMS");
        authMapping.setOperationType("AUTHENTICATE");
        authMapping.setConditionRules("{\"invalidationStatusCodes\":\"401, 403\",\"maxRetries\":1}");

        lenient().when(mappingRepository.findByTargetResourceIdIgnoreCase("LOGIQS-AMBIENT-WMS"))
                .thenReturn(List.of(authMapping));
        lenient().when(tokenManager.forceRefreshToken("LOGIQS-AMBIENT-WMS"))
                .thenReturn("new-fresh-token-12345");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(true);
        assertThat(body.get("statusCode")).isEqualTo(200);
        assertThat(body.get("responsePayload")).asString().contains("SUCCESS_AFTER_REAUTH");
        assertThat(body.get("reauthenticated")).isEqualTo(true);
    }

    @Test
    @DisplayName("Bearer token is automatically injected and replaced for custom service dispatch")
    void testRunBearerTokenReplacedForCustomService() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/check-auth");
        request.setPayloadTemplate("{\"key\":\"val\"}");
        request.setHeadersTemplate("{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer <token>\"}");

        lenient().when(tokenManager.getBearerToken("LOGIQS-AMBIENT-WMS")).thenReturn("live-bearer-token-abc");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(true);
        // The mock server echoed back the Authorization header it received
        assertThat(body.get("responsePayload")).asString().contains("Bearer live-bearer-token-abc");
    }

    @Test
    @DisplayName("Testing AUTHENTICATE auto-caches the returned token into TokenManager")
    void testRunAutoCachesTokenFromLoginResponse() {
        DynamicMappingController.TestRunRequest request = new DynamicMappingController.TestRunRequest();
        request.setResourceId("LOGIQS-AMBIENT-WMS");
        request.setHttpMethod("POST");
        request.setEndpointUrl("http://localhost:" + mockServerPort + "/api/mock-login");
        request.setPayloadTemplate("{\"username\":\"admin\",\"password\":\"secret\"}");
        request.setHeadersTemplate("{\"Content-Type\":\"application/json\"}");

        ResponseEntity<Map<String, Object>> responseEntity = controller.testRunDispatch(request);

        assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("success")).isEqualTo(true);
        assertThat(body.get("tokenCached")).isEqualTo(true);
        assertThat(body.get("tokenPreview")).asString().contains("live-login");

        // Verify tokenManager.cacheToken was invoked with the extracted token
        org.mockito.Mockito.verify(tokenManager).cacheToken(
                org.mockito.ArgumentMatchers.eq("LOGIQS-AMBIENT-WMS"),
                org.mockito.ArgumentMatchers.eq("live-login-token-999")
        );
    }
}
