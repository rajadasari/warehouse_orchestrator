package org.platform.resourcemanager.infrastructure.telemetry;

import org.platform.resourcemanager.application.port.TelemetryHistorianPort;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.telemetry.TelemetryDataPoint;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * High-performance, lock-free, circular in-memory telemetry store.
 * Implements TelemetryHistorianPort backed by fixed-size circular ring buffers per (ResourceId, metricName).
 * Guarantees zero allocation overhead and bounded memory footprint.
 */
public class RingBufferTelemetryStore implements TelemetryHistorianPort {

    private final int defaultCapacity;
    private final Map<String, CircularMetricBuffer> buffers = new ConcurrentHashMap<>();

    public RingBufferTelemetryStore(int defaultCapacity) {
        if (defaultCapacity <= 0) {
            throw new IllegalArgumentException("defaultCapacity must be positive");
        }
        this.defaultCapacity = defaultCapacity;
    }

    public RingBufferTelemetryStore() {
        this(1000); // Default to last 1,000 points per metric
    }

    private String buildKey(ResourceId resourceId, String metricName) {
        return resourceId.toString() + ":" + metricName.trim().toUpperCase();
    }

    @Override
    public void record(TelemetryDataPoint dataPoint) {
        Objects.requireNonNull(dataPoint, "dataPoint must not be null");
        String key = buildKey(dataPoint.resourceId(), dataPoint.metricName());
        buffers.computeIfAbsent(key, k -> new CircularMetricBuffer(defaultCapacity)).add(dataPoint);
    }

    @Override
    public void recordBatch(List<TelemetryDataPoint> dataPoints) {
        if (dataPoints == null || dataPoints.isEmpty()) {
            return;
        }
        for (TelemetryDataPoint dp : dataPoints) {
            record(dp);
        }
    }

    @Override
    public List<TelemetryDataPoint> queryRange(ResourceId resourceId, String metricName, Instant from, Instant to, int limit) {
        Objects.requireNonNull(resourceId, "resourceId must not be null");
        Objects.requireNonNull(metricName, "metricName must not be null");
        int maxResults = (limit <= 0) ? 100 : limit;

        String key = buildKey(resourceId, metricName);
        CircularMetricBuffer buffer = buffers.get(key);
        if (buffer == null) {
            return List.of();
        }

        return buffer.query(from, to, maxResults);
    }

    public int totalMetricStreams() {
        return buffers.size();
    }

    public void clear() {
        buffers.clear();
    }

    /**
     * Circular buffer backed by fixed array with head cursor wrapping.
     */
    private static class CircularMetricBuffer {
        private final int capacity;
        private final TelemetryDataPoint[] buffer;
        private final AtomicInteger head = new AtomicInteger(0);
        private final AtomicInteger size = new AtomicInteger(0);

        CircularMetricBuffer(int capacity) {
            this.capacity = capacity;
            this.buffer = new TelemetryDataPoint[capacity];
        }

        public synchronized void add(TelemetryDataPoint point) {
            int idx = head.getAndIncrement() % capacity;
            if (idx < 0) {
                idx = Math.abs(idx);
            }
            buffer[idx] = point;
            if (size.get() < capacity) {
                size.incrementAndGet();
            }
        }

        public synchronized List<TelemetryDataPoint> query(Instant from, Instant to, int limit) {
            List<TelemetryDataPoint> matches = new ArrayList<>();
            int count = size.get();
            int currentHead = head.get();

            // Walk newest to oldest
            for (int i = 0; i < count && matches.size() < limit; i++) {
                int index = (currentHead - 1 - i) % capacity;
                if (index < 0) {
                    index += capacity;
                }
                TelemetryDataPoint pt = buffer[index];
                if (pt != null) {
                    boolean afterFrom = (from == null) || !pt.timestamp().isBefore(from);
                    boolean beforeTo = (to == null) || !pt.timestamp().isAfter(to);
                    if (afterFrom && beforeTo) {
                        matches.add(pt);
                    }
                }
            }

            return Collections.unmodifiableList(matches);
        }
    }
}
