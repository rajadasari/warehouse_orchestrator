package com.company.warehouse.wes.infrastructure.adapter.wms;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.common.client.software.dynamic.DynamicResponseExtractor;
import com.company.warehouse.wes.business.dynamic.DynamicPayloadEngine;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.business.spi.wms.WmsIntegrationSpi;
import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;
import com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Concrete Outbound Adapter implementing WmsIntegrationSpi.
 * Translates internal WES business pipeline commands to third-party WMS REST calls
 * using the universal dynamic software client engine.
 */
@Slf4j
@Component
public class WmsRestAdapter implements WmsIntegrationSpi {

    private final RestClient wmsRestClient;
    private final WmsClientProperties properties;
    private final TokenManager tokenManager;
    private final DynamicPayloadEngine dynamicEngine;
    private final DynamicResponseExtractor responseExtractor;
    private final ResourceManager resourceManager;

    public WmsRestAdapter(
            @org.springframework.beans.factory.annotation.Qualifier("wmsRestClient") RestClient wmsRestClient,
            WmsClientProperties properties,
            TokenManager tokenManager,
            DynamicPayloadEngine dynamicEngine,
            DynamicResponseExtractor responseExtractor,
            ResourceManager resourceManager) {
        this.wmsRestClient = wmsRestClient;
        this.properties = properties;
        this.tokenManager = tokenManager;
        this.dynamicEngine = dynamicEngine;
        this.responseExtractor = responseExtractor;
        this.resourceManager = resourceManager;
    }

    @Override
    public WmsPreAnnounceResult preAnnouncePallet(PalletPreAnnounceCommand command) {
        String targetResId = (command.getTargetResourceId() != null && !command.getTargetResourceId().trim().isEmpty())
                ? command.getTargetResourceId().trim()
                : properties.getTargetResourceId();
        log.info("Sending Pre-Announce to Third-Party WMS ({}) for Pallet LPN: {}", targetResId, command.getPalletLpn());

        Optional<ApiIntegrationMappingEntity> mappingOpt =
                dynamicEngine.findActiveMapping(targetResId, "PRE_ANNOUNCE");

        Object requestBody;
        String endpointPath = properties.getEndpoints().getPreAnnounce();
        Map<String, String> dynamicHeaders = new HashMap<>();

        if (mappingOpt.isPresent()) {
            ApiIntegrationMappingEntity mapping = mappingOpt.get();
            log.info("Applying dynamic payload mapping '{}' for target resource '{}'", mapping.getMappingCode(), targetResId);

            Map<String, Object> context = buildPreAnnounceContext(command, targetResId);
            requestBody = dynamicEngine.buildPayload(mapping.getPayloadTemplate(), context);
            if (mapping.getHeadersTemplate() != null && !mapping.getHeadersTemplate().trim().isEmpty()) {
                dynamicHeaders = dynamicEngine.buildHeaders(mapping.getHeadersTemplate(), context);
            }
            if (mapping.getEndpointUrl() != null && !mapping.getEndpointUrl().trim().isEmpty()) {
                endpointPath = mapping.getEndpointUrl().trim();
            }
        } else {
            Map<String, Object> fallbackPayload = new LinkedHashMap<>();
            fallbackPayload.put("palletLpn", command.getPalletLpn());
            fallbackPayload.put("skuCode", command.getSkuCode());
            fallbackPayload.put("quantity", command.getQuantity());
            fallbackPayload.put("actualWeightKg", command.getActualWeightKg());
            fallbackPayload.put("sourceLocation", command.getSourceLocation());
            requestBody = fallbackPayload;
        }

        try {
            String baseUrl = tokenManager.resolveBaseUrl(targetResId);
            String fullUri = endpointPath.startsWith("http")
                    ? endpointPath
                    : baseUrl + (endpointPath.startsWith("/") ? "" : "/") + endpointPath;

            RestClient.RequestBodySpec postSpec = wmsRestClient.post()
                    .uri(fullUri)
                    .header("X-Target-Resource-Id", targetResId)
                    .header("X-Idempotency-Key", "PRE-ANNOUNCE-" + command.getPalletLpn());

            dynamicHeaders.forEach(postSpec::header);

            JsonNode response = postSpec
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            boolean success = responseExtractor.isSuccess(response);
            String preAnnounceId = responseExtractor.extractId(response, "preAnnounceId", "id", "referenceId")
                    .orElse("PA-" + command.getPalletLpn());
            String message = responseExtractor.extractId(response, "message", "statusMessage")
                    .orElse(success ? "Pallet pre-announced successfully" : "Pre-announce rejected by WMS");

            if (success) {
                return WmsPreAnnounceResult.success(preAnnounceId, command.getPalletLpn());
            } else {
                return WmsPreAnnounceResult.failure(command.getPalletLpn(), message);
            }
        } catch (Exception e) {
            log.error("WMS Pre-Announce call failed for LPN {} against resource '{}': {}",
                    command.getPalletLpn(), targetResId, e.getMessage());
            return WmsPreAnnounceResult.failure(command.getPalletLpn(), "WMS Pre-Announce call failed: " + e.getMessage());
        }
    }

