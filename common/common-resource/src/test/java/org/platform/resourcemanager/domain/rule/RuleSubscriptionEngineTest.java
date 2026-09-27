package org.platform.resourcemanager.domain.rule;

import org.platform.resourcemanager.domain.model.ResourceId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("RuleSubscriptionEngine & Predicates Tests")
class RuleSubscriptionEngineTest {

    @Test
    @DisplayName("Should trigger regex rule on matching carton barcode")
    void shouldTriggerRegexRule() {
        RuleSubscriptionEngine engine = new RuleSubscriptionEngine();
        ResourceId sorterId = ResourceId.of("T1", "CONVEYOR_DIVERTER");

        AtomicReference<String> triggeredBarcode = new AtomicReference<>();
        RuleSubscription barcodeSub = RuleSubscription.of(
                "SUB_UPS_BARCODE",
                sorterId,
                "lastScannedBarcode",
                RegexRulePredicate.matches("^1Z[0-9A-Z]{16}$"),
                (resId, prop, val) -> triggeredBarcode.set(String.valueOf(val))
        );

        engine.register(barcodeSub);

        // Non-matching barcode
        int fired1 = engine.evaluate(sorterId, "lastScannedBarcode", "INVALID_BC_123");
        assertEquals(0, fired1);
        assertNull(triggeredBarcode.get());

        // Matching UPS barcode: 1Z9999999999999999
        int fired2 = engine.evaluate(sorterId, "lastScannedBarcode", "1Z9999999999999999");
        assertEquals(1, fired2);
        assertEquals("1Z9999999999999999", triggeredBarcode.get());
    }

    @Test
    @DisplayName("Should trigger numeric comparison rule when battery level drops below threshold")
    void shouldTriggerNumericRule() {
        RuleSubscriptionEngine engine = new RuleSubscriptionEngine();
        ResourceId amrId = ResourceId.of("T1", "AMR_002");

        AtomicBoolean lowBatteryTriggered = new AtomicBoolean(false);
        RuleSubscription lowBatterySub = RuleSubscription.of(
                "SUB_LOW_BATTERY",
                amrId,
                "batteryLevel",
                NumericComparisonPredicate.lt(20.0),
                (resId, prop, val) -> lowBatteryTriggered.set(true)
        );

        engine.register(lowBatterySub);

        // Value above threshold: 25.0%
        engine.evaluate(amrId, "batteryLevel", 25.0);
        assertFalse(lowBatteryTriggered.get());

        // Value below threshold: 18.5%
        engine.evaluate(amrId, "batteryLevel", 18.5);
        assertTrue(lowBatteryTriggered.get());
    }
}
