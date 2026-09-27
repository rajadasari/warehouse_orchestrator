package com.company.warehouse.wes.business.workflow.routing;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.expression.MapAccessor;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Intelligent Edge Router evaluating conditional branches, gateways, and failure fallbacks.
 */
@Slf4j
@Component
public class WorkflowEdgeRouter {

    private final ExpressionParser parser = new SpelExpressionParser();

    /**
     * Resolves the next target node given the current node execution status and shared context.
     */
    public Optional<String> resolveNextNode(
            String currentId,
            String currentNodeType,
            String nodeStatus,
            List<Map<String, Object>> edges,
            Map<String, Object> context) {

        if (edges == null || edges.isEmpty() || currentId == null) {
            return Optional.empty();
        }

        // Find all outgoing edges from current node
        List<Map<String, Object>> outgoingEdges = edges.stream()
                .filter(e -> currentId.equals(String.valueOf(e.get("source"))))
                .toList();

        if (outgoingEdges.isEmpty()) {
            return Optional.empty();
        }

        // 1. Failure routing: If node failed, look for ON_FAILURE edge
        if ("FAILED".equalsIgnoreCase(nodeStatus)) {
            Optional<Map<String, Object>> failureEdge = outgoingEdges.stream()
                    .filter(e -> isFailureEdge(e))
                    .findFirst();
            if (failureEdge.isPresent()) {
                String target = String.valueOf(failureEdge.get().get("target"));
                log.info("Node '{}' failed. Diverting execution to fallback edge target '{}'", currentId, target);
                return Optional.of(target);
            }
            return Optional.empty();
        }

        // Filter out failure edges for normal execution
        List<Map<String, Object>> normalEdges = outgoingEdges.stream()
                .filter(e -> !isFailureEdge(e))
                .toList();

        if (normalEdges.isEmpty()) {
            return Optional.empty();
        }

        // 2. Decision Gateways (GATEWAY_EXCLUSIVE, SWITCH, DECISION)
        boolean isGateway = "GATEWAY_EXCLUSIVE".equalsIgnoreCase(currentNodeType)
                || "SWITCH".equalsIgnoreCase(currentNodeType)
                || "DECISION".equalsIgnoreCase(currentNodeType);

        Map<String, Object> defaultEdge = null;

        for (Map<String, Object> edge : normalEdges) {
            Object rawCond = edge.get("condition");
            if (rawCond == null || String.valueOf(rawCond).isBlank() || "default".equalsIgnoreCase(String.valueOf(rawCond))) {
                if (defaultEdge == null) {
                    defaultEdge = edge;
                }
                continue;
            }

            String conditionStr = String.valueOf(rawCond).trim();
            if (evaluateCondition(conditionStr, context)) {
                String target = String.valueOf(edge.get("target"));
                log.info("Branch condition '{}' matched on node '{}' -> target '{}'", conditionStr, currentId, target);
                return Optional.of(target);
            }
        }

        // Fallback to default edge if conditions did not match
        if (defaultEdge != null) {
            String target = String.valueOf(defaultEdge.get("target"));
            log.info("No explicit conditions matched on node '{}'. Taking default edge -> target '{}'", currentId, target);
            return Optional.of(target);
        }

        // If not an exclusive gateway, return first normal edge
        if (!isGateway && !normalEdges.isEmpty()) {
            return Optional.of(String.valueOf(normalEdges.get(0).get("target")));
        }

        log.warn("Exclusive gateway '{}' had no matching branch conditions and no default edge.", currentId);
        return Optional.empty();
    }

    /**
     * Resolves all downstream target nodes for parallel fork operations.
     */
    public List<String> resolveParallelDownstreamNodes(String currentId, List<Map<String, Object>> edges) {
        if (edges == null || edges.isEmpty() || currentId == null) {
            return Collections.emptyList();
        }
        return edges.stream()
                .filter(e -> currentId.equals(String.valueOf(e.get("source"))) && !isFailureEdge(e))
                .map(e -> String.valueOf(e.get("target")))
                .toList();
    }

    private boolean isFailureEdge(Map<String, Object> edge) {
        Object isFail = edge.get("isFailureEdge");
        if (Boolean.TRUE.equals(isFail) || "true".equalsIgnoreCase(String.valueOf(isFail))) {
            return true;
        }
        Object cond = edge.get("condition");
        if (cond != null && "ON_FAILURE".equalsIgnoreCase(String.valueOf(cond).trim())) {
            return true;
        }
        Object label = edge.get("label");
        return label != null && "ON_FAILURE".equalsIgnoreCase(String.valueOf(label).trim());
    }

    public boolean evaluateCondition(String condition, Map<String, Object> context) {
        if (condition == null || condition.isBlank()) {
            return true;
        }

        String exprStr = condition.trim();
        // Unwrap #{...} if wrapped
        if (exprStr.startsWith("#{") && exprStr.endsWith("}")) {
            exprStr = exprStr.substring(2, exprStr.length() - 1).trim();
        }

        try {
            StandardEvaluationContext evalContext = new StandardEvaluationContext(context != null ? context : Map.of());
            evalContext.addPropertyAccessor(new MapAccessor());
            if (context != null) {
                evalContext.setVariables(context);
                evalContext.setVariable("context", context);
            }
            Boolean result = parser.parseExpression(exprStr).getValue(evalContext, Boolean.class);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.warn("Failed to evaluate edge condition '{}': {}", condition, e.getMessage());
            return false;
        }
    }
}
