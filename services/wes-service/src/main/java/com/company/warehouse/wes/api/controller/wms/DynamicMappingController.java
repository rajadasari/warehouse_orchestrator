package com.company.warehouse.wes.api.controller.wms;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.business.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity;
import com.company.warehouse.wes.data.repository.ApiIntegrationMappingRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/mappings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DynamicMappingController {

    private final ApiIntegrationMappingRepository mappingRepository;
    private final DynamicPayloadEngine dynamicEngine;
    private final TokenManager tokenManager;

    /**
     * List dynamic API mappings.
     */
    @GetMapping
    public ResponseEntity<List<ApiIntegrationMappingEntity>> getMappings(
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String operationType) {
        if (resourceId != null && !resourceId.trim().isEmpty()) {
            return ResponseEntity.ok(mappingRepository.findByTargetResourceIdIgnoreCase(resourceId.trim()));
        }
        if (operationType != null && !operationType.trim().isEmpty()) {
            return ResponseEntity.ok(mappingRepository.findByOperationTypeIgnoreCase(operationType.trim()));
        }
        return ResponseEntity.ok(mappingRepository.findAll());
    }

    /**
     * Get mapping by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiIntegrationMappingEntity> getMappingById(@PathVariable UUID id) {
        return mappingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create new dynamic mapping.
     */
    @PostMapping
    public ResponseEntity<ApiIntegrationMappingEntity> createMapping(@RequestBody ApiIntegrationMappingEntity entity) {
        if (mappingRepository.existsByMappingCode(entity.getMappingCode())) {
            throw new IllegalArgumentException("Mapping code '" + entity.getMappingCode() + "' already exists.");
        }
        ApiIntegrationMappingEntity saved = mappingRepository.save(entity);
        dynamicEngine.invalidateCache();
        return ResponseEntity.ok(saved);
    }

    /**
     * Update existing dynamic mapping.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiIntegrationMappingEntity> updateMapping(
            @PathVariable UUID id,
            @RequestBody ApiIntegrationMappingEntity updated) {
        return mappingRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setDescription(updated.getDescription());
                    existing.setOperationType(updated.getOperationType());
                    existing.setTargetResourceId(updated.getTargetResourceId());
                    existing.setHttpMethod(updated.getHttpMethod());
                    existing.setEndpointUrl(updated.getEndpointUrl());
                    existing.setHeadersTemplate(updated.getHeadersTemplate());
                    existing.setPayloadTemplate(updated.getPayloadTemplate());
                    existing.setConditionRules(updated.getConditionRules());
                    existing.setActive(updated.isActive());

                    ApiIntegrationMappingEntity saved = mappingRepository.save(existing);
                    dynamicEngine.invalidateCache();
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete/deactivate mapping.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMapping(@PathVariable UUID id) {
        if (!mappingRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        mappingRepository.deleteById(id);
        dynamicEngine.invalidateCache();
        return ResponseEntity.noContent().build();
    }

    /**
     * Provides available schema dictionaries (Pallet, Resource, Item Master, Functions)
     * so the UI can populate the clickable field palette!
     */
    @GetMapping("/dictionary")
    public ResponseEntity<Map<String, Object>> getFieldDictionary() {
        Map<String, Object> dict = new HashMap<>();

        dict.put("pallet", List.of(
                Map.of("field", "pallet.palletLpn", "description", "Pallet Barcode / SSCC (e.g. PLT-2026-001)"),
                Map.of("field", "pallet.palletTypeCode", "description", "Pallet Type (EUR_WOOD, CHEP_PLASTIC)"),
                Map.of("field", "pallet.itemCode", "description", "Material / Item Master Code"),
                Map.of("field", "pallet.skuCode", "description", "Stock Keeping Unit Code"),
                Map.of("field", "pallet.quantity", "description", "Loaded item quantity (Numeric)"),
                Map.of("field", "pallet.uom", "description", "Unit of Measure (KG, EA, BOX)"),
                Map.of("field", "pallet.lotNumber", "description", "Manufacturer batch / lot number"),
                Map.of("field", "pallet.expiryDate", "description", "Batch expiry date (YYYY-MM-DD)"),
                Map.of("field", "pallet.actualWeightKg", "description", "Certified scale weight in KG (Numeric)"),
                Map.of("field", "pallet.sourceLocation", "description", "Receiving dock or conveyor bay (RCV-DOCK-01)"),
                Map.of("field", "pallet.status", "description", "Pallet execution status (RECEIVED, STORED)")
        ));

        dict.put("resource", List.of(
                Map.of("field", "resource.resourceId", "description", "Target Resource ID (e.g. LOGIQS-AMBIENT-WMS)"),
                Map.of("field", "resource.name", "description", "Resource Display Name"),
                Map.of("field", "resource.type", "description", "Resource Type (WMS, SOFTWARE, PLC)"),
                Map.of("field", "resource.customProperties.clientId", "description", "Configured OAuth Client ID"),
                Map.of("field", "resource.customProperties.ip", "description", "Configured Host IP address"),
                Map.of("field", "resource.customProperties.port", "description", "Configured Host Port")
        ));

        dict.put("item", List.of(
                Map.of("field", "item.itemCode", "description", "Item master code"),
                Map.of("field", "item.name", "description", "Item product description"),
                Map.of("field", "item.baseUom", "description", "Base unit of measure"),
                Map.of("field", "item.storageZone", "description", "Recommended storage temperature zone")
        ));

        dict.put("auth", List.of(
                Map.of("field", "auth.token", "description", "Active Bearer token for target resource (from Token Manager)"),
                Map.of("field", "auth.bearerToken", "description", "Pre-formatted Bearer header value ('Bearer <token>')"),
                Map.of("field", "token", "description", "Direct token alias (e.g. {{ token }})")
        ));

        dict.put("functions", List.of(
                Map.of("field", "fn.now", "description", "Current ISO-8601 UTC timestamp"),
                Map.of("field", "fn.uuid", "description", "Generate random UUID v4 string"),
                Map.of("field", "fn.epochMillis", "description", "Current UNIX timestamp in milliseconds"),
                Map.of("field", "fn.epochSeconds", "description", "Current UNIX timestamp in seconds")
        ));

        return ResponseEntity.ok(dict);
    }

    /**
     * Preview resolved URL and payload given a template and generic test context.
     */
    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> previewPayload(@RequestBody PreviewRequest request) {
        Map<String, Object> context = buildSampleContext(request.getResourceId(), request.getTestContext());
        String resolvedJson = dynamicEngine.buildPayload(request.getPayloadTemplate(), context, true);
        String rawEndpoint = request.getEndpointUrl() != null ? request.getEndpointUrl().trim() : "";
        rawEndpoint = rawEndpoint.replaceFirst("^(?i)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\\s+", "");
        String resolvedUrl = !rawEndpoint.isEmpty()
                ? dynamicEngine.resolveUrl(rawEndpoint, context)
                : "";

        return ResponseEntity.ok(Map.of(
                "success", true,
                "resolvedUrl", resolvedUrl,
                "resolvedPayload", resolvedJson,
                "sampleContext", context
        ));
    }

    /**
     * Test-run / Dry-run dispatch directly to the target endpoint.
     */
    @PostMapping("/test-run")
    public ResponseEntity<Map<String, Object>> testRunDispatch(@RequestBody TestRunRequest request) {
        String targetResId = request.getResourceId() != null && !request.getResourceId().trim().isEmpty()
                ? request.getResourceId().trim()
                : "LOGIQS-AMBIENT-WMS";

        Map<String, Object> context = buildSampleContext(targetResId, request.getTestContext());
        String resolvedPayload = dynamicEngine.buildPayload(request.getPayloadTemplate(), context);
        Map<String, String> resolvedHeaders = dynamicEngine.buildHeaders(request.getHeadersTemplate(), context);

        String baseUrl = tokenManager.resolveBaseUrl(targetResId);
        String rawEndpoint = request.getEndpointUrl() != null ? request.getEndpointUrl().trim() : "";
        rawEndpoint = rawEndpoint.replaceFirst("^(?i)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\\s+", "");
        String resolvedPath = dynamicEngine.resolveUrl(rawEndpoint, context);

        String cleanBase = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        String cleanPath = resolvedPath.startsWith("/") ? resolvedPath : "/" + resolvedPath;
        String fullUrl = resolvedPath.startsWith("http")
                ? resolvedPath
                : cleanBase + cleanPath;

        String token = null;
        try {
            token = tokenManager.getBearerToken(targetResId);
        } catch (Exception e) {
            log.warn("Could not retrieve bearer token for {}: {}", targetResId, e.getMessage());
        }

        log.info("Executing Test-Run dispatch to: {} [{}]", fullUrl, request.getHttpMethod());

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);

        try {
            RestClient testClient = RestClient.builder()
                    .requestFactory(requestFactory)
                    .build();
            RestClient.RequestBodySpec spec = testClient.method(HttpMethod.valueOf(request.getHttpMethod().toUpperCase()))
                    .uri(fullUrl);

            resolvedHeaders.forEach(spec::header);
            if (!resolvedHeaders.containsKey("Accept") && !resolvedHeaders.containsKey("accept")) {
                spec.header("Accept", "application/json, */*");
            }
            if (token != null && !token.trim().isEmpty()) {
                if (!resolvedHeaders.containsKey("Authentication")) {
                    spec.header("Authentication", token);
                }
                if (!resolvedHeaders.containsKey("Authorization")) {
                    spec.header("Authorization", "Bearer " + token);
                }
            }

            if (!"GET".equalsIgnoreCase(request.getHttpMethod()) && resolvedPayload != null && !resolvedPayload.trim().isEmpty()) {
                spec.body(resolvedPayload);
            }

            ResponseEntity<String> response = spec.retrieve().toEntity(String.class);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("targetUrl", fullUrl);
            result.put("requestPayload", resolvedPayload);
            result.put("statusCode", response.getStatusCode().value());
            result.put("responsePayload", response.getBody() != null ? response.getBody() : "{}");
            return ResponseEntity.ok(result);
        } catch (RestClientResponseException e) {
            log.warn("Test-run dispatch to {} returned HTTP error: status={}, body={}", fullUrl, e.getStatusCode(), e.getResponseBodyAsString());
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("targetUrl", fullUrl);
            result.put("requestPayload", resolvedPayload != null ? resolvedPayload : "");
            result.put("statusCode", e.getStatusCode().value());
            result.put("responsePayload", e.getResponseBodyAsString() != null && !e.getResponseBodyAsString().isEmpty()
                    ? e.getResponseBodyAsString()
                    : "{\"error\": \"HTTP " + e.getStatusCode().value() + " " + e.getStatusText() + "\"}");
            result.put("error", "HTTP " + e.getStatusCode().value() + " " + e.getStatusText());
            return ResponseEntity.ok(result);
        } catch (ResourceAccessException e) {
            String errorMsg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            log.warn("Test-run dispatch to {} failed - Server unavailable: {}", fullUrl, errorMsg);
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("targetUrl", fullUrl);
            result.put("requestPayload", resolvedPayload != null ? resolvedPayload : "");
            result.put("statusCode", 503);
            String safeMsg = errorMsg != null ? errorMsg.replace("\"", "\\\"").replace("\r", " ").replace("\n", " ") : "Connection refused";
            result.put("responsePayload", "{\n  \"error\": \"Server Unavailable / Connection Failed\",\n  \"targetUrl\": \"" + fullUrl + "\",\n  \"details\": \"" + safeMsg + "\"\n}");
            result.put("error", "Server connection failed: " + (errorMsg != null ? errorMsg : "Connection refused"));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.warn("Test-run dispatch to {} failed: {}", fullUrl, e.getMessage());
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("targetUrl", fullUrl);
            result.put("requestPayload", resolvedPayload != null ? resolvedPayload : "");
            result.put("statusCode", 500);
            String safeMsg = e.getMessage() != null ? e.getMessage().replace("\"", "\\\"").replace("\r", " ").replace("\n", " ") : "Unknown error";
            result.put("responsePayload", "{\n  \"error\": \"Dispatch Error\",\n  \"details\": \"" + safeMsg + "\"\n}");
            result.put("error", e.getMessage() != null ? e.getMessage() : "Dispatch error");
            return ResponseEntity.ok(result);
        }
    }

    private Map<String, Object> buildSampleContext(String resourceId, Map<String, Object> testContext) {
        Map<String, Object> context = new HashMap<>();

        // 1. Pallet baseline data (can be fully overridden by testContext)
        Map<String, Object> palletData = new HashMap<>();
        palletData.put("palletLpn", "PLT-2026-888999");
        palletData.put("palletTypeCode", "EUR_WOOD");
        palletData.put("itemCode", "MAT-COCOA-01");
        palletData.put("skuCode", "SKU-CHOCO-800");
        palletData.put("quantity", 1000);
        palletData.put("uom", "KG");
        palletData.put("lotNumber", "LOT-2026-555");
        palletData.put("expiryDate", "2027-12-31");
        palletData.put("actualWeightKg", 1025.5);
        palletData.put("sourceLocation", "RCV-DOCK-01");
        palletData.put("status", "RECEIVED");
        context.put("pallet", palletData);

        // 2. Resource Data
        String targetRes = resourceId != null && !resourceId.trim().isEmpty() ? resourceId : "LOGIQS-AMBIENT-WMS";
        Map<String, Object> resData = new HashMap<>();
        resData.put("resourceId", targetRes);
        resData.put("name", "Logiqs Ambient WMS");
        resData.put("type", "WMS");

        Map<String, Object> customProps = new HashMap<>();
        customProps.put("clientId", "demo-client-id");
        customProps.put("ip", "192.168.1.100");
        customProps.put("port", 8089);
        resData.put("customProperties", customProps);
        context.put("resource", resData);

        // 3. Item Master baseline Data
        Map<String, Object> itemData = new HashMap<>();
        itemData.put("itemCode", "MAT-COCOA-01");
        itemData.put("name", "Raw Cocoa Powder Premium");
        itemData.put("baseUom", "KG");
        itemData.put("storageZone", "AMBIENT");
        context.put("item", itemData);

        // 4. Auth & Bearer Token Data
        String token = null;
        try {
            token = tokenManager.getBearerToken(targetRes);
        } catch (Exception ignored) {}
        if (token == null) {
            token = "";
        }

        Map<String, Object> authData = new HashMap<>();
        authData.put("token", token);
        authData.put("bearerToken", token.isEmpty() ? "" : "Bearer " + token);
        authData.put("method", "OAUTH2_BEARER");
        context.put("auth", authData);
        context.put("token", token);

        // 5. Merge user-provided generic testContext (overrides and adds any variables)
        if (testContext != null && !testContext.isEmpty()) {
            context.putAll(testContext);
        }

        return context;
    }

    @Data
    public static class PreviewRequest {
        private String resourceId;
        private String endpointUrl;
        private String palletLpn;
        private String payloadTemplate;
        private Map<String, Object> testContext;
    }

    @Data
    public static class TestRunRequest {
        private String resourceId;
        private String palletLpn;
        private String httpMethod;
        private String endpointUrl;
        private String headersTemplate;
        private String payloadTemplate;
        private Map<String, Object> testContext;
    }
}
