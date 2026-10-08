package com.company.warehouse.wes.business.workflow.node.control;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import com.company.warehouse.wes.business.workflow.node.equipment.ResourceActionHandler;
import com.company.warehouse.wes.data.entity.workflow.WorkflowNodeTemplateEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowNodeTemplateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Handler for COMPOSED workflow nodes built from registered workflow node templates.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ComposedNodeHandler implements WorkflowNodeHandler {

    private final WorkflowNodeTemplateRepository templateRepository;
    private final ResourceActionHandler resourceActionHandler;
    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(String nodeType) {
        return "COMPOSED".equalsIgnoreCase(nodeType)
                || "COMPOSED_STEP".equalsIgnoreCase(nodeType)
                || "TEMPLATE_STEP".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        String templateCode = String.valueOf(cfg.getOrDefault("templateCode", "")).trim();

        if (templateCode.isBlank()) {
            return NodeExecutionResult.failed("COMPOSED node '" + context.nodeLabel() + "' missing required 'templateCode'");
        }

        Optional<WorkflowNodeTemplateEntity> templateOpt = templateRepository.findByTemplateCode(templateCode);
        if (templateOpt.isEmpty()) {
            return NodeExecutionResult.failed("Referenced template code '" + templateCode + "' does not exist");
        }

        WorkflowNodeTemplateEntity template = templateOpt.get();
        log.info("Executing composed node '{}' using template '{}' ({})",
                context.nodeLabel(), templateCode, template.getNodeType());

        Map<String, Object> mergedConfig = new HashMap<>();
        if (template.getConfiguration() != null && !template.getConfiguration().isBlank()) {
            try {
                Map<String, Object> templateCfg = objectMapper.readValue(
                        template.getConfiguration(), new TypeReference<Map<String, Object>>() {});
                mergedConfig.putAll(templateCfg);
            } catch (Exception e) {
                log.warn("Failed to parse configuration for template '{}': {}", templateCode, e.getMessage());
            }
        }
        mergedConfig.putAll(cfg);

        // Normalize resourceId from template
        if (!mergedConfig.containsKey("resourceId") && template.getResourceCode() != null) {
            mergedConfig.put("resourceId", template.getResourceCode());
        }

        WorkflowNodeExecutionContext delegatingContext = WorkflowNodeExecutionContext.builder()
                .nodeId(context.nodeId())
                .nodeType(template.getNodeType() != null ? template.getNodeType() : "RESOURCE_ACTION")
                .nodeLabel(context.nodeLabel())
                .nodeConfig(mergedConfig)
                .context(context.context())
                .instance(context.instance())
                .simulationMode(context.simulationMode())
                .build();

        return resourceActionHandler.execute(delegatingContext);
    }
}
