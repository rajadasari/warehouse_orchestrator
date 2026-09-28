package com.company.warehouse.wes.business.workflow;

import com.company.warehouse.wes.api.dto.workflow.WorkflowNodeTemplateDto;
import com.company.warehouse.wes.data.entity.workflow.WorkflowNodeTemplateEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowNodeTemplateRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowNodeTemplateService {

    private final WorkflowNodeTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<WorkflowNodeTemplateDto> getAllTemplates(String category, String nodeType) {
        List<WorkflowNodeTemplateEntity> entities;
        if (category != null && !category.isBlank()) {
            entities = templateRepository.findByCategoryIgnoreCase(category.trim());
        } else if (nodeType != null && !nodeType.isBlank()) {
            entities = templateRepository.findByNodeTypeIgnoreCase(nodeType.trim());
        } else {
            entities = templateRepository.findAll();
        }
        return entities.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public WorkflowNodeTemplateDto getByTemplateCode(String templateCode) {
        return templateRepository.findByTemplateCode(templateCode)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Workflow node template not found: " + templateCode));
    }

    @Transactional
    public WorkflowNodeTemplateDto createTemplate(WorkflowNodeTemplateDto dto) {
        if (templateRepository.existsByTemplateCode(dto.getTemplateCode())) {
            throw new IllegalArgumentException("Workflow node template with code '" + dto.getTemplateCode() + "' already exists");
        }

        WorkflowNodeTemplateEntity entity = WorkflowNodeTemplateEntity.builder()
                .templateCode(dto.getTemplateCode())
                .name(dto.getName())
                .description(dto.getDescription())
                .nodeType(dto.getNodeType())
                .category(dto.getCategory() != null ? dto.getCategory() : "CUSTOM")
                .icon(dto.getIcon() != null ? dto.getIcon() : "Cpu")
                .color(dto.getColor() != null ? dto.getColor() : "emerald")
                .isSystem(dto.isSystem())
                .resourceCode(dto.getResourceCode())
                .targetMethod(dto.getTargetMethod())
                .configuration(toJsonString(dto.getConfiguration()))
                .inputSchema(toJsonString(dto.getInputSchema()))
                .outputSchema(toJsonString(dto.getOutputSchema()))
                .createdBy(dto.getCreatedBy() != null ? dto.getCreatedBy() : "OPERATOR")
                .build();

        WorkflowNodeTemplateEntity saved = templateRepository.save(entity);
        log.info("Created workflow node template: code='{}', name='{}', type='{}'",
                saved.getTemplateCode(), saved.getName(), saved.getNodeType());
        return toDto(saved);
    }

    @Transactional
    public WorkflowNodeTemplateDto updateTemplate(String templateCode, WorkflowNodeTemplateDto dto) {
        WorkflowNodeTemplateEntity entity = templateRepository.findByTemplateCode(templateCode)
                .orElseThrow(() -> new IllegalArgumentException("Workflow node template not found: " + templateCode));

        if (entity.isSystem()) {
            throw new IllegalStateException("System built-in node template '" + templateCode + "' cannot be overwritten");
        }

        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setNodeType(dto.getNodeType());
        if (dto.getCategory() != null) entity.setCategory(dto.getCategory());
        if (dto.getIcon() != null) entity.setIcon(dto.getIcon());
        if (dto.getColor() != null) entity.setColor(dto.getColor());
        entity.setResourceCode(dto.getResourceCode());
        entity.setTargetMethod(dto.getTargetMethod());
        if (dto.getConfiguration() != null) entity.setConfiguration(toJsonString(dto.getConfiguration()));
        if (dto.getInputSchema() != null) entity.setInputSchema(toJsonString(dto.getInputSchema()));
        if (dto.getOutputSchema() != null) entity.setOutputSchema(toJsonString(dto.getOutputSchema()));

        WorkflowNodeTemplateEntity updated = templateRepository.save(entity);
        log.info("Updated workflow node template: code='{}'", updated.getTemplateCode());
        return toDto(updated);
    }

    @Transactional
    public void deleteTemplate(String templateCode) {
        WorkflowNodeTemplateEntity entity = templateRepository.findByTemplateCode(templateCode)
                .orElseThrow(() -> new IllegalArgumentException("Workflow node template not found: " + templateCode));

        if (entity.isSystem()) {
            throw new IllegalStateException("System built-in node template '" + templateCode + "' cannot be deleted");
        }

        templateRepository.deleteByTemplateCode(templateCode);
        log.info("Deleted workflow node template: code='{}'", templateCode);
    }

    // =========================================================================
    // MAPPERS
    // =========================================================================

    public WorkflowNodeTemplateDto toDto(WorkflowNodeTemplateEntity entity) {
        return WorkflowNodeTemplateDto.builder()
                .id(entity.getId())
                .templateCode(entity.getTemplateCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .nodeType(entity.getNodeType())
                .category(entity.getCategory())
                .icon(entity.getIcon())
                .color(entity.getColor())
                .isSystem(entity.isSystem())
                .resourceCode(entity.getResourceCode())
                .targetMethod(entity.getTargetMethod())
                .configuration(parseJsonMap(entity.getConfiguration()))
                .inputSchema(parseJsonMap(entity.getInputSchema()))
                .outputSchema(parseJsonMap(entity.getOutputSchema()))
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String toJsonString(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize node template JSON: {}", e.getMessage());
            return "{}";
        }
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize node template JSON: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
