package com.company.warehouse.wes.business.workflow;

import com.company.warehouse.wes.api.dto.workflow.WorkflowNodeTemplateDto;
import com.company.warehouse.wes.data.entity.workflow.WorkflowNodeTemplateEntity;
import com.company.warehouse.wes.data.repository.workflow.WorkflowNodeTemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowNodeTemplateServiceTest {

    @Mock
    private WorkflowNodeTemplateRepository templateRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private WorkflowNodeTemplateService templateService;

    @BeforeEach
    void setUp() {
        templateService = new WorkflowNodeTemplateService(templateRepository, objectMapper);
    }

    @Test
    void createTemplate_success() {
        when(templateRepository.existsByTemplateCode("CUSTOM_SCAN")).thenReturn(false);

        WorkflowNodeTemplateEntity savedEntity = WorkflowNodeTemplateEntity.builder()
                .id(UUID.randomUUID())
                .templateCode("CUSTOM_SCAN")
                .name("Custom Scan & Verify")
                .nodeType("RESOURCE_ACTION")
                .category("EQUIPMENT")
                .resourceCode("SCANNER_01")
                .targetMethod("TRIGGER_SCAN")
                .configuration("{\"timeoutMs\": 3000}")
                .createdBy("OPERATOR")
                .build();

        when(templateRepository.save(any(WorkflowNodeTemplateEntity.class))).thenReturn(savedEntity);

        WorkflowNodeTemplateDto request = WorkflowNodeTemplateDto.builder()
                .templateCode("CUSTOM_SCAN")
                .name("Custom Scan & Verify")
                .nodeType("RESOURCE_ACTION")
                .category("EQUIPMENT")
                .resourceCode("SCANNER_01")
                .targetMethod("TRIGGER_SCAN")
                .configuration(Map.of("timeoutMs", 3000))
                .build();

        WorkflowNodeTemplateDto result = templateService.createTemplate(request);

        assertThat(result.getTemplateCode()).isEqualTo("CUSTOM_SCAN");
        assertThat(result.getResourceCode()).isEqualTo("SCANNER_01");
        assertThat(result.getConfiguration()).containsEntry("timeoutMs", 3000);
        verify(templateRepository).save(any(WorkflowNodeTemplateEntity.class));
    }

    @Test
    void createTemplate_duplicateCode_throwsException() {
        when(templateRepository.existsByTemplateCode("DUPLICATE_CODE")).thenReturn(true);

        WorkflowNodeTemplateDto request = WorkflowNodeTemplateDto.builder()
                .templateCode("DUPLICATE_CODE")
                .name("Duplicate Node")
                .nodeType("RESOURCE_ACTION")
                .build();

        assertThatThrownBy(() -> templateService.createTemplate(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deleteTemplate_systemTemplate_throwsException() {
        WorkflowNodeTemplateEntity systemNode = WorkflowNodeTemplateEntity.builder()
                .id(UUID.randomUUID())
                .templateCode("SYS_NODE")
                .isSystem(true)
                .build();

        when(templateRepository.findByTemplateCode("SYS_NODE")).thenReturn(Optional.of(systemNode));

        assertThatThrownBy(() -> templateService.deleteTemplate("SYS_NODE"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("System built-in node template");
    }

    @Test
    void deleteTemplate_userTemplate_success() {
        WorkflowNodeTemplateEntity userNode = WorkflowNodeTemplateEntity.builder()
                .id(UUID.randomUUID())
                .templateCode("USER_NODE")
                .isSystem(false)
                .build();

        when(templateRepository.findByTemplateCode("USER_NODE")).thenReturn(Optional.of(userNode));

        templateService.deleteTemplate("USER_NODE");

        verify(templateRepository).deleteByTemplateCode("USER_NODE");
    }
}
