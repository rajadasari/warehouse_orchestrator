package com.company.warehouse.common.client.software.integration.rules.impl;

import com.company.warehouse.common.client.software.integration.rules.DatabaseLookupProvider;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluator;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * Rule 2: Database Existence & Parameter Lookup Evaluator.
 * Checks whether an SKU, Location, or Resource Tag exists in the system database.
 */
@Slf4j
@Component
public class DatabaseLookupEvaluator implements RuleEvaluator {

    private final DatabaseLookupProvider lookupProvider;

    @Autowired
    public DatabaseLookupEvaluator(Optional<DatabaseLookupProvider> lookupProviderOpt) {
        this.lookupProvider = lookupProviderOpt.orElse(null);
    }

    @Override
    public boolean supports(String ruleType) {
        return "DATABASE_LOOKUP".equalsIgnoreCase(ruleType) || "DB_EXISTS".equalsIgnoreCase(ruleType);
    }

    @Override
    public RuleEvaluationResult evaluate(ValidationRule rule, Map<String, Object> context) {
        String field = rule.getField();
        Object key = (context != null && field != null) ? context.get(field) : null;
        String lookupTarget = rule.getLookupTarget() != null ? rule.getLookupTarget().trim().toUpperCase() : "RECORD_EXISTS";

        if (key == null || String.valueOf(key).isBlank()) {
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    "Lookup field '" + field + "' is null or empty",
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_MISSING_LOOKUP_KEY",
                    null
            );
        }

        if (lookupProvider == null) {
            log.warn("DatabaseLookupEvaluator: No DatabaseLookupProvider bean registered. Bypassing check for target '{}'", lookupTarget);
            return RuleEvaluationResult.success(rule.getId(), rule.getType(), key);
        }

        boolean exists = lookupProvider.exists(lookupTarget, key, context);

        if (exists) {
            // Enrich context with any returned attributes (e.g. unit weight, capacity)
            Map<String, Object> attrs = lookupProvider.fetchAttributes(lookupTarget, key);
            if (attrs != null && !attrs.isEmpty() && context != null) {
                context.putAll(attrs);
            }
            return RuleEvaluationResult.success(rule.getId(), rule.getType(), key);
        } else {
            String msg = rule.getFailureMessage();
            if (msg == null) {
                msg = "Lookup failed: '" + key + "' does not exist for target '" + lookupTarget + "'";
            }
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    msg,
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "QUARANTINE_MASTER_DATA_MISSING",
                    key
            );
        }
    }
}