    @Override
    public WmsOrderResult createOrder(CreateOrderCommand command) {
        String targetResId = properties.getTargetResourceId();
        log.info("Calling WMS Create Order for LPN: {}, Client Ref: {}",
                command.getPalletLpn(), command.getClientOrderRef());

        Optional<ApiIntegrationMappingEntity> mappingOpt =
                dynamicEngine.findActiveMapping(targetResId, "CREATE_ORDER");

        Object requestBody;
        String endpointPath = properties.getEndpoints().getCreateOrder();
        Map<String, String> dynamicHeaders = new HashMap<>();

        if (mappingOpt.isPresent()) {
            ApiIntegrationMappingEntity mapping = mappingOpt.get();
            Map<String, Object> context = buildOrderContext(command, targetResId);
            requestBody = dynamicEngine.buildPayload(mapping.getPayloadTemplate(), context);
            if (mapping.getHeadersTemplate() != null && !mapping.getHeadersTemplate().trim().isEmpty()) {
                dynamicHeaders = dynamicEngine.buildHeaders(mapping.getHeadersTemplate(), context);
            }
            if (mapping.getEndpointUrl() != null && !mapping.getEndpointUrl().trim().isEmpty()) {
                endpointPath = mapping.getEndpointUrl().trim();
            }
        } else {
            Map<String, Object> fallbackPayload = new LinkedHashMap<>();
            fallbackPayload.put("palletLpn", command.getPalletLpn());
            fallbackPayload.put("clientOrderRef", command.getClientOrderRef());
            fallbackPayload.put("skuCode", command.getSkuCode());
            fallbackPayload.put("quantity", command.getQuantity());
            fallbackPayload.put("destinationLocation", command.getDestinationLocation());
            requestBody = fallbackPayload;
        }

        try {
            String baseUrl = tokenManager.resolveBaseUrl(targetResId);
            String fullUri = endpointPath.startsWith("http")
                    ? endpointPath
                    : baseUrl + (endpointPath.startsWith("/") ? "" : "/") + endpointPath;

            RestClient.RequestBodySpec postSpec = wmsRestClient.post()
                    .uri(fullUri)
                    .header("X-Target-Resource-Id", targetResId)
                    .header("X-Idempotency-Key", "ORD-CREATE-" + command.getClientOrderRef());

            dynamicHeaders.forEach(postSpec::header);

            JsonNode response = postSpec
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            boolean success = responseExtractor.isSuccess(response);
            String wmsOrderId = responseExtractor.extractId(response, "wmsOrderId", "orderId", "id")
                    .orElse("WMS-ORD-" + command.getClientOrderRef());

            if (success) {
                return WmsOrderResult.success(wmsOrderId, command.getClientOrderRef());
            } else {
                return WmsOrderResult.failure("WMS Create Order rejected by remote system");
            }
        } catch (Exception e) {
            log.error("WMS Create Order call failed for LPN {}: {}", command.getPalletLpn(), e.getMessage());
            return WmsOrderResult.failure("WMS Create Order call failed: " + e.getMessage());
        }
    }

