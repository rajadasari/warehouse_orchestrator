package com.company.warehouse.wes.business.resource;

import com.company.warehouse.wes.api.controller.ResourceTemplateController;
import com.company.warehouse.wes.api.dto.resource.MethodTestRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.api.dto.resource.ResourceTemplateDto;
import com.company.warehouse.wes.business.resource.compiler.DynamicJavaMethodCompiler;
import com.company.warehouse.wes.business.resource.composer.service.EntityServiceDispatcher;
import com.company.warehouse.wes.domain.resource.MethodExecutionResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {"grpc.server.port=-1"})
@ActiveProfiles("test")
@Transactional
class TemplateMethodEndToEndIntegrationTest {

    @Autowired
    private ResourceTemplateController templateController;

    @Autowired
    private ResourceManager resourceManager;

    @Autowired
    private EntityServiceDispatcher serviceDispatcher;

    @Autowired
    private DynamicJavaMethodCompiler dynamicJavaCompiler;

    @Test
    @DisplayName("End-to-End: Define template with valA, valB, sumResult and execute ADD_PROPERTIES")
    void testDefineTemplateAndExecuteMethodFlow() {
        // 1. Prepare properties & code
        String javaCode = """
            double a = ((Number) properties.getOrDefault("valA", 0.0)).doubleValue();
            double b = ((Number) properties.getOrDefault("valB", 0.0)).doubleValue();
            double sum = a + b;
            return Double.valueOf(sum);
        """;

        Map<String, Object> initialProps = new HashMap<>();
        initialProps.put("valA", 10.0);
        initialProps.put("valB", 25.0);
        initialProps.put("sumResult", 0.0);

        // 2. Direct Controller testMethod invocation (Studio Test Bench flow)
        MethodTestRequestDto testReq = MethodTestRequestDto.builder()
                .methodName("ADD_PROPERTIES")
                .javaCode(javaCode)
                .properties(initialProps)
                .parameters(Collections.emptyMap())
                .storeResultToProperty("sumResult")
                .build();

        ResponseEntity<MethodExecutionResult> testResponse = templateController.testMethod(testReq);

        assertThat(testResponse.getStatusCode().value()).isEqualTo(200);
        MethodExecutionResult testResult = testResponse.getBody();
        assertThat(testResult).isNotNull();
        assertThat(testResult.isSuccess()).isTrue();
        assertThat(testResult.getData()).isEqualTo(35.0);
        assertThat(testResult.getUpdatedProperties()).containsEntry("sumResult", 35.0);
        assertThat(testResult.getTraceLogs()).isNotEmpty();

        // 3. Save Template into Platform
        Map<String, Object> methodDef = new HashMap<>();
        methodDef.put("name", "ADD_PROPERTIES");
        methodDef.put("category", "CALCULATION");
        methodDef.put("language", "JAVA");
        methodDef.put("javaCode", javaCode);
        methodDef.put("storeResultToProperty", "sumResult");
        methodDef.put("outputType", "NUMBER");

        ResourceTemplateDto templateDto = ResourceTemplateDto.builder()
                .templateCode("ADDER_TWIN_TEMPLATE")
                .templateName("Adder Twin Template")
                .category("LOGICAL")
                .resourceType("CALCULATOR")
                .propertySchema(List.of(
                        Map.of("key", "valA", "type", "DOUBLE", "defaultValue", 10.0),
                        Map.of("key", "valB", "type", "DOUBLE", "defaultValue", 25.0),
                        Map.of("key", "sumResult", "type", "DOUBLE", "defaultValue", 0.0)
                ))
                .defaultProperties(initialProps)
                .methodsSchema(List.of(methodDef))
                .build();

        ResourceTemplateDto savedTemplate = resourceManager.createTemplate(templateDto);
        assertThat(savedTemplate).isNotNull();
        assertThat(savedTemplate.getTemplateCode()).isEqualTo("ADDER_TWIN_TEMPLATE");

        // 4. Instantiate Digital Twin Resource from Template
        ResourceRequestDto createResourceDto = ResourceRequestDto.builder()
                .resourceId("ADDER_DEVICE_01")
                .name("Adder Device 01")
                .templateCode("ADDER_TWIN_TEMPLATE")
                .type("CALCULATOR")
                .category("LOGICAL")
                .customProperties(new HashMap<>(initialProps))
                .build();

        ResourceResponseDto createdTwin = resourceManager.createResource(createResourceDto);
        assertThat(createdTwin).isNotNull();
        assertThat(createdTwin.getResourceId()).isEqualTo("ADDER_DEVICE_01");

        // 5. Execute Method on the Live Twin via EntityServiceDispatcher
        MethodExecutionResult dispatchResult = serviceDispatcher.execute(
                "ADDER_DEVICE_01",
                "ADD_PROPERTIES",
                Map.of("storeResultToProperty", "sumResult")
        );

        assertThat(dispatchResult.isSuccess()).isTrue();
        assertThat(dispatchResult.getStatusCode()).isEqualTo(200);
        assertThat(dispatchResult.getData()).isEqualTo(35.0);
        assertThat(dispatchResult.getUpdatedProperties()).containsEntry("sumResult", 35.0);

        // 6. Verify that twin custom properties now has sumResult = 35.0
        ResourceResponseDto refreshedTwin = resourceManager.getResourceById("ADDER_DEVICE_01");
        assertThat(refreshedTwin.getCustomProperties()).containsEntry("sumResult", 35.0);
    }

