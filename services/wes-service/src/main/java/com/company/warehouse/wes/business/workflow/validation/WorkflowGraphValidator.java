package com.company.warehouse.wes.business.workflow.validation;

import com.company.warehouse.wes.business.workflow.node.WorkflowNodeRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Validates workflow graph structure and node integrity at save-time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowGraphValidator {

    private final WorkflowNodeRegistry nodeRegistry;

    public List<String> validate(Map<String, Object> canvasGraph) {
        List<String> errors = new ArrayList<>();
        if (canvasGraph == null || canvasGraph.isEmpty()) {
            return errors; // Blank workflow draft is permissible
        }

        List<Map<String, Object>> nodes = extractList(canvasGraph.get("nodes"));
        List<Map<String, Object>> edges = extractList(canvasGraph.get("edges"));

        if (nodes.isEmpty()) {
            return errors;
        }

        Set<String> nodeIds = new HashSet<>();
        int triggerCount = 0;
        int terminatorCount = 0;

        for (Map<String, Object> node : nodes) {
            String id = String.valueOf(node.get("id"));
            String type = String.valueOf(node.get("type"));
            String label = String.valueOf(node.getOrDefault("label", id));

            if (id == null || id.isBlank()) {
                errors.add("Node has missing or empty 'id'");
                continue;
            }

            if (!nodeIds.add(id)) {
                errors.add("Duplicate node id detected: " + id);
            }

            if ("TRIGGER".equalsIgnoreCase(type) || "START".equalsIgnoreCase(type)) {
                triggerCount++;
            }
            if ("TERMINATOR".equalsIgnoreCase(type) || "END".equalsIgnoreCase(type)) {
                terminatorCount++;
            }

            // Verify supported type
            if (!nodeRegistry.supports(type)) {
                errors.add(String.format("Node '%s' has unsupported type '%s'", label, type));
            }

            // Type-specific field validations
            Map<String, Object> cfg = extractMap(node.get("config"));
            if ("RESOURCE_ACTION".equalsIgnoreCase(type)) {
                String res = String.valueOf(cfg.getOrDefault("resourceId", cfg.getOrDefault("resourceCode", ""))).trim();
                String method = String.valueOf(cfg.getOrDefault("methodName", "")).trim();
                if (res.isEmpty() || method.isEmpty()) {
                    errors.add(String.format("RESOURCE_ACTION node '%s' requires both 'resourceId' and 'methodName'", label));
                }
            } else if ("COMPOSED".equalsIgnoreCase(type)) {
                String template = String.valueOf(cfg.getOrDefault("templateCode", "")).trim();
                if (template.isEmpty()) {
                    errors.add(String.format("COMPOSED node '%s' requires 'templateCode'", label));
                }
            }
        }

        // Structural validations
        if (triggerCount == 0) {
            errors.add("Workflow must contain at least one TRIGGER node");
        }
        if (terminatorCount == 0) {
            errors.add("Workflow must contain at least one TERMINATOR node");
        }

        // Edge integrity
        for (Map<String, Object> edge : edges) {
            String source = String.valueOf(edge.get("source"));
            String target = String.valueOf(edge.get("target"));
            if (!nodeIds.contains(source)) {
                errors.add(String.format("Edge references non-existent source node '%s'", source));
            }
            if (!nodeIds.contains(target)) {
                errors.add(String.format("Edge references non-existent target node '%s'", target));
            }
        }

        return errors;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractList(Object obj) {
        if (obj instanceof List) {
            return (List<Map<String, Object>>) obj;
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractMap(Object obj) {
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        return Collections.emptyMap();
    }
}
