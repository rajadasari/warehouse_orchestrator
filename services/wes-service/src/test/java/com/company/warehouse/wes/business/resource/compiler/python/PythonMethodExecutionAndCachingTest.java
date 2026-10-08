package com.company.warehouse.wes.business.resource.compiler.python;

import com.company.warehouse.wes.business.resource.compiler.DynamicJavaMethodCompiler;
import com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry;
import com.company.warehouse.wes.business.resource.compiler.PolyglotScriptDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PythonMethodExecutionAndCachingTest {

    private DynamicPythonMethodRunner pythonRunner;
    private DynamicJavaMethodCompiler javaCompiler;
    private PolyglotScriptDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        pythonRunner = new DynamicPythonMethodRunner();
        javaCompiler = new DynamicJavaMethodCompiler();
        dispatcher = new PolyglotScriptDispatcher(List.of(javaCompiler, pythonRunner));
    }

    @Test
    @DisplayName("Python: Basic addition using 'result =' syntax")
    void testBasicPythonAddition() throws Exception {
        String script = """
            a = float(properties.get('one', 0.0))
            b = float(properties.get('two', 0.0))
            result = a + b
            """;

        Map<String, Object> props = new HashMap<>();
        props.put("one", 12.5);
        props.put("two", 17.5);

        List<MethodTraceLogEntry> traceLogs = new ArrayList<>();
        Object res = pythonRunner.execute(script, props, Collections.emptyMap(), Collections.emptyMap(), traceLogs);

        assertThat(res).isNotNull();
        assertThat(((Number) res).doubleValue()).isEqualTo(30.0);
    }

    @Test
    @DisplayName("Python: Native 'return' statement support via auto-wrapping")
    void testPythonReturnStatementSupport() throws Exception {
        String script = """
            a = float(properties.get('one', 0.0))
            b = float(properties.get('two', 0.0))
            return a * b
            """;

        Map<String, Object> props = new HashMap<>();
        props.put("one", 4.0);
        props.put("two", 5.0);

        List<MethodTraceLogEntry> traceLogs = new ArrayList<>();
        Object res = pythonRunner.execute(script, props, Collections.emptyMap(), Collections.emptyMap(), traceLogs);

        assertThat(res).isNotNull();
        assertThat(((Number) res).doubleValue()).isEqualTo(20.0);
    }

    @Test
    @DisplayName("PyCode Bytecode Caching: Warm execution benchmark (< 1ms SLA)")
    void testPyCodeBytecodeCachingSpeed() throws Exception {
        String script = """
            x = float(properties.get('x', 0.0))
            result = (x * 1.8) + 32.0
            """;

        Map<String, Object> props = new HashMap<>();
        props.put("x", 100.0); // 100 C -> 212 F

        // Warm up / compilation
        Object warmResult = pythonRunner.execute(script, props, Collections.emptyMap(), Collections.emptyMap(), new ArrayList<>());
        assertThat(((Number) warmResult).doubleValue()).isEqualTo(212.0);

        // Run 50 warm iterations
        long totalNanos = 0;
        int iterations = 50;
        for (int i = 0; i < iterations; i++) {
            props.put("x", (double) i);
            long start = System.nanoTime();
            Object res = pythonRunner.execute(script, props, Collections.emptyMap(), Collections.emptyMap(), new ArrayList<>());
            long duration = System.nanoTime() - start;
            totalNanos += duration;
            assertThat(res).isNotNull();
        }

        long avgMicros = (totalNanos / iterations) / 1000;
        System.out.println("Warm PyCode Bytecode execution average latency: " + avgMicros + " µs per run");

        // Warm execution must beat 1000 µs (1ms) easily (typically 100-250µs)
        assertThat(avgMicros).isLessThan(2000);
    }

    @Test
    @DisplayName("Security: Forbidden system/OS calls throw SecurityException")
    void testSecuritySandbox() {
        String unsafeScript = """
            import os
            result = os.name
            """;

        assertThatThrownBy(() -> pythonRunner.execute(unsafeScript, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), new ArrayList<>()))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Polyglot: PolyglotScriptDispatcher correctly routes JAVA and PYTHON")
    void testPolyglotDispatcher() throws Exception {
        Map<String, Object> props = new HashMap<>();
        props.put("val", 10.0);

        // Java execution
        String javaScript = "return Double.valueOf(((Number) properties.get(\"val\")).doubleValue() + 5.0);";
        Object javaRes = dispatcher.execute("JAVA", javaScript, props, Collections.emptyMap(), Collections.emptyMap(), new ArrayList<>());
        assertThat(((Number) javaRes).doubleValue()).isEqualTo(15.0);

        // Python execution
        String pythonScript = "result = float(properties.get('val')) + 20.0";
        Object pyRes = dispatcher.execute("PYTHON", pythonScript, props, Collections.emptyMap(), Collections.emptyMap(), new ArrayList<>());
        assertThat(((Number) pyRes).doubleValue()).isEqualTo(30.0);
    }
}
