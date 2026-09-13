package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.resource.ResourceTemplateDto;
import com.company.warehouse.wes.business.resource.ResourceManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/resource-templates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResourceTemplateController {

    private final ResourceManager resourceManager;

    @GetMapping
    public ResponseEntity<List<ResourceTemplateDto>> getAllTemplates(
            @RequestParam(required = false) String category) {
        log.debug("GET /api/v1/wes/resource-templates: category='{}'", category);
        return ResponseEntity.ok(resourceManager.getAllTemplates(category));
    }

    @GetMapping("/{templateCode}")
    public ResponseEntity<ResourceTemplateDto> getTemplateByCode(@PathVariable String templateCode) {
        log.debug("GET /api/v1/wes/resource-templates/{}", templateCode);
        return ResponseEntity.ok(resourceManager.getTemplateByCode(templateCode));
    }

    @PostMapping
    public ResponseEntity<ResourceTemplateDto> createTemplate(@Valid @RequestBody ResourceTemplateDto dto) {
        log.info("POST /api/v1/wes/resource-templates: Creating template code='{}', name='{}'",
                dto.getTemplateCode(), dto.getTemplateName());
        ResourceTemplateDto created = resourceManager.createTemplate(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{templateCode}")
    public ResponseEntity<ResourceTemplateDto> updateTemplate(
            @PathVariable String templateCode,
            @RequestBody ResourceTemplateDto dto) {
        log.info("PUT /api/v1/wes/resource-templates/{}: Updating template", templateCode);
        return ResponseEntity.ok(resourceManager.updateTemplate(templateCode, dto));
    }

    @DeleteMapping("/{templateCode}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable String templateCode) {
        log.info("DELETE /api/v1/wes/resource-templates/{}", templateCode);
        resourceManager.deleteTemplate(templateCode);
        return ResponseEntity.noContent().build();
    }
}
