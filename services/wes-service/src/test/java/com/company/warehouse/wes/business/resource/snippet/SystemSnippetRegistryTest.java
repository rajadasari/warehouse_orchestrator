package com.company.warehouse.wes.business.resource.snippet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SystemSnippetRegistryTest {

    private SystemSnippetRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new SystemSnippetRegistry(List.of(
                new OpcUaWriteTagSnippet(),
                new OpcUaReadTagSnippet(),
                new RestDispatchSnippet(),
                new MathEvaluateSnippet()
        ));
    }

    @Test
    @DisplayName("Registry initializes and lists all registered snippets")
    void testRegistryListing() {
        List<SystemSnippet> snippets = registry.getAllSnippets();
        assertThat(snippets).hasSize(4);
        assertThat(registry.getSnippet("OPC_UA_WRITE_TAG")).isPresent();
        assertThat(registry.getSnippet("REST_DISPATCH")).isPresent();
        assertThat(registry.getSnippet("MATH_FORMULA")).isPresent();
    }

    @Test
    @DisplayName("OpcUaWriteTagSnippet interpolates parameters and executes successfully")
    void testOpcUaWriteTagExecution() {
        SystemSnippet snippet = registry.getSnippet("OPC_UA_WRITE_TAG").orElseThrow();

        SnippetExecutionContext context = new SnippetExecutionContext(
                "RES-CONV-01",
                "START_MOTOR",
                Map.of("tagPrefix", "DB100_CONV_01"),
                Map.of("tagAddress", "#{properties.tagPrefix}.Commands.Start", "value", 100)
        );

        SnippetExecutionResult result = snippet.execute(context);
        assertThat(result.success()).isTrue();
        assertThat(result.statusCode()).isEqualTo(200);
        assertThat(result.data()).containsEntry("tagAddress", "DB100_CONV_01.Commands.Start");
        assertThat(result.data()).containsEntry("writtenValue", 100);
    }

    @Test
    @DisplayName("MathEvaluateSnippet evaluates formula correctly")
    void testMathEvaluateExecution() {
        SystemSnippet snippet = registry.getSnippet("MATH_FORMULA").orElseThrow();

        SnippetExecutionContext context = new SnippetExecutionContext(
                "RES-STATION-01",
                "CALC_VOLUME",
                Map.of(),
                Map.of("formula", "(120 * 80 * 150) / 1000000", "unit", "m3")
        );

        SnippetExecutionResult result = snippet.execute(context);
        assertThat(result.success()).isTrue();
        assertThat(result.data()).containsEntry("unit", "m3");
    }
}
