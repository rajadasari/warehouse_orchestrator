package com.company.warehouse.wes.api.dto.integration;

import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * Detailed output from dry-running a candidate configuration.
 * Returns mapped fields, rule evaluation results, and resolved state to the AI caller.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelDryRunResponse implements Serializable {

    private boolean valid;
    private String detectedFormat;
    private Map<String, Object> mappedCanonicalFields;
    private List<RuleEvaluationResult> ruleEvaluationResults;
    private String resolvedFinalState;
    private String failureReason;
    private List<String> configurationWarnings;
}
