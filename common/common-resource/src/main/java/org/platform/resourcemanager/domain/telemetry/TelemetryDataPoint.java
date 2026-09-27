package org.platform.resourcemanager.domain.telemetry;

import org.platform.resourcemanager.domain.model.ResourceId;

import java.io.Serializable;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable time-series data point record.
 */
public record TelemetryDataPoint(
        ResourceId resourceId,
        String metricName,
        double value,
        DataCollectionType collectionType,
        Instant timestamp,
        Map<String, String> tags
) implements Serializable {

    public TelemetryDataPoint {
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        Objects.requireNonNull(metricName, "metricName must not be null");
        metricName = metricName.trim();
        collectionType = (collectionType == null) ? DataCollectionType.ON_CHANGE : collectionType;
        timestamp = (timestamp == null) ? Instant.now() : timestamp;
        tags = (tags == null) ? Map.of() : Map.copyOf(tags);
    }

    public static TelemetryDataPoint of(ResourceId resourceId, String metricName, double value, DataCollectionType collectionType) {
        return new TelemetryDataPoint(resourceId, metricName, value, collectionType, Instant.now(), Map.of());
    }

    public static TelemetryDataPoint of(ResourceId resourceId, String metricName, double value, DataCollectionType collectionType, Map<String, String> tags) {
        return new TelemetryDataPoint(resourceId, metricName, value, collectionType, Instant.now(), tags);
    }
}
