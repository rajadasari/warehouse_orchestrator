package org.platform.resourcemanager.domain.telemetry;

import java.io.Serializable;
import java.util.Objects;

/**
 * Declarative configuration defining telemetry logging rules for a property.
 */
public record PropertyTelemetryPolicy(
        String propertyName,
        boolean enabled,
        DataCollectionType collectionType,
        int intervalMs,
        double deadbandThreshold,
        int heartbeatSeconds
) implements Serializable {

    public PropertyTelemetryPolicy {
        Objects.requireNonNull(propertyName, "propertyName must not be null");
        propertyName = propertyName.trim();
        collectionType = (collectionType == null) ? DataCollectionType.ON_CHANGE : collectionType;
        intervalMs = Math.max(0, intervalMs);
        deadbandThreshold = Math.max(0.0, deadbandThreshold);
        heartbeatSeconds = Math.max(0, heartbeatSeconds);
    }

    public static PropertyTelemetryPolicy onChange(String propertyName) {
        return new PropertyTelemetryPolicy(propertyName, true, DataCollectionType.ON_CHANGE, 0, 0.0, 0);
    }

    public static PropertyTelemetryPolicy periodic(String propertyName, int intervalMs) {
        return new PropertyTelemetryPolicy(propertyName, true, DataCollectionType.PERIODIC_POLL, intervalMs, 0.0, 0);
    }

    public static PropertyTelemetryPolicy deadbandAbsolute(String propertyName, double delta) {
        return new PropertyTelemetryPolicy(propertyName, true, DataCollectionType.DEADBAND_ABSOLUTE, 0, delta, 0);
    }

    public static PropertyTelemetryPolicy deadbandPercent(String propertyName, double percent) {
        return new PropertyTelemetryPolicy(propertyName, true, DataCollectionType.DEADBAND_PERCENT, 0, percent, 0);
    }

    public static PropertyTelemetryPolicy sampleWindow(String propertyName, int windowDurationMs) {
        return new PropertyTelemetryPolicy(propertyName, true, DataCollectionType.SAMPLE_WINDOW, windowDurationMs, 0.0, 0);
    }

    public static PropertyTelemetryPolicy hybridHeartbeat(String propertyName, double deadbandDelta, int heartbeatSeconds) {
        return new PropertyTelemetryPolicy(propertyName, true, DataCollectionType.HYBRID_HEARTBEAT, 0, deadbandDelta, heartbeatSeconds);
    }
}
