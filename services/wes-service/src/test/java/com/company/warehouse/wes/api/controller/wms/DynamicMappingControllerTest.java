package com.company.warehouse.wes.api.controller.wms;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.data.repository.ApiIntegrationMappingRepository;
import com.company.warehouse.wes.data.repository.ItemMasterRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
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
import java.util.Map;

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
    private ResourceManager resourceManager;
    @Mock
    private TokenManager tokenManager;
    @Mock
    private PalletRepository palletRepository;
    @Mock
    private ItemMasterRepository itemMasterRepository;

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
                resourceManager,
                tokenManager,
                palletRepository,
                itemMasterRepository,
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
}
