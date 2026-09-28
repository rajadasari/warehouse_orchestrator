package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.business.resource.snippet.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SystemSnippetControllerTest {

    private SystemSnippetController controller;

    @BeforeEach
    void setUp() {
        SystemSnippetRegistry registry = new SystemSnippetRegistry(List.of(
                new OpcUaWriteTagSnippet(),
                new OpcUaReadTagSnippet(),
                new RestDispatchSnippet(),
                new MathEvaluateSnippet()
        ));
        controller = new SystemSnippetController(registry);
    }

    @Test
    @DisplayName("listSnippets returns all system snippets")
    void testListSnippets() {
        ResponseEntity<List<Map<String, Object>>> response = controller.listSnippets(null);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(4);
    }

    @Test
    @DisplayName("listSnippets filters by category")
    void testListSnippetsByCategory() {
        ResponseEntity<List<Map<String, Object>>> response = controller.listSnippets("HARDWARE");
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(2); // OPC_UA_WRITE_TAG, OPC_UA_READ_TAG
    }

    @Test
    @DisplayName("getSnippet returns details for valid snippetId")
    void testGetSnippet() {
        ResponseEntity<Map<String, Object>> response = controller.getSnippet("OPC_UA_WRITE_TAG");
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("id", "OPC_UA_WRITE_TAG");
        assertThat(response.getBody()).containsEntry("category", "HARDWARE");
    }

    @Test
    @DisplayName("simulateSnippet runs snippet execution and returns 200 with result")
    void testSimulateSnippet() {
        Map<String, Object> payload = Map.of(
                "resourceId", "PLC-01",
                "methodId", "TEST_WRITE",
                "resourceProperties", Map.of("tagPrefix", "CONV_01"),
                "inputParameters", Map.of("tagAddress", "#{properties.tagPrefix}.Motor.Run", "value", true)
        );

        ResponseEntity<SnippetExecutionResult> response = controller.simulateSnippet("OPC_UA_WRITE_TAG", payload);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        assertThat(response.getBody().data()).containsEntry("tagAddress", "CONV_01.Motor.Run");
    }
}
