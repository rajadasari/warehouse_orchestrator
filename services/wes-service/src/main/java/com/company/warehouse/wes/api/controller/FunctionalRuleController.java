package com.company.warehouse.wes.api.controller;

import com.company.warehouse.common.industrial.opcua.funcsupport.*;
import com.company.warehouse.wes.business.network.LiveDriverOpcUaAdapter;
import com.company.warehouse.wes.business.network.LiveOpcUaChannelDriver;
import com.company.warehouse.wes.data.entity.*;
import com.company.warehouse.wes.data.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * REST API for Functional Support rules: configurable conditional tag read/write operations
 * with math comparison operators and string matching across 4 topologies.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/network")
@RequiredArgsConstructor
@Tag(name = "Functional Support", description = "Conditional tag rule engine with math/string operators")
public class FunctionalRuleController {

    private final FunctionalRuleRepository ruleRepository;
    private final FunctionalRuleConditionRepository conditionRepository;
    private final FunctionalRuleActionRepository actionRepository;
    private final NetworkDeviceChannelRepository channelRepository;
    private final LiveOpcUaChannelDriver liveOpcUaDriver;
    private final com.company.warehouse.wes.business.network.FunctionalRuleReactiveService reactiveService;

    @GetMapping("/channels/{channelId}/rules")
    @Operation(summary = "List all functional rules for a channel")
    public ResponseEntity<List<Map<String, Object>>> getRules(@PathVariable String channelId) {
        Optional<NetworkDeviceChannelEntity> chanOpt = resolveChannel(channelId);
        if (chanOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<FunctionalRuleEntity> rules = ruleRepository.findByChannelIdOrderByCreatedAtDesc(chanOpt.get().getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (FunctionalRuleEntity rule : rules) {
            result.add(ruleToMap(rule));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/channels/{channelId}/rules/{ruleId}")
    @Operation(summary = "Get a single functional rule with conditions and actions")
    public ResponseEntity<Map<String, Object>> getRule(
            @PathVariable String channelId,
            @PathVariable String ruleId
    ) {
        Optional<FunctionalRuleEntity> ruleOpt = ruleRepository.findById(UUID.fromString(ruleId));
        if (ruleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ruleToMap(ruleOpt.get()));
    }

    @PostMapping("/channels/{channelId}/rules")
    @Transactional
    @Operation(summary = "Create a new functional support rule with conditions and actions")
    public ResponseEntity<Map<String, Object>> createRule(
            @PathVariable String channelId,
            @RequestBody Map<String, Object> req
    ) {
        Optional<NetworkDeviceChannelEntity> chanOpt = resolveChannel(channelId);
        if (chanOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UUID chId = chanOpt.get().getId();
        FunctionalRuleEntity rule = FunctionalRuleEntity.builder()
                .channelId(chId)
                .ruleName(String.valueOf(req.getOrDefault("ruleName", "New Rule")))
                .topology(String.valueOf(req.getOrDefault("topology", "SINGLE_READ_SINGLE_WRITE")))
                .isReactive(Boolean.parseBoolean(String.valueOf(req.getOrDefault("isReactive", "false"))))
                .executionMode(String.valueOf(req.getOrDefault("executionMode", "CONTINUOUS")))
                .isEnabled(Boolean.parseBoolean(String.valueOf(req.getOrDefault("isEnabled", "true"))))
                .description(req.containsKey("description") ? String.valueOf(req.get("description")) : null)
                .build();

        rule = ruleRepository.save(rule);
        UUID ruleId = rule.getId();

        saveConditions(ruleId, req);
        saveActions(ruleId, req);

        if (Boolean.TRUE.equals(rule.getIsReactive())) {
            reactiveService.syncChannelSubscriptions(chId);
        }

        log.info("Created functional rule '{}' ({}, mode={}) on channel '{}'",
                rule.getRuleName(), rule.getTopology(), rule.getExecutionMode(), chanOpt.get().getChannelCode());

        return ResponseEntity.ok(ruleToMap(rule));
    }

    @PutMapping("/channels/{channelId}/rules/{ruleId}")
    @Transactional
    @Operation(summary = "Update an existing functional support rule")
    public ResponseEntity<Map<String, Object>> updateRule(
            @PathVariable String channelId,
            @PathVariable String ruleId,
            @RequestBody Map<String, Object> req
    ) {
        Optional<FunctionalRuleEntity> ruleOpt = ruleRepository.findById(UUID.fromString(ruleId));
        if (ruleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FunctionalRuleEntity rule = ruleOpt.get();
        if (req.containsKey("ruleName")) rule.setRuleName(String.valueOf(req.get("ruleName")));
        if (req.containsKey("topology")) rule.setTopology(String.valueOf(req.get("topology")));
        if (req.containsKey("isReactive")) rule.setIsReactive(Boolean.parseBoolean(String.valueOf(req.get("isReactive"))));
        if (req.containsKey("executionMode")) rule.setExecutionMode(String.valueOf(req.get("executionMode")));
        if (req.containsKey("isEnabled")) rule.setIsEnabled(Boolean.parseBoolean(String.valueOf(req.get("isEnabled"))));
        if (req.containsKey("description")) rule.setDescription(String.valueOf(req.get("description")));

        rule = ruleRepository.save(rule);

        if (req.containsKey("conditions")) {
            conditionRepository.deleteByRuleId(rule.getId());
            saveConditions(rule.getId(), req);
        }
        if (req.containsKey("actions")) {
            actionRepository.deleteByRuleId(rule.getId());
            saveActions(rule.getId(), req);
        }

        reactiveService.syncChannelSubscriptions(rule.getChannelId());

        return ResponseEntity.ok(ruleToMap(rule));
    }

    @DeleteMapping("/channels/{channelId}/rules/{ruleId}")
    @Transactional
    @Operation(summary = "Delete a functional support rule and its conditions/actions")
    public ResponseEntity<Void> deleteRule(
            @PathVariable String channelId,
            @PathVariable String ruleId
    ) {
        UUID uid = UUID.fromString(ruleId);
        Optional<FunctionalRuleEntity> ruleOpt = ruleRepository.findById(uid);
        UUID chId = ruleOpt.map(FunctionalRuleEntity::getChannelId).orElse(null);

        conditionRepository.deleteByRuleId(uid);
        actionRepository.deleteByRuleId(uid);
        ruleRepository.deleteById(uid);

        if (chId != null) {
            reactiveService.syncChannelSubscriptions(chId);
        }

        log.info("Deleted functional rule '{}'", ruleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/channels/{channelId}/rules/{ruleId}/execute")
    @Operation(summary = "Manually execute a functional rule (read → evaluate → write)")
    public ResponseEntity<Map<String, Object>> executeRule(
            @PathVariable String channelId,
            @PathVariable String ruleId
    ) {
        Optional<NetworkDeviceChannelEntity> chanOpt = resolveChannel(channelId);
        if (chanOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<FunctionalRuleEntity> ruleOpt = ruleRepository.findById(UUID.fromString(ruleId));
        if (ruleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FunctionalRuleEntity ruleEntity = ruleOpt.get();
        FunctionalRule domainRule = toDomainRule(ruleEntity);
        FunctionalRuleEvaluator evaluator = new FunctionalRuleEvaluator();

        // Build an OpcUaOperations adapter from LiveOpcUaChannelDriver
        NetworkDeviceChannelEntity channel = chanOpt.get();
        LiveDriverOpcUaAdapter adapter = new LiveDriverOpcUaAdapter(liveOpcUaDriver, channel);

        FunctionalRuleResult result = evaluator.evaluate(adapter, domainRule);

        ruleEntity.setLastExecutedAt(Instant.now());
        ruleEntity.setLastExecutionStatus(result.allConditionsPassed() ? "PASSED" : "CONDITIONS_FAILED");
        if (result.errorMessage() != null) {
            ruleEntity.setLastExecutionStatus("ERROR");
        }
        ruleRepository.save(ruleEntity);

        return ResponseEntity.ok(resultToMap(result));
    }

    @PutMapping("/channels/{channelId}/rules/{ruleId}/reactive")
    @Operation(summary = "Toggle reactive (auto-trigger) mode for a functional rule")
    public ResponseEntity<Map<String, Object>> toggleReactive(
            @PathVariable String channelId,
            @PathVariable String ruleId,
            @RequestBody Map<String, Object> req
    ) {
        Optional<FunctionalRuleEntity> ruleOpt = ruleRepository.findById(UUID.fromString(ruleId));
        if (ruleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FunctionalRuleEntity rule = ruleOpt.get();
        boolean reactive = Boolean.parseBoolean(String.valueOf(req.getOrDefault("isReactive", "false")));
        rule.setIsReactive(reactive);
        rule = ruleRepository.save(rule);

        reactiveService.syncChannelSubscriptions(rule.getChannelId());

        return ResponseEntity.ok(ruleToMap(rule));
    }

    // --- Private helpers ---

    @SuppressWarnings("unchecked")
    private void saveConditions(UUID ruleId, Map<String, Object> req) {
        Object raw = req.get("conditions");
        if (!(raw instanceof List<?> list)) return;

        int order = 0;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;
            Map<String, Object> condMap = (Map<String, Object>) map;
            FunctionalRuleConditionEntity cond = FunctionalRuleConditionEntity.builder()
                    .ruleId(ruleId)
                    .conditionOrder(order++)
                    .sourceNodeId(String.valueOf(condMap.get("sourceNodeId")))
                    .operator(String.valueOf(condMap.get("operator")))
                    .thresholdValue(String.valueOf(condMap.get("thresholdValue")))
                    .thresholdDataType(String.valueOf(condMap.getOrDefault("thresholdDataType", "STRING")))
                    .build();
            conditionRepository.save(cond);
        }
    }

    @SuppressWarnings("unchecked")
    private void saveActions(UUID ruleId, Map<String, Object> req) {
        Object raw = req.get("actions");
        if (!(raw instanceof List<?> list)) return;

        int order = 0;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;
            Map<String, Object> actMap = (Map<String, Object>) map;
            FunctionalRuleActionEntity action = FunctionalRuleActionEntity.builder()
                    .ruleId(ruleId)
                    .actionOrder(order++)
                    .targetNodeId(String.valueOf(actMap.get("targetNodeId")))
                    .writeValue(String.valueOf(actMap.get("writeValue")))
                    .writeDataType(String.valueOf(actMap.getOrDefault("writeDataType", "STRING")))
                    .build();
            actionRepository.save(action);
        }
    }

    private FunctionalRule toDomainRule(FunctionalRuleEntity entity) {
        List<FunctionalRuleConditionEntity> condEntities =
                conditionRepository.findByRuleIdOrderByConditionOrderAsc(entity.getId());
        List<FunctionalRuleActionEntity> actEntities =
                actionRepository.findByRuleIdOrderByActionOrderAsc(entity.getId());

        List<TagCondition> conditions = condEntities.stream().map(c ->
                TagCondition.builder()
                        .sourceNodeId(c.getSourceNodeId())
                        .operator(ComparisonOperator.valueOf(c.getOperator()))
                        .thresholdValue(coerceThreshold(c.getThresholdValue(), c.getThresholdDataType()))
                        .build()
        ).toList();

        List<TagWriteAction> actions = actEntities.stream().map(a ->
                TagWriteAction.builder()
                        .targetNodeId(a.getTargetNodeId())
                        .writeValue(coerceThreshold(a.getWriteValue(), a.getWriteDataType()))
                        .build()
        ).toList();

        return FunctionalRule.builder()
                .ruleId(entity.getId().toString())
                .ruleName(entity.getRuleName())
                .topology(RuleTopology.valueOf(entity.getTopology()))
                .conditions(conditions)
                .actions(actions)
                .isReactive(Boolean.TRUE.equals(entity.getIsReactive()))
                .build();
    }

    private Object coerceThreshold(String value, String dataType) {
        if (value == null) return null;
        return switch (dataType != null ? dataType.toUpperCase() : "STRING") {
            case "BOOLEAN" -> Boolean.parseBoolean(value);
            case "INTEGER", "INT32", "INT16" -> {
                try { yield Integer.parseInt(value); }
                catch (NumberFormatException e) { yield value; }
            }
            case "LONG", "INT64" -> {
                try { yield Long.parseLong(value); }
                catch (NumberFormatException e) { yield value; }
            }
            case "DOUBLE", "FLOAT" -> {
                try { yield Double.parseDouble(value); }
                catch (NumberFormatException e) { yield value; }
            }
            default -> value;
        };
    }

    private Map<String, Object> ruleToMap(FunctionalRuleEntity rule) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rule.getId().toString());
        m.put("channelId", rule.getChannelId().toString());
        m.put("ruleName", rule.getRuleName());
        m.put("topology", rule.getTopology());
        m.put("isReactive", Boolean.TRUE.equals(rule.getIsReactive()));
        m.put("executionMode", rule.getExecutionMode() != null ? rule.getExecutionMode() : "CONTINUOUS");
        m.put("isEnabled", Boolean.TRUE.equals(rule.getIsEnabled()));
        m.put("description", rule.getDescription());
        m.put("lastExecutedAt", rule.getLastExecutedAt() != null ? rule.getLastExecutedAt().toString() : null);
        m.put("lastExecutionStatus", rule.getLastExecutionStatus());
        m.put("createdAt", rule.getCreatedAt() != null ? rule.getCreatedAt().toString() : null);

        List<FunctionalRuleConditionEntity> conds =
                conditionRepository.findByRuleIdOrderByConditionOrderAsc(rule.getId());
        List<Map<String, Object>> condList = new ArrayList<>();
        for (FunctionalRuleConditionEntity c : conds) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("id", c.getId().toString());
            cm.put("sourceNodeId", c.getSourceNodeId());
            cm.put("operator", c.getOperator());
            cm.put("thresholdValue", c.getThresholdValue());
            cm.put("thresholdDataType", c.getThresholdDataType());
            condList.add(cm);
        }
        m.put("conditions", condList);

        List<FunctionalRuleActionEntity> acts =
                actionRepository.findByRuleIdOrderByActionOrderAsc(rule.getId());
        List<Map<String, Object>> actList = new ArrayList<>();
        for (FunctionalRuleActionEntity a : acts) {
            Map<String, Object> am = new LinkedHashMap<>();
            am.put("id", a.getId().toString());
            am.put("targetNodeId", a.getTargetNodeId());
            am.put("writeValue", a.getWriteValue());
            am.put("writeDataType", a.getWriteDataType());
            actList.add(am);
        }
        m.put("actions", actList);

        return m;
    }

    private Map<String, Object> resultToMap(FunctionalRuleResult result) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ruleId", result.ruleId());
        m.put("allConditionsPassed", result.allConditionsPassed());
        m.put("executed", result.executed());
        m.put("durationMs", result.durationMs());
        m.put("errorMessage", result.errorMessage());

        List<Map<String, Object>> condResults = new ArrayList<>();
        for (FunctionalRuleResult.ConditionResult cr : result.conditionResults()) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("sourceNodeId", cr.sourceNodeId());
            cm.put("actualValue", cr.actualValue());
            cm.put("operator", cr.operator().name());
            cm.put("threshold", cr.threshold());
            cm.put("passed", cr.passed());
            condResults.add(cm);
        }
        m.put("conditionResults", condResults);
        m.put("writeResults", result.writeResults());

        return m;
    }

    private Optional<NetworkDeviceChannelEntity> resolveChannel(String channelId) {
        try {
            UUID uuid = UUID.fromString(channelId);
            return channelRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            return channelRepository.findByChannelCode(channelId);
        }
    }
}
