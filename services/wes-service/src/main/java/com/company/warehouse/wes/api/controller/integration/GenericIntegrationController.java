package com.company.warehouse.wes.api.controller.integration;

import com.company.warehouse.wes.business.integration.GenericIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Universal Ingress and Callback REST Gateway.
 * Accepts XML, JSON, or Delimited documents across all configured integration channels.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wes/integration")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GenericIntegrationController {

    private final GenericIntegrationService integrationService;

    /**
     * Universal Ingress Endpoint for any channel (Inbound, Outbound, Inventory, Equipment).
     */
    @PostMapping(
            value = "/channels/{channelCode}/ingest",
            consumes = {MediaType.APPLICATION_XML_VALUE, MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE, MediaType.ALL_VALUE}
    )
    public ResponseEntity<Map<String, Object>> ingest(
            @PathVariable String channelCode,
            @RequestBody String rawPayload) {
        log.info("POST /api/v1/wes/integration/channels/{}/ingest", channelCode);

        Map<String, Object> result = integrationService.processIngress(channelCode, rawPayload);

        boolean passed = Boolean.TRUE.equals(result.get("allRulesPassed"));
        String mode = String.valueOf(result.get("mode"));

        if (!passed) {
            // Business / Rule Validation failure
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(result);
        }

        if ("ASYNC_CALLBACK".equalsIgnoreCase(mode) || "ASYNC_POLLING".equalsIgnoreCase(mode) || "ASYNC_EVENT".equalsIgnoreCase(mode)) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(result);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Backward-compatible SAP EWM IDoc Gateway endpoint.
     * Routes directly to INBOUND_PALLET_CHANNEL.
     */
    @PostMapping(
            value = "/idoc",
            consumes = {MediaType.APPLICATION_XML_VALUE, MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE}
    )
    public ResponseEntity<Map<String, Object>> ingestIdoc(@RequestBody String rawPayload) {
        log.info("POST /api/v1/wes/integration/idoc: Routing to 'INBOUND_PALLET_CHANNEL'");
        return ingest("INBOUND_PALLET_CHANNEL", rawPayload);
    }

    /**
     * Universal Callback / Handshake Completion Endpoint.
     */
    @PostMapping(value = "/callbacks", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> handleCallback(
            @RequestHeader(value = "X-Correlation-ID", required = false) String headerCorrKey,
            @RequestBody Map<String, Object> callbackData) {
        String corrKey = (headerCorrKey != null && !headerCorrKey.isBlank())
                ? headerCorrKey.trim()
                : (callbackData != null && callbackData.get("correlationKey") != null
                ? String.valueOf(callbackData.get("correlationKey")).trim() : null);

        if (corrKey == null || corrKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Correlation key must be provided in X-Correlation-ID header or JSON body"));
        }

        log.info("POST /api/v1/wes/integration/callbacks: correlationKey='{}'", corrKey);
        Map<String, Object> result = integrationService.handleCallback(corrKey, callbackData != null ? callbackData : new HashMap<>());
        return ResponseEntity.ok(result);
    }
}
