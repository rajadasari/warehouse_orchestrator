package org.platform.resourcemanager.domain.telemetry;

/**
 * Data collection and logging strategies for telemetry metrics.
 */
public enum DataCollectionType {
    /**
     * Logs only when the property value changes.
     */
    ON_CHANGE,

    /**
     * Logs at a fixed time interval regardless of value change.
     */
    PERIODIC_POLL,

    /**
     * Logs when numeric drift exceeds a fixed absolute delta threshold.
     */
    DEADBAND_ABSOLUTE,

    /**
     * Logs when value shifts by a relative percentage threshold.
     */
    DEADBAND_PERCENT,

    /**
     * Ingests high-frequency ticks into in-memory ring buffer and persists aggregated summaries.
     */
    SAMPLE_WINDOW,

    /**
     * On-change or deadband logging with guaranteed periodic liveness heartbeat.
     */
    HYBRID_HEARTBEAT
}