    @Override
    public WmsReserveResult reserveOrder(ReserveOrderCommand command) {
        String targetResId = properties.getTargetResourceId();
        log.info("Calling WMS Reserve Order for WMS Order ID: {}, LPN: {}",
                command.getWmsOrderId(), command.getPalletLpn());

        Optional<ApiIntegrationMappingEntity> mappingOpt =
                dynamicEngine.findActiveMapping(targetResId, "RESERVE_ORDER");

        Object requestBody;
        String endpointPath = properties.getEndpoints().getReserveOrder()
                .replace("{orderId}", command.getWmsOrderId());
        Map<String, String> dynamicHeaders = new HashMap<>();

        if (mappingOpt.isPresent()) {
            ApiIntegrationMappingEntity mapping = mappingOpt.get();
            Map<String, Object> context = Map.of("reserve", command, "orderId", command.getWmsOrderId());
            requestBody = dynamicEngine.buildPayload(mapping.getPayloadTemplate(), context);
            if (mapping.getHeadersTemplate() != null && !mapping.getHeadersTemplate().trim().isEmpty()) {
                dynamicHeaders = dynamicEngine.buildHeaders(mapping.getHeadersTemplate(), context);
            }
            if (mapping.getEndpointUrl() != null && !mapping.getEndpointUrl().trim().isEmpty()) {
                endpointPath = mapping.getEndpointUrl().trim().replace("{orderId}", command.getWmsOrderId());
            }
        } else {
            Map<String, Object> fallbackPayload = new LinkedHashMap<>();
            fallbackPayload.put("wmsOrderId", command.getWmsOrderId());
            fallbackPayload.put("palletLpn", command.getPalletLpn());
            requestBody = fallbackPayload;
        }

        try {
            String baseUrl = tokenManager.resolveBaseUrl(targetResId);
            String fullUri = endpointPath.startsWith("http")
                    ? endpointPath
                    : baseUrl + (endpointPath.startsWith("/") ? "" : "/") + endpointPath;

            RestClient.RequestBodySpec postSpec = wmsRestClient.post()
                    .uri(fullUri)
                    .header("X-Target-Resource-Id", targetResId)
                    .header("X-Idempotency-Key", "ORD-RES-" + command.getWmsOrderId() + "-" + command.getPalletLpn());

            dynamicHeaders.forEach(postSpec::header);

            JsonNode response = postSpec
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            boolean success = responseExtractor.isSuccess(response);
            String reservationId = responseExtractor.extractId(response, "reservationId", "id")
                    .orElse("RES-" + command.getPalletLpn());
            String msg = responseExtractor.extractId(response, "message", "statusMessage")
                    .orElse(success ? "Order reserved successfully" : "Reservation failed");

            if (success) {
                return WmsReserveResult.success(reservationId, command.getWmsOrderId(), command.getPalletLpn());
            } else {
                return WmsReserveResult.failure(msg);
            }
        } catch (Exception e) {
            log.error("WMS Reserve Order call failed for Order {}: {}", command.getWmsOrderId(), e.getMessage());
            return WmsReserveResult.failure("WMS Reserve Order call failed: " + e.getMessage());
        }
    }

