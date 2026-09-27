package com.company.warehouse.wes.business.integration;

import com.company.warehouse.common.client.software.integration.handshake.HandshakeConfig;
import com.company.warehouse.common.client.software.integration.handshake.HandshakeSession;
import com.company.warehouse.common.client.software.integration.handshake.UniversalHandshakeManager;
import com.company.warehouse.common.client.software.integration.mapping.DynamicMappingEngine;
import com.company.warehouse.common.client.software.integration.mapping.FieldMappingRule;
import com.company.warehouse.common.client.software.integration.rules.RuleEngineDispatcher;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleStateTransitionManager;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import com.company.warehouse.wes.api.dto.workflow.TriggerWorkflowRequest;
import com.company.warehouse.wes.business.workflow.WorkflowEngineService;
import com.company.warehouse.wes.data.entity.IntegrationChannelEntity;
import com.company.warehouse.wes.data.entity.IntegrationSessionEntity;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import com.company.warehouse.wes.data.repository.IntegrationChannelRepository;
import com.company.warehouse.wes.data.repository.IntegrationSessionRepository;
import com.company.warehouse.wes.data.repository.PalletRepository;
import com.company.warehouse.wes.data.repository.PalletTypeMasterRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Universal Integration Service.
 * Orchestrates generic multi-format parsing, 5-tier rule validation,
 * transactional state management, handshake lifecycle, and workflow dispatch.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GenericIntegrationService {

    private final IntegrationChannelRepository channelRepository;
    private final IntegrationSessionRepository sessionRepository;
    private final DynamicMappingEngine mappingEngine;
    private final RuleEngineDispatcher ruleDispatcher;
    private final RuleStateTransitionManager stateTransitionManager;
    private final UniversalHandshakeManager handshakeManager;
    private final WorkflowEngineService workflowEngineService;
    private final PalletRepository palletRepository;
    private final PalletTypeMasterRepository palletTypeRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> processIngress(String channelCode, String rawPayload) {
        log.info("Processing Ingress on channel '{}' (payload length: {} chars)",
                channelCode, rawPayload != null ? rawPayload.length() : 0);

        IntegrationChannelEntity channel = channelRepository.findByChannelCode(channelCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Integration channel not found: " + channelCode));

        // 1. Parse & Normalize to Canonical Map using channel mapping rules
        List<FieldMappingRule> mappingRules = deserializeList(channel.getMappingRules(), FieldMappingRule.class);
        Map<String, Object> canonical = mappingEngine.mapToCanonical(rawPayload, mappingRules);
        canonical.put("channelCode", channel.getChannelCode());
        canonical.put("domain", channel.getDomain());

        // 2. Evaluate 5-Tier Rule Engine
        List<ValidationRule> validationRules = deserializeList(channel.getValidationRules(), ValidationRule.class);
        List<RuleEvaluationResult> ruleResults = ruleDispatcher.evaluateAll(validationRules, canonical);

        // 3. Rule-Driven State Transition
        RuleStateTransitionManager.StateTransitionDecision decision =
                stateTransitionManager.resolveState(ruleResults, channel.getDefaultSuccessState());

        canonical.put("transactionStatus", decision.finalState());
        if (decision.failureReason() != null) {
            canonical.put("failureReason", decision.failureReason());
        }

        // 4. Upsert / Sync Pallet Entity if applicable
        if (canonical.containsKey("palletLpn") && canonical.get("palletLpn") != null) {
            syncPalletRecord(canonical, decision.finalState());
        }

        // 5. Handshake Protocol Resolution
        HandshakeConfig handshakeConfig = deserializeObject(channel.getHandshakeConfig(), HandshakeConfig.class);
        HandshakeSession session = handshakeManager.initiateSession(channel.getChannelCode(), handshakeConfig, canonical);

        // 6. If passed and workflow is configured, trigger asynchronous/synchronous flow
        if (decision.allPassed() && channel.getWorkflowCode() != null && !channel.getWorkflowCode().isBlank()) {
            try {
                String entityRef = canonical.containsKey("palletLpn") ? String.valueOf(canonical.get("palletLpn")) : session.getCorrelationKey();
                TriggerWorkflowRequest wfReq = TriggerWorkflowRequest.builder()
                        .workflowCode(channel.getWorkflowCode())
                        .entityReference(entityRef)
                        .initialContext(canonical)
                        .build();
                var wfInstance = workflowEngineService.triggerWorkflow(wfReq);
                canonical.put("workflowInstanceId", wfInstance.getId().toString());
            } catch (Exception e) {
                log.error("Failed to trigger workflow '{}' for session '{}': {}",
                        channel.getWorkflowCode(), session.getCorrelationKey(), e.getMessage());
            }
        }

        // 7. Persist Integration Session Audit Trail
        IntegrationSessionEntity sessionEntity = IntegrationSessionEntity.builder()
                .correlationKey(session.getCorrelationKey())
                .channelCode(channel.getChannelCode())
                .direction("INGRESS")
                .status(decision.finalState())
                .rawPayload(rawPayload)
                .canonicalData(serialize(canonical))
                .validationResults(serialize(ruleResults))
                .handshakeData(serialize(session))
                .errorDetails(decision.failureReason())
                .build();
        sessionRepository.save(sessionEntity);

        // 8. Return Technical Acknowledgment
        Map<String, Object> ack = handshakeManager.renderTechnicalAck(session, handshakeConfig);
        ack.put("finalState", decision.finalState());
        ack.put("allRulesPassed", decision.allPassed());
        if (decision.failureReason() != null) {
            ack.put("failureReason", decision.failureReason());
        }
        return ack;
    }

    @Transactional
    public Map<String, Object> handleCallback(String correlationKey, Map<String, Object> callbackData) {
        log.info("Handling callback for correlation key '{}'", correlationKey);
        HandshakeSession session = handshakeManager.handleCallback(correlationKey, callbackData);

        sessionRepository.findByCorrelationKey(correlationKey).ifPresent(entity -> {
            entity.setStatus(session.getStatus());
            entity.setHandshakeData(serialize(session));
            sessionRepository.save(entity);
        });

        // Resume workflow if active
        try {
            workflowEngineService.handleCallback(correlationKey, callbackData);
        } catch (Exception e) {
            log.debug("No waiting workflow instance found for correlation key '{}': {}", correlationKey, e.getMessage());
        }

        return Map.of(
                "correlationKey", correlationKey,
                "status", session.getStatus(),
                "completedAt", session.getCompletedAt() != null ? session.getCompletedAt().toString() : ""
        );
    }

    private void syncPalletRecord(Map<String, Object> canonical, String state) {
        String lpn = String.valueOf(canonical.get("palletLpn")).trim();
        if (lpn.isEmpty()) return;

        Optional<PalletEntity> palletOpt = palletRepository.findByPalletLpn(lpn);
        PalletEntity pallet = palletOpt.orElseGet(() -> {
            PalletTypeMasterEntity defaultType = palletTypeRepository.findAll().stream().findFirst().orElse(null);
            return PalletEntity.builder()
                    .palletLpn(lpn)
                    .palletType(defaultType)
                    .status("CREATED")
                    .build();
        });

        pallet.setStatus(state);
        if (canonical.containsKey("destinationBin") && canonical.get("destinationBin") != null) {
            pallet.setCurrentLocation(String.valueOf(canonical.get("destinationBin")));
        } else if (canonical.containsKey("sourceLocation") && canonical.get("sourceLocation") != null) {
            pallet.setCurrentLocation(String.valueOf(canonical.get("sourceLocation")));
        }

        if (canonical.containsKey("actualWeightKg") && canonical.get("actualWeightKg") instanceof Number n) {
            pallet.setActualWeightKg(BigDecimal.valueOf(n.doubleValue()));
        }

        palletRepository.save(pallet);
        log.info("Synchronized Pallet record '{}' status to '{}'", lpn, state);
    }

    private <T> List<T> deserializeList(String json, Class<T> clazz) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
        } catch (Exception e) {
            log.error("Failed to deserialize list: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private <T> T deserializeObject(String json, Class<T> clazz) {
        if (json == null || json.isBlank() || "{}".equals(json.trim())) {
            try { return clazz.getDeclaredConstructor().newInstance(); } catch (Exception ignored) { return null; }
        }
        try {
            return objectMapper.readValue(json, clazz);
        } catch (Exception e) {
            log.error("Failed to deserialize object: {}", e.getMessage());
            return null;
        }
    }

    private String serialize(Object obj) {
        if (obj == null) return "{}";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
