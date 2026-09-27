package org.platform.resourcemanager.domain.telemetry;

import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.infrastructure.telemetry.RingBufferTelemetryStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TelemetryFilterEngine & RingBufferTelemetryStore Tests")
class TelemetryHistorianTest {

    @Test
    @DisplayName("Should evaluate deadband threshold and discard noise")
    void shouldFilterDeadbandNoise() {
        TelemetryFilterEngine engine = new TelemetryFilterEngine();
        ResourceId craneId = ResourceId.of("T1", "ASRS_CRANE_01");

        PropertyTelemetryPolicy policy = PropertyTelemetryPolicy.deadbandAbsolute("bearingTempC", 0.5);
        Instant now = Instant.now();

        // 1. First point is always accepted (baseline)
        Optional<TelemetryDataPoint> pt1 = engine.evaluate(craneId, policy, 45.0, now);
        assertTrue(pt1.isPresent());
        assertEquals(45.0, pt1.get().value());

        // 2. Minor fluctuation: 45.2 (+0.2 < 0.5) -> dropped
        Optional<TelemetryDataPoint> pt2 = engine.evaluate(craneId, policy, 45.2, now.plusSeconds(1));
        assertTrue(pt2.isEmpty());

        // 3. Significant surge: 45.6 (+0.6 >= 0.5) -> accepted
        Optional<TelemetryDataPoint> pt3 = engine.evaluate(craneId, policy, 45.6, now.plusSeconds(2));
        assertTrue(pt3.isPresent());
        assertEquals(45.6, pt3.get().value());
        assertEquals(DataCollectionType.DEADBAND_ABSOLUTE, pt3.get().collectionType());
    }

    @Test
    @DisplayName("Should buffer telemetry points in RingBuffer and support range queries")
    void shouldStoreAndQueryRingBuffer() {
        RingBufferTelemetryStore store = new RingBufferTelemetryStore(5);
        ResourceId craneId = ResourceId.of("T1", "ASRS_CRANE_02");

        Instant baseTime = Instant.now();

        // Record 7 points into a buffer of capacity 5 (should overwrite oldest 2)
        for (int i = 1; i <= 7; i++) {
            store.record(new TelemetryDataPoint(
                    craneId,
                    "vibrationRms",
                    i * 1.5,
                    DataCollectionType.SAMPLE_WINDOW,
                    baseTime.plusSeconds(i),
                    java.util.Map.of()
            ));
        }

        List<TelemetryDataPoint> results = store.queryRange(craneId, "vibrationRms", null, null, 10);
        assertEquals(5, results.size());
        // Newest should be index 7 (value 10.5)
        assertEquals(10.5, results.get(0).value());
    }
}
