package org.platform.resourcemanager.domain.telemetry;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filter and evaluation engine executing PropertyTelemetryPolicies.
 * Determines if a new property value should be logged based on ON_CHANGE, PERIODIC_POLL,
 * DEADBAND_ABSOLUTE, DEADBAND_PERCENT, SAMPLE_WINDOW, or HYBRID_HEARTBEAT.
 */
public class TelemetryFilterEngine {

    private record LastLoggedState(
            Object value,
            Instant timestamp
    ) {}

    // Key: resourceId:propertyName -> LastLoggedState
    private final Map<String, LastLoggedState> stateMap = new ConcurrentHashMap<>();

    private String buildKey(ResourceId resourceId, String propertyName) {
        return resourceId.toString() + ":" + propertyName.trim();
    }

    /**
     * Tests an incoming property update against the configured policy.
     *
     * @param resourceId the resource aggregate identity
     * @param policy the policy configured for the property
     * @param incomingValue the newly observed value
     * @param now current timestamp
     * @return Optional containing the TelemetryDataPoint if the point should be recorded, or empty if dropped
     */
    public Optional<TelemetryDataPoint> evaluate(
            ResourceId resourceId,
            PropertyTelemetryPolicy policy,
            Object incomingValue,
            Instant now
    ) {
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        Objects.requireNonNull(policy, "policy must not be null");
        if (!policy.enabled() || incomingValue == null) {
            return Optional.empty();
        }

        String key = buildKey(resourceId, policy.propertyName());
        LastLoggedState last = stateMap.get(key);
        Instant currentTime = (now == null) ? Instant.now() : now;

        // First time seeing this metric: always record
        if (last == null) {
            stateMap.put(key, new LastLoggedState(incomingValue, currentTime));
            double numVal = extractNumeric(incomingValue);
            return Optional.of(new TelemetryDataPoint(resourceId, policy.propertyName(), numVal, policy.collectionType(), currentTime, Map.of()));
        }

        boolean shouldLog = false;
        DataCollectionType effectiveType = policy.collectionType();

        switch (policy.collectionType()) {
            case ON_CHANGE -> {
                if (!Objects.equals(incomingValue, last.value())) {
                    shouldLog = true;
                }
            }
            case PERIODIC_POLL, SAMPLE_WINDOW -> {
                long elapsedMs = currentTime.toEpochMilli() - last.timestamp().toEpochMilli();
                if (elapsedMs >= policy.intervalMs()) {
                    shouldLog = true;
                }
            }
            case DEADBAND_ABSOLUTE -> {
                double curr = extractNumeric(incomingValue);
                double prev = extractNumeric(last.value());
                if (Math.abs(curr - prev) >= policy.deadbandThreshold()) {
                    shouldLog = true;
                }
            }
            case DEADBAND_PERCENT -> {
                double curr = extractNumeric(incomingValue);
                double prev = extractNumeric(last.value());
                if (prev != 0.0) {
                    double percentDelta = Math.abs((curr - prev) / prev) * 100.0;
                    if (percentDelta >= policy.deadbandThreshold()) {
                        shouldLog = true;
                    }
                } else if (curr != 0.0) {
                    shouldLog = true;
                }
            }
            case HYBRID_HEARTBEAT -> {
                double curr = extractNumeric(incomingValue);
                double prev = extractNumeric(last.value());
                long elapsedSeconds = (currentTime.toEpochMilli() - last.timestamp().toEpochMilli()) / 1000;
                
                if (Math.abs(curr - prev) >= policy.deadbandThreshold()) {
                    shouldLog = true;
                    effectiveType = DataCollectionType.DEADBAND_ABSOLUTE;
                } else if (elapsedSeconds >= policy.heartbeatSeconds()) {
                    shouldLog = true;
                    effectiveType = DataCollectionType.HYBRID_HEARTBEAT;
                }
            }
        }

        if (shouldLog) {
            stateMap.put(key, new LastLoggedState(incomingValue, currentTime));
            double numVal = extractNumeric(incomingValue);
            return Optional.of(new TelemetryDataPoint(resourceId, policy.propertyName(), numVal, effectiveType, currentTime, Map.of()));
        }

        return Optional.empty();
    }

    private double extractNumeric(Object val) {
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        if (val instanceof Boolean b) {
            return b ? 1.0 : 0.0;
        }
        return 0.0;
    }

    public void clear() {
        stateMap.clear();
    }
}
