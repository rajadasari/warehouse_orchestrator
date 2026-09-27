package org.platform.resourcemanager.application.port;

import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.telemetry.TelemetryDataPoint;

import java.time.Instant;
import java.util.List;

/**
 * Hexagonal SPI Port for Telemetry Historian persistence and range querying.
 */
public interface TelemetryHistorianPort {

    void record(TelemetryDataPoint dataPoint);

    void recordBatch(List<TelemetryDataPoint> dataPoints);

    List<TelemetryDataPoint> queryRange(ResourceId resourceId, String metricName, Instant from, Instant to, int limit);
}
