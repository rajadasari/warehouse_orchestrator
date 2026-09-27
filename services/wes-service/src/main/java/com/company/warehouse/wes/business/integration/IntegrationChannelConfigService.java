package com.company.warehouse.wes.business.integration;

import com.company.warehouse.common.client.software.integration.handshake.HandshakeConfig;
import com.company.warehouse.common.client.software.integration.mapping.DynamicMappingEngine;
import com.company.warehouse.common.client.software.integration.mapping.FieldMappingRule;
import com.company.warehouse.common.client.software.integration.parser.AutoDetectingDataParser;
import com.company.warehouse.common.client.software.integration.rules.RuleEngineDispatcher;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleStateTransitionManager;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import com.company.warehouse.wes.api.dto.integration.ChannelDryRunRequest;
import com.company.warehouse.wes.api.dto.integration.ChannelDryRunResponse;
import com.company.warehouse.wes.api.dto.integration.IntegrationChannelDto;
import com.company.warehouse.wes.data.entity.IntegrationChannelEntity;
import com.company.warehouse.wes.data.repository.IntegrationChannelRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service managing CRUD operations, validation dry-runs, and AI schema introspection
 * for Integration Channels.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationChannelConfigService {

    private final IntegrationChannelRepository channelRepository;
    private final AutoDetectingDataParser dataParser;
    private final DynamicMappingEngine mappingEngine;
    private final RuleEngineDispatcher ruleDispatcher;
    private final RuleStateTransitionManager stateTransitionManager;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<IntegrationChannelDto> getAllChannels() {
        return channelRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public IntegrationChannelDto getChannelByCode(String channelCode) {
        return channelRepository.findByChannelCode(channelCode.trim().toUpperCase())
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Integration channel not found: " + channelCode));
    }

    @Transactional
    public IntegrationChannelDto createChannel(IntegrationChannelDto dto) {
        String code = dto.getChannelCode().trim().toUpperCase();
        if (channelRepository.existsByChannelCode(code)) {
            throw new IllegalArgumentException("Channel with code '" + code + "' already exists");
        }

        IntegrationChannelEntity entity = IntegrationChannelEntity.builder()
                .channelCode(code)
                .channelName(dto.getChannelName().trim())
                .direction(dto.getDirection() != null ? dto.getDirection().trim().toUpperCase() : "INGRESS")
                .domain(dto.getDomain() != null ? dto.getDomain().trim().toUpperCase() : "INBOUND")
                .payloadFormat(dto.getPayloadFormat() != null ? dto.getPayloadFormat().trim().toUpperCase() : "AUTO")
                .mappingRules(serialize(dto.getMappingRules() != null ? dto.getMappingRules() : List.of()))
                .validationRules(serialize(dto.getValidationRules() != null ? dto.getValidationRules() : List.of()))
                .handshakeConfig(serialize(dto.getHandshakeConfig() != null ? dto.getHandshakeConfig() : new HandshakeConfig()))
                .defaultSuccessState(dto.getDefaultSuccessState() != null ? dto.getDefaultSuccessState().trim().toUpperCase() : "ACCEPTED")
                .workflowCode(dto.getWorkflowCode() != null ? dto.getWorkflowCode().trim() : null)
                .active(dto.isActive())
                .build();

        IntegrationChannelEntity saved = channelRepository.save(entity);
        log.info("Created Integration Channel '{}' ({})", saved.getChannelCode(), saved.getChannelName());
        return toDto(saved);
    }

    @Transactional
    public IntegrationChannelDto updateChannel(String channelCode, IntegrationChannelDto dto) {
        IntegrationChannelEntity entity = channelRepository.findByChannelCode(channelCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Integration channel not found: " + channelCode));

        if (dto.getChannelName() != null && !dto.getChannelName().isBlank()) {
            entity.setChannelName(dto.getChannelName().trim());
        }
        if (dto.getDirection() != null) {
            entity.setDirection(dto.getDirection().trim().toUpperCase());
        }
        if (dto.getDomain() != null) {
            entity.setDomain(dto.getDomain().trim().toUpperCase());
        }
        if (dto.getPayloadFormat() != null) {
            entity.setPayloadFormat(dto.getPayloadFormat().trim().toUpperCase());
        }
        if (dto.getMappingRules() != null) {
            entity.setMappingRules(serialize(dto.getMappingRules()));
        }
        if (dto.getValidationRules() != null) {
            entity.setValidationRules(serialize(dto.getValidationRules()));
        }
        if (dto.getHandshakeConfig() != null) {
            entity.setHandshakeConfig(serialize(dto.getHandshakeConfig()));
        }
        if (dto.getDefaultSuccessState() != null) {
            entity.setDefaultSuccessState(dto.getDefaultSuccessState().trim().toUpperCase());
        }
        if (dto.getWorkflowCode() != null) {
            entity.setWorkflowCode(dto.getWorkflowCode().isBlank() ? null : dto.getWorkflowCode().trim());
        }
        entity.setActive(dto.isActive());

        IntegrationChannelEntity updated = channelRepository.save(entity);
        log.info("Updated Integration Channel '{}'", updated.getChannelCode());
        return toDto(updated);
    }

    @Transactional
    public void deleteChannel(String channelCode) {
        IntegrationChannelEntity entity = channelRepository.findByChannelCode(channelCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Integration channel not found: " + channelCode));
        channelRepository.delete(entity);
        log.info("Deleted Integration Channel '{}'", channelCode);
    }

    /**
     * Dry-runs a candidate channel configuration against a sample payload without saving to DB.
     * Crucial for programmatic AI configuration validation.
     */
    public ChannelDryRunResponse dryRun(ChannelDryRunRequest request) {
        List<String> warnings = new ArrayList<>();
        if (request == null || request.getChannelConfig() == null) {
            return ChannelDryRunResponse.builder()
                    .valid(false)
                    .failureReason("Request or channelConfig cannot be null")
                    .build();
        }

        IntegrationChannelDto cfg = request.getChannelConfig();
        String sample = request.getSamplePayload();

        if (sample == null || sample.isBlank()) {
            warnings.add("No samplePayload provided. Only schema syntax verified.");
            return ChannelDryRunResponse.builder()
                    .valid(true)
                    .configurationWarnings(warnings)
                    .build();
        }

        AutoDetectingDataParser.DataFormat format = dataParser.detectFormat(sample);
        if (format == AutoDetectingDataParser.DataFormat.UNKNOWN) {
            return ChannelDryRunResponse.builder()
                    .valid(false)
                    .detectedFormat("UNKNOWN")
                    .failureReason("Sample payload is not valid XML (<...) or JSON ({...)")
                    .build();
        }

        try {
            // 1. Test mapping
            List<FieldMappingRule> mappingRules = cfg.getMappingRules() != null ? cfg.getMappingRules() : List.of();
            Map<String, Object> canonical = mappingEngine.mapToCanonical(sample, mappingRules);

            // 2. Test rules
            List<ValidationRule> validationRules = cfg.getValidationRules() != null ? cfg.getValidationRules() : List.of();
            List<RuleEvaluationResult> ruleResults = ruleDispatcher.evaluateAll(validationRules, canonical);

            // 3. Test state transition
            RuleStateTransitionManager.StateTransitionDecision decision =
                    stateTransitionManager.resolveState(ruleResults, cfg.getDefaultSuccessState());

            return ChannelDryRunResponse.builder()
                    .valid(decision.allPassed())
                    .detectedFormat(format.name())
                    .mappedCanonicalFields(canonical)
                    .ruleEvaluationResults(ruleResults)
                    .resolvedFinalState(decision.finalState())
                    .failureReason(decision.failureReason())
                    .configurationWarnings(warnings)
                    .build();

        } catch (Exception e) {
            log.error("Dry-run execution failed: {}", e.getMessage(), e);
            return ChannelDryRunResponse.builder()
                    .valid(false)
                    .detectedFormat(format.name())
                    .failureReason("Dry-run execution error: " + e.getMessage())
                    .configurationWarnings(warnings)
                    .build();
        }
    }

    /**
     * Self-describing schema definition for AI agents to generate correct channel configs.
     */
    public Map<String, Object> getAiSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("apiVersion", "v1");
        schema.put("supportedDirections", List.of("INGRESS", "EGRESS", "BIDIRECTIONAL"));
        schema.put("supportedDomains", List.of("INBOUND", "OUTBOUND", "INTERNAL_TRANSFER", "INVENTORY", "EQUIPMENT"));
        schema.put("supportedFormats", List.of("AUTO", "XML", "JSON"));
        schema.put("supportedHandshakeModes", List.of(
                Map.of("mode", "SYNC_IMMEDIATE", "description", "Request-response in same connection"),
                Map.of("mode", "ASYNC_CALLBACK", "description", "202 Accepted + correlationKey, external callback signals completion"),
                Map.of("mode", "ASYNC_POLLING", "description", "202 Accepted + correlationKey, engine periodic poll until done"),
                Map.of("mode", "ASYNC_EVENT", "description", "Asynchronous pub/sub on MQTT or EventBus")
        ));
        schema.put("supportedRuleTypes", List.of(
                Map.of("type", "KEY_VALUE_MATCH", "operators", List.of("EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "REGEX", "IS_NOT_EMPTY")),
                Map.of("type", "DATABASE_LOOKUP", "lookupTargets", List.of("SKU_EXISTS", "PALLET_EXISTS", "RESOURCE_EXISTS", "RESOURCE_TAG_EXISTS")),
                Map.of("type", "NUMERIC_COMPARISON", "operators", List.of("BETWEEN_INCLUSIVE", "GREATER_THAN", "LESS_THAN", "EQUALS", "NOT_EQUALS")),
                Map.of("type", "CALCULATED_EXPRESSION", "description", "Spring SpEL math expression e.g. 'actualWeightKg >= (unitWeightKg * quantity * 0.9)'")
        ));
        schema.put("sampleConfigEndpoint", "POST /api/v1/wes/integration/channels");
        schema.put("dryRunValidationEndpoint", "POST /api/v1/wes/integration/channels/validate");
        return schema;
    }

    private IntegrationChannelDto toDto(IntegrationChannelEntity entity) {
        List<FieldMappingRule> mappings = deserializeList(entity.getMappingRules(), FieldMappingRule.class);
        List<ValidationRule> rules = deserializeList(entity.getValidationRules(), ValidationRule.class);
        HandshakeConfig handshake = deserializeObject(entity.getHandshakeConfig(), HandshakeConfig.class);

        return IntegrationChannelDto.builder()
                .id(entity.getId())
                .channelCode(entity.getChannelCode())
                .channelName(entity.getChannelName())
                .direction(entity.getDirection())
                .domain(entity.getDomain())
                .payloadFormat(entity.getPayloadFormat())
                .mappingRules(mappings)
                .validationRules(rules)
                .handshakeConfig(handshake)
                .defaultSuccessState(entity.getDefaultSuccessState())
                .workflowCode(entity.getWorkflowCode())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private <T> List<T> deserializeList(String json, Class<T> clazz) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
        } catch (Exception e) {
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
            return null;
        }
    }

    private String serialize(Object obj) {
        if (obj == null) return "[]";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}
