package com.company.warehouse.wes.business.network;

import com.company.warehouse.common.industrial.opcua.funcsupport.*;
import com.company.warehouse.wes.data.entity.*;
import com.company.warehouse.wes.data.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * Reactive execution engine for Functional Support rules.
 * Monitors subscribed OPC-UA tags in real time and automatically evaluates/triggers
 * write actions when conditions are satisfied, supporting both CONTINUOUS and ONE_SHOT execution.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FunctionalRuleReactiveService {

    private final FunctionalRuleRepository ruleRepository;
    private final FunctionalRuleConditionRepository conditionRepository;
    private final FunctionalRuleActionRepository actionRepository;
    private final NetworkDeviceChannelRepository channelRepository;
    private final LiveOpcUaChannelDriver liveOpcUaDriver;

    private final FunctionalRuleEvaluator evaluator = new FunctionalRuleEvaluator();
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    // Debounce tracker per ruleId to prevent write storms on continuous matching tags (min 250ms between executions)
    private final Map<UUID, Long> lastExecutionTime = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        liveOpcUaDriver.addListener((channelId, nodeId, value, quality, timestamp) -> {
            executor.submit(() -> handleTagChanged(channelId, nodeId, value, quality));
        });

        // Initialize reactive subscriptions for existing active rules after brief delay
        executor.submit(() -> {
            try {
                Thread.sleep(2000);
                resyncAllActiveChannels();
            } catch (Exception e) {
                log.debug("Initial channel reactive sync deferred: {}", e.getMessage());
            }
        });
    }

    /**
     * Immediately resyncs the active OPC-UA monitored nodes for a channel
     * based on all currently enabled reactive rules.
     */
    public synchronized void syncChannelSubscriptions(UUID channelId) {
        try {
            Optional<NetworkDeviceChannelEntity> chanOpt = channelRepository.findById(channelId);
            if (chanOpt.isEmpty()) return;
            NetworkDeviceChannelEntity channel = chanOpt.get();

            List<FunctionalRuleEntity> reactiveRules = ruleRepository.findByChannelIdAndIsReactiveTrue(channelId);
            Set<String> nodesToMonitor = new HashSet<>();

            for (FunctionalRuleEntity rule : reactiveRules) {
                if (!Boolean.TRUE.equals(rule.getIsEnabled())) continue;
                List<FunctionalRuleConditionEntity> conditions = conditionRepository.findByRuleIdOrderByConditionOrderAsc(rule.getId());
                for (FunctionalRuleConditionEntity cond : conditions) {
                    if (cond.getSourceNodeId() != null && !cond.getSourceNodeId().isBlank()) {
                        nodesToMonitor.add(cond.getSourceNodeId().trim());
                    }
                }
            }

            log.info("Syncing reactive subscription for channel '{}': {} active node(s) monitored",
                    channel.getChannelCode(), nodesToMonitor.size());
            liveOpcUaDriver.updateSubscriptionNodes(channel, nodesToMonitor);

        } catch (Exception e) {
            log.warn("Failed to sync subscriptions for channel {}: {}", channelId, e.getMessage());
        }
    }

    /**
     * Resyncs all channels that have enabled reactive rules.
     */
    public void resyncAllActiveChannels() {
        try {
            List<FunctionalRuleEntity> activeRules = ruleRepository.findByIsReactiveTrueAndIsEnabledTrue();
            Set<UUID> channelIds = new HashSet<>();
            for (FunctionalRuleEntity r : activeRules) {
                channelIds.add(r.getChannelId());
            }
            for (UUID chId : channelIds) {
                syncChannelSubscriptions(chId);
            }
        } catch (Exception e) {
            log.warn("Error during bulk reactive channel resync: {}", e.getMessage());
        }
    }

    /**
     * Evaluates incoming telemetry against registered reactive rules for the channel.
     */
    private void handleTagChanged(String channelIdStr, String nodeId, Object value, String quality) {
        if (channelIdStr == null || nodeId == null) return;
        UUID channelId;
        try {
            channelId = UUID.fromString(channelIdStr);
        } catch (IllegalArgumentException e) {
            return;
        }

        List<FunctionalRuleEntity> reactiveRules = ruleRepository.findByChannelIdAndIsReactiveTrue(channelId);
        if (reactiveRules.isEmpty()) return;

        Optional<NetworkDeviceChannelEntity> chanOpt = channelRepository.findById(channelId);
        if (chanOpt.isEmpty()) return;
        NetworkDeviceChannelEntity channel = chanOpt.get();

        LiveDriverOpcUaAdapter io = new LiveDriverOpcUaAdapter(liveOpcUaDriver, channel);

        for (FunctionalRuleEntity rule : reactiveRules) {
            if (!Boolean.TRUE.equals(rule.getIsEnabled())) continue;

            List<FunctionalRuleConditionEntity> conditions = conditionRepository.findByRuleIdOrderByConditionOrderAsc(rule.getId());
            boolean relevant = conditions.stream().anyMatch(c -> nodeId.equalsIgnoreCase(c.getSourceNodeId().trim()));
            if (!relevant) continue;

            // Debounce continuous executions to 250ms
            long now = System.currentTimeMillis();
            Long lastExec = lastExecutionTime.get(rule.getId());
            if (lastExec != null && (now - lastExec) < 250) {
                continue;
            }

            List<FunctionalRuleActionEntity> actions = actionRepository.findByRuleIdOrderByActionOrderAsc(rule.getId());
            FunctionalRule domainRule = toDomainRule(rule, conditions, actions);

            try {
                FunctionalRuleResult result = evaluator.evaluate(io, domainRule);
                if (result.allConditionsPassed() && result.executed()) {
                    lastExecutionTime.put(rule.getId(), now);
                    handleRuleTriggered(rule, channelId);
                }
            } catch (Exception ex) {
                log.error("Reactive evaluation error for rule '{}': {}", rule.getRuleName(), ex.getMessage());
            }
        }
    }

    @Transactional
    public void handleRuleTriggered(FunctionalRuleEntity rule, UUID channelId) {
        log.info("Reactive rule '{}' ({}) TRIGGERED successfully on channel {}",
                rule.getRuleName(), rule.getExecutionMode(), channelId);

        rule.setLastExecutedAt(Instant.now());
        rule.setLastExecutionStatus("PASSED");

        boolean isOneShot = "ONE_SHOT".equalsIgnoreCase(rule.getExecutionMode());
        if (isOneShot) {
            rule.setIsReactive(false);
            ruleRepository.save(rule);
            log.info("Rule '{}' is ONE_SHOT — auto-deactivated reactive trigger", rule.getRuleName());
            executor.submit(() -> syncChannelSubscriptions(channelId));
        } else {
            ruleRepository.save(rule);
        }
    }

    private FunctionalRule toDomainRule(
            FunctionalRuleEntity entity,
            List<FunctionalRuleConditionEntity> conditions,
            List<FunctionalRuleActionEntity> actions
    ) {
        List<TagCondition> condList = new ArrayList<>();
        for (FunctionalRuleConditionEntity ce : conditions) {
            condList.add(TagCondition.builder()
                    .sourceNodeId(ce.getSourceNodeId())
                    .operator(ComparisonOperator.valueOf(ce.getOperator()))
                    .thresholdValue(ce.getThresholdValue())
                    .build());
        }

        List<TagWriteAction> actList = new ArrayList<>();
        for (FunctionalRuleActionEntity ae : actions) {
            actList.add(TagWriteAction.builder()
                    .targetNodeId(ae.getTargetNodeId())
                    .writeValue(ae.getWriteValue())
                    .build());
        }

        return FunctionalRule.builder()
                .ruleId(entity.getId().toString())
                .ruleName(entity.getRuleName())
                .topology(RuleTopology.valueOf(entity.getTopology()))
                .conditions(condList)
                .actions(actList)
                .build();
    }
}
