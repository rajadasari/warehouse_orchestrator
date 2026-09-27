package com.company.warehouse.common.client.software.integration.rules.impl;

import com.company.warehouse.common.client.software.integration.rules.RuleEvaluationResult;
import com.company.warehouse.common.client.software.integration.rules.RuleEvaluator;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Rule 4: Calculated Expression & Formula Evaluator.
 * Evaluates dynamic mathematical expressions and tolerance windows using Spring Expression Language (SpEL).
 * Example: "actualWeightKg >= (unitWeightKg * quantity * 0.90) && actualWeightKg <= (unitWeightKg * quantity * 1.10)"
 */
@Slf4j
@Component
public class CalculatedExpressionEvaluator implements RuleEvaluator {

    private final ExpressionParser expressionParser = new SpelExpressionParser();

    @Override
    public boolean supports(String ruleType) {
        return "CALCULATED_EXPRESSION".equalsIgnoreCase(ruleType) || "EXPRESSION".equalsIgnoreCase(ruleType) || "FORMULA".equalsIgnoreCase(ruleType);
    }

    @Override
    public RuleEvaluationResult evaluate(ValidationRule rule, Map<String, Object> context) {
        String exprStr = rule.getExpression();
        if (exprStr == null || exprStr.isBlank()) {
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    "Calculated expression string is missing",
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_EMPTY_EXPRESSION",
                    null
            );
        }

        try {
            StandardEvaluationContext evalContext = new StandardEvaluationContext(context != null ? context : Map.of());
            evalContext.addPropertyAccessor(new org.springframework.context.expression.MapAccessor());
            if (context != null) {
                context.forEach(evalContext::setVariable);
            }

            Expression expression = expressionParser.parseExpression(exprStr.trim());
            Boolean outcome = expression.getValue(evalContext, Boolean.class);

            boolean passed = Boolean.TRUE.equals(outcome);

            if (passed) {
                return RuleEvaluationResult.success(rule.getId(), rule.getType(), true);
            } else {
                String failMsg = rule.getFailureMessage();
                if (failMsg == null) {
                    failMsg = "Expression '" + exprStr + "' evaluated to false";
                }
                return RuleEvaluationResult.failure(
                        rule.getId(),
                        rule.getType(),
                        rule.isCritical(),
                        failMsg,
                        rule.getOnFailureState() != null ? rule.getOnFailureState() : "HELD_EXPRESSION_DISCREPANCY",
                        false
                );
            }
        } catch (Exception e) {
            log.error("Failed to evaluate expression '{}': {}", exprStr, e.getMessage());
            return RuleEvaluationResult.failure(
                    rule.getId(),
                    rule.getType(),
                    rule.isCritical(),
                    "Expression error: " + e.getMessage(),
                    rule.getOnFailureState() != null ? rule.getOnFailureState() : "REJECTED_EXPRESSION_ERROR",
                    e.getMessage()
            );
        }
    }
}