    @Override
    public WmsOutboundResult sendToOutbound(SendToOutboundCommand command) {
        String targetResId = properties.getTargetResourceId();
        log.info("Calling WMS Send to Outbound for WMS Order ID: {}, LPN: {}",
                command.getWmsOrderId(), command.getPalletLpn());

        Optional<ApiIntegrationMappingEntity> mappingOpt =
                dynamicEngine.findActiveMapping(targetResId, "OUTBOUND_RELEASE");

        Object requestBody;
        String endpointPath = properties.getEndpoints().getOutboundRelease()
                .replace("{orderId}", command.getWmsOrderId());
        Map<String, String> dynamicHeaders = new HashMap<>();

        if (mappingOpt.isPresent()) {
            ApiIntegrationMappingEntity mapping = mappingOpt.get();
            Map<String, Object> context = Map.of("outbound", command, "orderId", command.getWmsOrderId());
            requestBody = dynamicEngine.buildPayload(mapping.getPayloadTemplate(), context);
            if (mapping.getHeadersTemplate() != null && !mapping.getHeadersTemplate().trim().isEmpty()) {
                dynamicHeaders = dynamicEngine.buildHeaders(mapping.getHeadersTemplate(), context);
            }
            if (mapping.getEndpointUrl() != null && !mapping.getEndpointUrl().trim().isEmpty()) {
                endpointPath = mapping.getEndpointUrl().trim().replace("{orderId}", command.getWmsOrderId());
            }
        } else {
            Map<String, Object> fallbackPayload = new LinkedHashMap<>();
            fallbackPayload.put("wmsOrderId", command.getWmsOrderId());
            fallbackPayload.put("palletLpn", command.getPalletLpn());
            fallbackPayload.put("targetLocation", command.getTargetLocation());
            fallbackPayload.put("dispatchCarrier", command.getDispatchCarrier());
            requestBody = fallbackPayload;
        }

        try {
            String baseUrl = tokenManager.resolveBaseUrl(targetResId);
            String fullUri = endpointPath.startsWith("http")
                    ? endpointPath
                    : baseUrl + (endpointPath.startsWith("/") ? "" : "/") + endpointPath;

            RestClient.RequestBodySpec postSpec = wmsRestClient.post()
                    .uri(fullUri)
                    .header("X-Target-Resource-Id", targetResId)
                    .header("X-Idempotency-Key", "ORD-OUT-" + command.getWmsOrderId());

            dynamicHeaders.forEach(postSpec::header);

            JsonNode response = postSpec
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            boolean success = responseExtractor.isSuccess(response);
            String spur = responseExtractor.extractId(response, "outboundStageSpur", "spur", "dock")
                    .orElse(command.getTargetLocation());
            String msg = responseExtractor.extractId(response, "message", "statusMessage")
                    .orElse(success ? "Pallet released to outbound" : "Outbound release failed");

            if (success) {
                return WmsOutboundResult.success(command.getWmsOrderId(), command.getPalletLpn(), spur);
            } else {
                return WmsOutboundResult.failure(msg);
            }
        } catch (Exception e) {
            log.error("WMS Outbound call failed for Order {}: {}", command.getWmsOrderId(), e.getMessage());
            return WmsOutboundResult.failure("WMS Outbound call failed: " + e.getMessage());
        }
    }

    private Map<String, Object> buildPreAnnounceContext(PalletPreAnnounceCommand command, String targetResId) {
        Map<String, Object> context = new HashMap<>();
        context.put("pallet", command);

        String activeToken = null;
        try {
            activeToken = tokenManager.getBearerToken(targetResId);
        } catch (Exception e) {
            log.warn("Could not obtain auth token for resource '{}': {}", targetResId, e.getMessage());
        }

        context.put("token", activeToken != null ? activeToken : "");
        context.put("auth", Map.of(
                "token", activeToken != null ? activeToken : "",
                "bearerToken", activeToken != null && !activeToken.isEmpty() ? "Bearer " + activeToken : ""
        ));

        resourceManager.getResourceConfig(targetResId).ifPresent(cfg -> {
            Map<String, Object> resMap = new HashMap<>();
            resMap.put("resourceId", cfg.getResourceId());
            resMap.put("clientId", cfg.getClientId());
            resMap.put("ip", cfg.getIp());
            resMap.put("port", cfg.getPort());
            resMap.put("customProperties", cfg.getCustomProperties());
            context.put("resource", resMap);
        });

        return context;
    }

    private Map<String, Object> buildOrderContext(CreateOrderCommand command, String targetResId) {
        Map<String, Object> context = new HashMap<>();
        context.put("order", command);
        context.put("palletLpn", command.getPalletLpn());
        context.put("clientOrderRef", command.getClientOrderRef());

        String activeToken = null;
        try {
            activeToken = tokenManager.getBearerToken(targetResId);
        } catch (Exception e) {
            log.warn("Could not obtain auth token for resource '{}': {}", targetResId, e.getMessage());
        }

        context.put("token", activeToken != null ? activeToken : "");
        return context;
    }
}
