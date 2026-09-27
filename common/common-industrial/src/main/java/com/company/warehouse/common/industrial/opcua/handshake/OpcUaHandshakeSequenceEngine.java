package com.company.warehouse.common.industrial.opcua.handshake;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagValue;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Industrial Automation Sequence Engine executing multi-step PLC handshakes over OPC UA.
 */
@Slf4j
public class OpcUaHandshakeSequenceEngine {

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("#\\{([a-zA-Z0-9_.]+)\\}");

    public HandshakeExecutionResult executeSequence(
            OpcUaOperations io,
            List<HandshakeStep> steps,
            Map<String, Object> context) {

        long startTime = System.currentTimeMillis();
        Map<String, Object> currentContext = (context != null) ? new HashMap<>(context) : new HashMap<>();
        Map<String, Object> outputData = new LinkedHashMap<>();

        if (steps == null || steps.isEmpty()) {
            return HandshakeExecutionResult.success(outputData, 0);
        }

        List<HandshakeStep> sortedSteps = new ArrayList<>(steps);
        sortedSteps.sort(Comparator.comparingInt(HandshakeStep::stepOrder));

        for (HandshakeStep step : sortedSteps) {
            try {
                boolean stepPassed = executeStep(io, step, currentContext, outputData);
                if (!stepPassed) {
                    long duration = System.currentTimeMillis() - startTime;
                    return HandshakeExecutionResult.fault(
                            "TIMEOUT_FAULT",
                            String.format("Step %d (%s) timed out or failed on tag '%s'",
                                    step.stepOrder(), step.stepType(), step.tagKey()),
                            duration
                    );
                }
            } catch (Exception e) {
                long duration = System.currentTimeMillis() - startTime;
                log.error("Error executing handshake step {}: {}", step.stepOrder(), e.getMessage());
                return HandshakeExecutionResult.fault("STEP_ERROR", e.getMessage(), duration);
            }
        }

        long totalDuration = System.currentTimeMillis() - startTime;
        return HandshakeExecutionResult.success(outputData, totalDuration);
    }

    private boolean executeStep(
            OpcUaOperations io,
            HandshakeStep step,
            Map<String, Object> context,
            Map<String, Object> outputData) throws InterruptedException {

        long timeout = step.timeoutMs() != null ? step.timeoutMs() : 5000L;
        long deadline = System.currentTimeMillis() + timeout;

        switch (step.stepType()) {
            case AWAIT_TRIGGER -> {
                // Poll until tag matches expected value
                while (System.currentTimeMillis() < deadline) {
                    OpcUaTagValue tv = io.readSingle(step.tagKey());
                    if (tv != null && tv.isGood() && Objects.equals(tv.value(), step.expectedValue())) {
                        log.debug("Trigger matched on tag '{}': {}", step.tagKey(), tv.value());
                        return true;
                    }
                    Thread.sleep(50);
                }
                return false;
            }

            case READ_SINGLE -> {
                OpcUaTagValue tv = io.readSingle(step.tagKey());
                if (tv != null && tv.isGood()) {
                    String outKey = step.outputVariable() != null ? step.outputVariable() : step.tagKey();
                    context.put(outKey, tv.value());
                    outputData.put(outKey, tv.value());
                    return true;
                }
                return false;
            }

            case READ_GROUP -> {
                Map<String, OpcUaTagValue> groupValues = io.readGroup(step.groupKey());
                for (Map.Entry<String, OpcUaTagValue> entry : groupValues.entrySet()) {
                    if (entry.getValue().isGood()) {
                        context.put(entry.getKey(), entry.getValue().value());
                        outputData.put(entry.getKey(), entry.getValue().value());
                    }
                }
                return true;
            }

            case WRITE_SINGLE -> {
                Object valueToWrite = resolveDynamicValue(step.writeValue(), context);
                return io.writeSingle(step.tagKey(), valueToWrite);
            }

            case WRITE_GROUP -> {
                Map<String, Object> resolvedValues = new LinkedHashMap<>();
                if (step.groupWriteValues() != null) {
                    for (Map.Entry<String, Object> entry : step.groupWriteValues().entrySet()) {
                        resolvedValues.put(entry.getKey(), resolveDynamicValue(entry.getValue(), context));
                    }
                }
                Map<String, Boolean> results = io.writeGroup(step.groupKey(), resolvedValues);
                return results.values().stream().allMatch(Boolean::booleanValue);
            }

            case AWAIT_CONFIRMATION -> {
                while (System.currentTimeMillis() < deadline) {
                    OpcUaTagValue tv = io.readSingle(step.tagKey());
                    if (tv != null && tv.isGood() && Objects.equals(tv.value(), step.expectedValue())) {
                        log.debug("Confirmation received on tag '{}': {}", step.tagKey(), tv.value());
                        return true;
                    }
                    Thread.sleep(50);
                }
                return false;
            }

            case RESET -> {
                Object resetVal = step.writeValue() != null ? step.writeValue() : false;
                return io.writeSingle(step.tagKey(), resetVal);
            }

            default -> {
                log.warn("Unsupported step type: {}", step.stepType());
                return true;
            }
        }
    }

    private Object resolveDynamicValue(Object writeValue, Map<String, Object> context) {
        if (writeValue == null) return null;
        if (!(writeValue instanceof String str)) {
            return writeValue;
        }

        Matcher matcher = PLACEHOLDER_PATTERN.matcher(str);
        if (matcher.matches()) {
            String key = matcher.group(1);
            if (context.containsKey(key)) {
                return context.get(key);
            }
        }

        // Interpolate embedded #{...} patterns
        StringBuilder sb = new StringBuilder();
        int lastEnd = 0;
        matcher.reset();
        while (matcher.find()) {
            sb.append(str, lastEnd, matcher.start());
            String key = matcher.group(1);
            sb.append(context.getOrDefault(key, matcher.group(0)));
            lastEnd = matcher.end();
        }
        sb.append(str.substring(lastEnd));
        return sb.toString();
    }
}
