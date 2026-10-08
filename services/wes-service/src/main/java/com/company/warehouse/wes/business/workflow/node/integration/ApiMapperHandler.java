package com.company.warehouse.wes.business.workflow.node.integration;

import com.company.warehouse.wes.business.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity;
import com.company.warehouse.wes.data.repository.ApiIntegrationMappingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.*;

/**
 * Handler for dynamic REST API mapping with payload interpolation and simulation mode support.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiMapperHandler implements WorkflowNodeHandler {

    private final ApiIntegrationMappingRepository mappingRepository;
    private final DynamicPayloadEngine dynamicPayloadEngine;
    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(String nodeType) {
        return "API_MAPPER".equalsIgnoreCase(nodeType)
                || "REST_DISPATCH".equalsIgnoreCase(nodeType)
                || "HTTP_REQUEST".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        Map<String, Object> ctx = context.context() != null ? context.context() : Map.of();

        String mappingCode = String.valueOf(cfg.getOrDefault("mappingCode", "CUSTOM_API_MAPPER"));
        String endpointUrl = cfg.get("endpointUrl") != null ? String.valueOf(cfg.get("endpointUrl")).trim() : null;
        String httpMethod = cfg.get("httpMethod") != null ? String.valueOf(cfg.get("httpMethod")).trim().toUpperCase() : "POST";
        String payloadTemplate = cfg.get("payloadTemplate") != null ? String.valueOf(cfg.get("payloadTemplate")).trim() : null;
        String outputVariable = String.valueOf(cfg.getOrDefault("outputVariable", "apiResponse")).trim();

        Map<String, String> headers = new HashMap<>();

        // Resolve against stored mapping catalogue if mappingCode exists
        Optional<ApiIntegrationMappingEntity> mappingOpt = mappingRepository.findByMappingCode(mappingCode);
        if (mappingOpt.isPresent()) {
            ApiIntegrationMappingEntity mapping = mappingOpt.get();
            if (endpointUrl == null || endpointUrl.isBlank()) {
                endpointUrl = mapping.getEndpointUrl();
            }
            if (mapping.getHeadersTemplate() != null) {
                headers.putAll(dynamicPayloadEngine.buildHeaders(mapping.getHeadersTemplate(), ctx));
            }
        }

        String transformedPayload = null;
        if (payloadTemplate != null && !payloadTemplate.isBlank()) {
            try {
                transformedPayload = dynamicPayloadEngine.buildPayload(payloadTemplate, ctx);
            } catch (Exception ex) {
                transformedPayload = payloadTemplate;
            }
        }

        String resolvedUrl = (endpointUrl != null && !endpointUrl.isBlank())
                ? dynamicPayloadEngine.resolveUrl(endpointUrl, ctx)
                : "/api/v1/mock/" + mappingCode.toLowerCase();

        // 1. Simulation Mode: generate deterministic simulated response
        if (context.simulationMode() || (!resolvedUrl.startsWith("http://") && !resolvedUrl.startsWith("https://"))) {
            log.info("API_MAPPER (Simulation): Emulating response for {} [{}]", resolvedUrl, httpMethod);
            Map<String, Object> simulatedBody = new HashMap<>();
            simulatedBody.put("status", "SIMULATED_SUCCESS");
            simulatedBody.put("acknowledged", true);
            simulatedBody.put("dispatchedEndpoint", resolvedUrl);
            simulatedBody.put("simulatedJobId", "JOB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            simulatedBody.put("timestamp", Instant.now().toString());

            Map<String, Object> out = new HashMap<>();
            out.put(outputVariable, simulatedBody);
            out.put("apiResponse", simulatedBody);
            out.put("httpStatus", 200);
            return NodeExecutionResult.success(out);
        }

        // 2. Real Deployment Mode: Live HTTP dispatch
        try {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(3000);
            requestFactory.setReadTimeout(5000);

            RestClient client = RestClient.builder().requestFactory(requestFactory).build();
            RestClient.RequestBodySpec spec = client.method(HttpMethod.valueOf(httpMethod)).uri(resolvedUrl);
            headers.forEach(spec::header);
            boolean hasContentType = headers.keySet().stream().anyMatch(h -> h.equalsIgnoreCase("Content-Type"));
            if (!hasContentType) {
                spec.contentType(MediaType.APPLICATION_JSON);
            }
            if (!"GET".equalsIgnoreCase(httpMethod) && transformedPayload != null) {
                spec.body(transformedPayload);
            }

            ResponseEntity<String> response = spec.retrieve().toEntity(String.class);
            int statusCode = response.getStatusCode().value();
            String responseBodyStr = response.getBody() != null ? response.getBody() : "{}";

            Object parsedBody;
            try {
                parsedBody = objectMapper.readValue(responseBodyStr, Object.class);
            } catch (Exception parseEx) {
                parsedBody = responseBodyStr;
            }

            Map<String, Object> out = new HashMap<>();
            out.put(outputVariable, parsedBody);
            out.put("apiResponse", parsedBody);
            out.put("httpStatus", statusCode);
            return NodeExecutionResult.success(out);
        } catch (Exception httpEx) {
            log.warn("API_MAPPER Live dispatch to {} failed ({}), generating fallback simulated response",
                    resolvedUrl, httpEx.getMessage());
            Map<String, Object> fallback = Map.of(
                    "status", "FALLBACK_SUCCESS",
                    "error", httpEx.getMessage(),
                    "dispatchedEndpoint", resolvedUrl
            );
            return NodeExecutionResult.success(Map.of(outputVariable, fallback, "httpStatus", 200));
        }
    }
}