    @Test
    @DisplayName("End-to-End: Define template with Python script and execute MULTIPLY_PROPERTIES")
    void testDefinePythonTemplateAndExecuteMethodFlow() {
        // 1. Python script
        String pythonScript = """
            a = float(properties.get("valA", 0.0))
            b = float(properties.get("valB", 0.0))
            result = a * b
            """;

        Map<String, Object> initialProps = new HashMap<>();
        initialProps.put("valA", 6.0);
        initialProps.put("valB", 7.0);
        initialProps.put("productResult", 0.0);

        // 2. Direct Controller testMethod invocation (Studio Test Bench flow)
        MethodTestRequestDto testReq = MethodTestRequestDto.builder()
                .methodName("MULTIPLY_PROPERTIES")
                .language("PYTHON")
                .script(pythonScript)
                .properties(initialProps)
                .parameters(Collections.emptyMap())
                .storeResultToProperty("productResult")
                .build();

        ResponseEntity<MethodExecutionResult> testResponse = templateController.testMethod(testReq);

        assertThat(testResponse.getStatusCode().value()).isEqualTo(200);
        MethodExecutionResult testResult = testResponse.getBody();
        assertThat(testResult).isNotNull();
        assertThat(testResult.isSuccess()).isTrue();
        assertThat(testResult.getData()).isEqualTo(42.0);
        assertThat(testResult.getUpdatedProperties()).containsEntry("productResult", 42.0);
        assertThat(testResult.getTraceLogs()).isNotEmpty();

        // 3. Save Template with Python Method
        Map<String, Object> methodDef = new HashMap<>();
        methodDef.put("name", "MULTIPLY_PROPERTIES");
        methodDef.put("category", "CALCULATION");
        methodDef.put("language", "PYTHON");
        methodDef.put("script", pythonScript);
        methodDef.put("storeResultToProperty", "productResult");
        methodDef.put("outputType", "NUMBER");

        ResourceTemplateDto templateDto = ResourceTemplateDto.builder()
                .templateCode("PY_MULTIPLIER_TEMPLATE")
                .templateName("Python Multiplier Template")
                .category("LOGICAL")
                .resourceType("CALCULATOR")
                .propertySchema(List.of(
                        Map.of("key", "valA", "type", "DOUBLE", "defaultValue", 6.0),
                        Map.of("key", "valB", "type", "DOUBLE", "defaultValue", 7.0),
                        Map.of("key", "productResult", "type", "DOUBLE", "defaultValue", 0.0)
                ))
                .defaultProperties(initialProps)
                .methodsSchema(List.of(methodDef))
                .build();

        ResourceTemplateDto savedTemplate = resourceManager.createTemplate(templateDto);
        assertThat(savedTemplate).isNotNull();

        // 4. Instantiate Digital Twin Resource
        ResourceRequestDto createResourceDto = ResourceRequestDto.builder()
                .resourceId("PY_CALC_01")
                .name("Python Calculator 01")
                .templateCode("PY_MULTIPLIER_TEMPLATE")
                .type("CALCULATOR")
                .category("LOGICAL")
                .customProperties(new HashMap<>(initialProps))
                .build();

        ResourceResponseDto createdTwin = resourceManager.createResource(createResourceDto);
        assertThat(createdTwin).isNotNull();

        // 5. Execute Method on the Live Twin via EntityServiceDispatcher
        MethodExecutionResult dispatchResult = serviceDispatcher.execute(
                "PY_CALC_01",
                "MULTIPLY_PROPERTIES",
                Map.of("storeResultToProperty", "productResult")
        );

        assertThat(dispatchResult.isSuccess()).isTrue();
        assertThat(dispatchResult.getStatusCode()).isEqualTo(200);
        assertThat(dispatchResult.getData()).isEqualTo(42.0);
        assertThat(dispatchResult.getUpdatedProperties()).containsEntry("productResult", 42.0);

        // 6. Verify twin property persistence
        ResourceResponseDto refreshedTwin = resourceManager.getResourceById("PY_CALC_01");
        assertThat(refreshedTwin.getCustomProperties()).containsEntry("productResult", 42.0);
    }
}
