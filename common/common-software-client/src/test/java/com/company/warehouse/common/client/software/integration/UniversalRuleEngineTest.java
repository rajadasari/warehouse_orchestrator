package com.company.warehouse.common.client.software.integration;

import com.company.warehouse.common.client.software.integration.rules.DatabaseLookupProvider;
import com.company.warehouse.common.client.software.integration.rules.RuleEngineDispatcher;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleStateTransitionManager;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import com.company.warehouse.common.client.software.integration.rules.impl.CalculatedExpressionEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.DatabaseLookupEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.KeyValueMatchEvaluator;
import com.company.warehouse.common.client.software.integration.rules.impl.NumericComparisonEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class UniversalRuleEngineTest {

    private RuleEngineDispatcher dispatcher;
    private RuleStateTransitionManager stateManager;

    @BeforeEach
    void setUp() {
        DatabaseLookupProvider mockProvider = new DatabaseLookupProvider() {
            @Override
            public boolean exists(String lookupTarget, Object key, Map<String, Object> context) {
                if ("SKU_EXISTS".equals(lookupTarget)) {
                    return "SKU-BEV-001".equals(key) || "SKU-VALID-100".equals(key);
                }
                return false;
            }

            @Override
            public Map<String, Object> fetchAttributes(String lookupTarget, Object key) {
                if ("SKU-BEV-001".equals(key)) {
                    return Map.of("unitWeightKg", 20.0);
                }
                return Map.of();
            }
        };

        dispatcher = new RuleEngineDispatcher(List.of(
                new KeyValueMatchEvaluator(),
                new DatabaseLookupEvaluator(Optional.of(mockProvider)),
                new NumericComparisonEvaluator(),
                new CalculatedExpressionEvaluator()
        ));
        stateManager = new RuleStateTransitionManager();
    }

    @Test
    void testAllFiveRulesPassScenario() {
        Map<String, Object> context = new HashMap<>();
        context.put("messageType", "WMTORD");
        context.put("skuCode", "SKU-BEV-001");
        context.put("actualWeightKg", 810.0);
        context.put("quantity", 40.0);

        List<ValidationRule> rules = List.of(
                // Rule 1: Key-Value Match
                ValidationRule.builder()
                        .id("R1")
                        .type("KEY_VALUE_MATCH")
                        .field("messageType")
                        .operator("EQUALS")
                        .expectedValues(List.of("WMTORD"))
                        .onFailureState("REJECTED_INVALID_TYPE")
                        .build(),

                // Rule 2: Database Lookup
                ValidationRule.builder()
                        .id("R2")
                        .type("DATABASE_LOOKUP")
                        .field("skuCode")
                        .lookupTarget("SKU_EXISTS")
                        .onFailureState("QUARANTINE_UNKNOWN_SKU")
                        .build(),

                // Rule 3: Numeric Range
                ValidationRule.builder()
                        .id("R3")
                        .type("NUMERIC_COMPARISON")
                        .field("actualWeightKg")
                        .operator("BETWEEN_INCLUSIVE")
                        .min(50.0)
                        .max(1200.0)
                        .onFailureState("REJECTED_WEIGHT_OUT_OF_BOUNDS")
                        .build(),

                // Rule 4: Calculated Expression (unitWeightKg was enriched by R2!)
                // expected: 20.0 * 40.0 = 800.0. Tolerance: [720.0, 880.0]. actual is 810.0 -> PASS
                ValidationRule.builder()
                        .id("R4")
                        .type("CALCULATED_EXPRESSION")
                        .expression("actualWeightKg >= (unitWeightKg * quantity * 0.9) && actualWeightKg <= (unitWeightKg * quantity * 1.1)")
                        .onFailureState("HELD_WEIGHT_DISCREPANCY")
                        .build()
        );

        List<RuleEvaluationResult> results = dispatcher.evaluateAll(rules, context);
        assertEquals(4, results.size());
        assertTrue(results.stream().allMatch(RuleEvaluationResult::isPassed));

        // Rule 5: State Transition
        RuleStateTransitionManager.StateTransitionDecision decision = stateManager.resolveState(results, "ACCEPTED_IN_TRANSIT");
        assertTrue(decision.allPassed());
        assertEquals("ACCEPTED_IN_TRANSIT", decision.finalState());
        assertNull(decision.failureReason());
    }

    @Test
    void testDatabaseLookupFailureStateTransition() {
        Map<String, Object> context = new HashMap<>();
        context.put("messageType", "WMTORD");
        context.put("skuCode", "SKU-NON-EXISTENT-999");

        List<ValidationRule> rules = List.of(
                ValidationRule.builder()
                        .id("R1")
                        .type("KEY_VALUE_MATCH")
                        .field("messageType")
                        .operator("EQUALS")
                        .expectedValues(List.of("WMTORD"))
                        .build(),
                ValidationRule.builder()
                        .id("R2")
                        .type("DATABASE_LOOKUP")
                        .field("skuCode")
                        .lookupTarget("SKU_EXISTS")
                        .onFailureState("QUARANTINE_UNKNOWN_SKU")
                        .failureMessage("SKU does not exist in master catalog")
                        .build()
        );

        List<RuleEvaluationResult> results = dispatcher.evaluateAll(rules, context);
        assertEquals(2, results.size());
        assertTrue(results.get(0).isPassed());
        assertFalse(results.get(1).isPassed());

        RuleStateTransitionManager.StateTransitionDecision decision = stateManager.resolveState(results, "ACCEPTED");
        assertFalse(decision.allPassed());
        assertEquals("QUARANTINE_UNKNOWN_SKU", decision.finalState());
        assertEquals("R2", decision.failedRuleId());
        assertTrue(decision.failureReason().contains("SKU does not exist"));
    }

    @Test
    void testNumericRangeFailureStateTransition() {
        Map<String, Object> context = new HashMap<>();
        context.put("actualWeightKg", 1850.0); // Above 1500.0 limit!

        List<ValidationRule> rules = List.of(
                ValidationRule.builder()
                        .id("R_WEIGHT")
                        .type("NUMERIC_COMPARISON")
                        .field("actualWeightKg")
                        .operator("BETWEEN_INCLUSIVE")
                        .min(25.0)
                        .max(1500.0)
                        .onFailureState("REJECTED_OVERWEIGHT")
                        .failureMessage("Weight exceeds maximum 1500kg")
                        .build()
        );

        List<RuleEvaluationResult> results = dispatcher.evaluateAll(rules, context);
        assertEquals(1, results.size());
        assertFalse(results.get(0).isPassed());

        RuleStateTransitionManager.StateTransitionDecision decision = stateManager.resolveState(results, "ACCEPTED");
        assertEquals("REJECTED_OVERWEIGHT", decision.finalState());
    }
}
