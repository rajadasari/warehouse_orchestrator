package com.company.warehouse.wcs.business.service;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.handshake.HandshakeExecutionResult;
import com.company.warehouse.common.industrial.opcua.handshake.HandshakeStep;
import com.company.warehouse.common.industrial.opcua.handshake.HandshakeStepType;
import com.company.warehouse.common.industrial.opcua.handshake.OpcUaHandshakeSequenceEngine;
import com.company.warehouse.wcs.api.dto.OpcUaStationTemplateDto;
import com.company.warehouse.wcs.api.dto.StationNodeGenerateRequest;
import com.company.warehouse.wcs.api.dto.StationNodeGenerateResponse;
import com.company.warehouse.wcs.data.entity.OpcUaStationTemplateEntity;
import com.company.warehouse.wcs.data.repository.OpcUaStationTemplateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service managing parameterized Station Sequence Templates and composing Workflow Nodes for AI and UI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WcsWorkflowNodeComposerService {

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("#\\{([a-zA-Z0-9_.]+)\\}");

    private final OpcUaStationTemplateRepository templateRepository;
    private final WcsOpcUaRuntimeManager runtimeManager;
    private final ObjectMapper objectMapper;

    private final OpcUaHandshakeSequenceEngine sequenceEngine = new OpcUaHandshakeSequenceEngine();

    // =========================================================================
    // 1. TEMPLATE MANAGEMENT
    // =========================================================================

    @Transactional(readOnly = true)
    public List<OpcUaStationTemplateDto> getAllTemplates() {
        return templateRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OpcUaStationTemplateDto> getTemplateByCode(String code) {
        return templateRepository.findByTemplateCode(code).map(this::toDto);
    }

    @Transactional
    public OpcUaStationTemplateDto saveTemplate(OpcUaStationTemplateDto dto) {
        OpcUaStationTemplateEntity entity = templateRepository.findByTemplateCode(dto.templateCode())
                .orElseGet(() -> OpcUaStationTemplateEntity.builder().templateCode(dto.templateCode()).build());

        entity.setName(dto.name());
        entity.setDescription(dto.description());
        entity.setRelativeTagsJson(serializeList(dto.relativeTags()));
        entity.setSequenceStepsJson(serializeList(dto.sequenceSteps()));
        entity.setOutputVariable(dto.outputVariable() != null ? dto.outputVariable() : "stationResult");

        OpcUaStationTemplateEntity saved = templateRepository.save(entity);
        return toDto(saved);
    }

    // =========================================================================
    // 2. WORKFLOW NODE COMPOSITION (AI / UI GENERATION)
    // =========================================================================

    @Transactional(readOnly = true)
    public StationNodeGenerateResponse generateStationNode(StationNodeGenerateRequest req) {
        if (req == null || req.templateCode() == null || req.stationCode() == null) {
            throw new IllegalArgumentException("templateCode and stationCode are required");
        }

        OpcUaStationTemplateEntity template = templateRepository.findByTemplateCode(req.templateCode())
                .orElseThrow(() -> new IllegalArgumentException("Station template not found: " + req.templateCode()));

        List<Map<String, Object>> steps = deserializeList(template.getSequenceStepsJson());

        // Discover required input context variables (e.g. #{targetLane})
        Set<String> requiredInputs = new LinkedHashSet<>();
        List<String> outputVariables = new ArrayList<>();

        for (Map<String, Object> step : steps) {
            Object writeVal = step.get("writeValue");
            if (writeVal instanceof String str) {
                Matcher m = PLACEHOLDER_PATTERN.matcher(str);
                while (m.find()) {
                    requiredInputs.add(m.group(1));
                }
            }
            if (step.containsKey("outputVariable") && step.get("outputVariable") != null) {
                outputVariables.add(String.valueOf(step.get("outputVariable")));
            }
        }

        String nodeId = "node-" + sanitize(req.stationCode());
        String label = (req.stationLabel() != null && !req.stationLabel().isBlank())
                ? req.stationLabel()
                : template.getName() + " (" + req.stationCode() + ")";

        String tagPrefix = req.tagPrefix() != null ? req.tagPrefix() : "";
        String clientCode = req.clientCode() != null ? req.clientCode() : "WCS_VIRTUAL_SERVER";
        String outVar = req.outputVariable() != null ? req.outputVariable() : template.getOutputVariable();

        Map<String, Object> nodeMap = new LinkedHashMap<>();
        nodeMap.put("id", nodeId);
        nodeMap.put("type", "OPCUA_STATION_ACTION");
        nodeMap.put("label", label);

        Map<String, Object> configMap = new LinkedHashMap<>();
        configMap.put("templateCode", template.getTemplateCode());
        configMap.put("stationCode", req.stationCode());
        configMap.put("tagPrefix", tagPrefix);
        configMap.put("clientCode", clientCode);
        configMap.put("outputVariable", outVar);
        configMap.put("requiredInputs", new ArrayList<>(requiredInputs));
        configMap.put("outputVariables", outputVariables);

        nodeMap.put("config", configMap);

        return StationNodeGenerateResponse.builder()
                .templateCode(template.getTemplateCode())
                .stationCode(req.stationCode())
                .node(nodeMap)
                .requiredInputs(new ArrayList<>(requiredInputs))
                .outputVariables(outputVariables)
                .build();
    }

    // =========================================================================
    // 3. RUNTIME STATION SEQUENCE EXECUTION
    // =========================================================================

    public HandshakeExecutionResult executeStationSequence(
            String templateCode,
            String stationCode,
            String tagPrefix,
            String clientCode,
            Map<String, Object> context) {

        OpcUaStationTemplateEntity template = templateRepository.findByTemplateCode(templateCode)
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));

        List<Map<String, Object>> stepMaps = deserializeList(template.getSequenceStepsJson());
        List<HandshakeStep> instantiatedSteps = new ArrayList<>();

        String prefix = tagPrefix != null ? tagPrefix : "";
        String ioCode = (clientCode != null && !clientCode.isBlank()) ? clientCode : "WCS_VIRTUAL_SERVER";

        for (Map<String, Object> sm : stepMaps) {
            int order = sm.containsKey("stepOrder") ? ((Number) sm.get("stepOrder")).intValue() : 1;
            String stTypeStr = String.valueOf(sm.getOrDefault("stepType", "AWAIT_TRIGGER"));
            HandshakeStepType stType = HandshakeStepType.valueOf(stTypeStr.toUpperCase());

            String relTag = sm.containsKey("tagKey") ? String.valueOf(sm.get("tagKey")) : null;
            String resolvedTag = (relTag != null && !relTag.isBlank()) ? (prefix + relTag) : null;

            String groupKey = sm.containsKey("groupKey") ? String.valueOf(sm.get("groupKey")) : null;
            Object expectedVal = sm.get("expectedValue");
            Object writeVal = sm.get("writeValue");
            String outVar = sm.containsKey("outputVariable") ? String.valueOf(sm.get("outputVariable")) : null;
            Long timeout = sm.containsKey("timeoutMs") ? ((Number) sm.get("timeoutMs")).longValue() : 5000L;

            instantiatedSteps.add(HandshakeStep.builder()
                    .stepOrder(order)
                    .stepType(stType)
                    .tagKey(resolvedTag)
                    .groupKey(groupKey)
                    .expectedValue(expectedVal)
                    .writeValue(writeVal)
                    .outputVariable(outVar)
                    .timeoutMs(timeout)
                    .build());
        }

        OpcUaOperations io = runtimeManager.getIo(ioCode);
        return sequenceEngine.executeSequence(io, instantiatedSteps, context);
    }

    // =========================================================================
    // HELPERS & SERIALIZATION
    // =========================================================================

    private String sanitize(String str) {
        return str.toLowerCase().replaceAll("[^a-z0-9]+", "-");
    }

    private String serializeList(List<Map<String, Object>> list) {
        if (list == null) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<Map<String, Object>> deserializeList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private OpcUaStationTemplateDto toDto(OpcUaStationTemplateEntity e) {
        return OpcUaStationTemplateDto.builder()
                .id(e.getId())
                .templateCode(e.getTemplateCode())
                .name(e.getName())
                .description(e.getDescription())
                .relativeTags(deserializeList(e.getRelativeTagsJson()))
                .sequenceSteps(deserializeList(e.getSequenceStepsJson()))
                .outputVariable(e.getOutputVariable())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
