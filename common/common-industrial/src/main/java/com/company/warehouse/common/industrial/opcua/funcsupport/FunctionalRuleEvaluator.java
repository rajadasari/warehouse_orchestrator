package com.company.warehouse.common.industrial.opcua.funcsupport;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagValue;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Stateless evaluator for functional support rules.
 * Reads source tags via {@link OpcUaOperations}, evaluates all conditions (AND logic),
 * and executes write actions when all conditions pass.
 */
@Slf4j
public class FunctionalRuleEvaluator {

    /**
     * Executes a functional rule: reads source tags, evaluates conditions, writes targets.
     */
    public FunctionalRuleResult evaluate(OpcUaOperations io, FunctionalRule rule) {
        long start = System.currentTimeMillis();
        try {
            // 1. Read all unique source tag values
            Map<String, Object> sourceValues = readSourceTags(io, rule.conditions());

            // 2. Evaluate every condition (AND logic)
            List<FunctionalRuleResult.ConditionResult> conditionResults = new ArrayList<>();
            boolean allPassed = true;

            for (TagCondition condition : rule.conditions()) {
                Object actualValue = sourceValues.get(condition.sourceNodeId());
                boolean passed = condition.test(actualValue);
                conditionResults.add(FunctionalRuleResult.ConditionResult.builder()
                        .sourceNodeId(condition.sourceNodeId())
                        .actualValue(actualValue)
                        .operator(condition.operator())
                        .threshold(condition.thresholdValue())
                        .passed(passed)
                        .build());
                if (!passed) {
                    allPassed = false;
                }
            }

            // 3. Execute write actions only when ALL conditions pass
            Map<String, Boolean> writeResults = new LinkedHashMap<>();
            if (allPassed) {
                writeResults = executeWriteActions(io, rule.actions());
            }

            long duration = System.currentTimeMillis() - start;
            log.info("Rule '{}' ({}): conditions={}, allPassed={}, writes={}, duration={}ms",
                    rule.ruleId(), rule.topology(), rule.conditions().size(), allPassed,
                    writeResults.size(), duration);

            return FunctionalRuleResult.success(rule.ruleId(), conditionResults, writeResults, duration);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            log.error("Rule '{}' execution failed: {}", rule.ruleId(), e.getMessage(), e);
            return FunctionalRuleResult.error(rule.ruleId(), e.getMessage(), duration);
        }
    }

    private Map<String, Object> readSourceTags(OpcUaOperations io, List<TagCondition> conditions) {
        Set<String> uniqueNodeIds = new LinkedHashSet<>();
        for (TagCondition c : conditions) {
            uniqueNodeIds.add(c.sourceNodeId());
        }

        Map<String, Object> values = new LinkedHashMap<>();

        if (uniqueNodeIds.size() == 1) {
            String nodeId = uniqueNodeIds.iterator().next();
            OpcUaTagValue tv = io.readSingle(nodeId);
            if (tv != null && tv.isGood()) {
                values.put(nodeId, tv.value());
            }
        } else {
            Map<String, OpcUaTagValue> batch = io.readBatch(new ArrayList<>(uniqueNodeIds));
            for (Map.Entry<String, OpcUaTagValue> entry : batch.entrySet()) {
                if (entry.getValue() != null && entry.getValue().isGood()) {
                    values.put(entry.getKey(), entry.getValue().value());
                }
            }
        }

        return values;
    }

    private Map<String, Boolean> executeWriteActions(OpcUaOperations io, List<TagWriteAction> actions) {
        Map<String, Boolean> results = new LinkedHashMap<>();

        if (actions.size() == 1) {
            TagWriteAction action = actions.get(0);
            boolean ok = io.writeSingle(action.targetNodeId(), action.writeValue());
            results.put(action.targetNodeId(), ok);
        } else {
            Map<String, Object> writeMap = new LinkedHashMap<>();
            for (TagWriteAction action : actions) {
                writeMap.put(action.targetNodeId(), action.writeValue());
            }
            Map<String, Boolean> batchResult = io.writeBatch(writeMap);
            results.putAll(batchResult);
        }

        return results;
    }
}
