package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.resource.ResourceTemplateDto;
import com.company.warehouse.wes.business.resource.ResourceManager;
import com.company.warehouse.wes.business.resource.composer.EntityComposerMapper;
import com.company.warehouse.wes.business.resource.composer.archetype.EntityArchetypeRegistry;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.business.resource.composer.validation.EntityTemplateValidator;
import com.company.warehouse.wes.business.resource.composer.validation.EntityValidationResult;
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
    private final EntityArchetypeRegistry archetypeRegistry;
    private final EntityTemplateValidator templateValidator;
    private final EntityComposerMapper composerMapper;

    @GetMapping("/archetypes")
    public ResponseEntity<List<ResourceTemplateDto>> getArchetypes(@RequestParam(required = false) String category) {
        log.debug("GET /api/v1/wes/resource-templates/archetypes: category='{}'", category);
        List<ResourceTemplateDto> list = archetypeRegistry.getByCategory(category)
                .stream()
                .map(a -> composerMapper.toDto(a.toTemplate()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/from-archetype/{archetypeCode}")
    public ResponseEntity<ResourceTemplateDto> createTemplateFromArchetype(
            @PathVariable String archetypeCode,
            @RequestParam String newTemplateCode,
            @RequestParam(required = false) String newTemplateName,
            @RequestParam(required = false) String description) {
        log.info("POST /api/v1/wes/resource-templates/from-archetype/{}: Creating template '{}'",
                archetypeCode, newTemplateCode);
        var archetype = archetypeRegistry.getArchetype(archetypeCode)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Archetype not found: " + archetypeCode));

        ComposedEntityTemplate template = archetype.toTemplate();
        ResourceTemplateDto dto = composerMapper.toDto(template);
        dto.setId(null);
        dto.setTemplateCode(newTemplateCode.trim().toUpperCase());
        dto.setTemplateName(newTemplateName != null && !newTemplateName.isBlank() ? newTemplateName : newTemplateCode);
        if (description != null && !description.isBlank()) {
            dto.setDescription(description);
        }
        dto.setSystemTemplate(false);

        ResourceTemplateDto created = resourceManager.createTemplate(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/validate")
    public ResponseEntity<EntityValidationResult> validateTemplate(@RequestBody ResourceTemplateDto dto) {
        log.debug("POST /api/v1/wes/resource-templates/validate: code='{}'", dto.getTemplateCode());
        ComposedEntityTemplate composed = composerMapper.toComposedTemplate(dto);
        EntityValidationResult result = templateValidator.validate(composed);
        return ResponseEntity.ok(result);
    }

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

    @GetMapping("/{templateCode}/export")
    public ResponseEntity<com.company.warehouse.wes.api.dto.resource.TemplatePackageDto> exportTemplate(
            @PathVariable String templateCode) {
        log.info("GET /api/v1/wes/resource-templates/{}/export: Exporting package", templateCode);
        return ResponseEntity.ok(resourceManager.exportTemplatePackage(templateCode));
    }

    @GetMapping("/export-all")
    public ResponseEntity<com.company.warehouse.wes.api.dto.resource.TemplatePackageDto> exportAllTemplates() {
        log.info("GET /api/v1/wes/resource-templates/export-all: Exporting all templates");
        return ResponseEntity.ok(resourceManager.exportTemplatePackage(null));
    }

    @PostMapping("/import")
    public ResponseEntity<List<ResourceTemplateDto>> importPackage(
            @RequestParam(defaultValue = "true") boolean overwrite,
            @RequestBody com.company.warehouse.wes.api.dto.resource.TemplatePackageDto pkg) {
        log.info("POST /api/v1/wes/resource-templates/import: Importing package with {} templates, overwrite={}",
                pkg.getTemplates() != null ? pkg.getTemplates().size() : 0, overwrite);
        return ResponseEntity.ok(resourceManager.importTemplatePackage(pkg, overwrite));
    }
}
