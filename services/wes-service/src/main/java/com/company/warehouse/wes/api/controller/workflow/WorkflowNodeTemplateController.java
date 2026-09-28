package com.company.warehouse.wes.api.controller.workflow;

import com.company.warehouse.wes.api.dto.workflow.WorkflowNodeTemplateDto;
import com.company.warehouse.wes.business.workflow.WorkflowNodeTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/workflow-node-templates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkflowNodeTemplateController {

    private final WorkflowNodeTemplateService nodeTemplateService;

    @GetMapping
    public ResponseEntity<List<WorkflowNodeTemplateDto>> getAllTemplates(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String nodeType) {
        log.debug("GET /api/v1/wes/workflow-node-templates: category='{}', nodeType='{}'", category, nodeType);
        return ResponseEntity.ok(nodeTemplateService.getAllTemplates(category, nodeType));
    }

    @GetMapping("/{templateCode}")
    public ResponseEntity<WorkflowNodeTemplateDto> getByTemplateCode(@PathVariable String templateCode) {
        log.debug("GET /api/v1/wes/workflow-node-templates/{}", templateCode);
        return ResponseEntity.ok(nodeTemplateService.getByTemplateCode(templateCode));
    }

    @PostMapping
    public ResponseEntity<WorkflowNodeTemplateDto> createTemplate(@Valid @RequestBody WorkflowNodeTemplateDto dto) {
        log.info("POST /api/v1/wes/workflow-node-templates: Creating template code='{}', name='{}'",
                dto.getTemplateCode(), dto.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(nodeTemplateService.createTemplate(dto));
    }

    @PutMapping("/{templateCode}")
    public ResponseEntity<WorkflowNodeTemplateDto> updateTemplate(
            @PathVariable String templateCode,
            @RequestBody WorkflowNodeTemplateDto dto) {
        log.info("PUT /api/v1/wes/workflow-node-templates/{}: Updating template", templateCode);
        return ResponseEntity.ok(nodeTemplateService.updateTemplate(templateCode, dto));
    }

    @DeleteMapping("/{templateCode}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable String templateCode) {
        log.info("DELETE /api/v1/wes/workflow-node-templates/{}", templateCode);
        nodeTemplateService.deleteTemplate(templateCode);
        return ResponseEntity.noContent().build();
    }
}
