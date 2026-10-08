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
import java.util.Map;

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
    private final com.company.warehouse.wes.business.resource.compiler.PolyglotScriptDispatcher scriptDispatcher;

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

    @PostMapping("/test-method")
    public ResponseEntity<com.company.warehouse.wes.domain.resource.MethodExecutionResult> testMethod(
            @RequestBody com.company.warehouse.wes.api.dto.resource.MethodTestRequestDto request) {
        long start = System.currentTimeMillis();
        String mName = request.getMethodName() != null && !request.getMethodName().isBlank() ? request.getMethodName().trim() : "TEST_METHOD";
        String language = request.getLanguage() != null && !request.getLanguage().isBlank() ? request.getLanguage().trim().toUpperCase() : "JAVA";
        log.info("POST /api/v1/wes/resource-templates/test-method: Testing dynamic {} logic for '{}'", language, mName);

        List<com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry> traceLogs = new java.util.ArrayList<>();
        traceLogs.add(com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry.info("INIT", "Starting dynamic " + language + " method test for '" + mName + "'"));

        Map<String, Object> workingProperties = new java.util.concurrent.ConcurrentHashMap<>(
                request.getProperties() != null ? request.getProperties() : java.util.Collections.emptyMap()
        );
        Map<String, Object> params = request.getParameters() != null ? request.getParameters() : java.util.Collections.emptyMap();
        Map<String, Object> initialProps = new java.util.HashMap<>(workingProperties);

        try {
            long compStart = System.currentTimeMillis();
            Object result = scriptDispatcher.execute(language, request.getEffectiveScript(), workingProperties, params, java.util.Collections.emptyMap(), traceLogs);
            long compTime = System.currentTimeMillis() - compStart;
            traceLogs.add(com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry.info("EXEC", "Execution completed in " + compTime + "ms. Result: " + result));

            Map<String, Object> updated = new java.util.HashMap<>();
            if (request.getStoreResultToProperty() != null && !request.getStoreResultToProperty().isBlank() && result != null) {
                workingProperties.put(request.getStoreResultToProperty(), result);
                updated.put(request.getStoreResultToProperty(), result);
                traceLogs.add(com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry.info("WRITE_BACK", "Written to property '" + request.getStoreResultToProperty() + "': " + result));
            }
            for (Map.Entry<String, Object> e : workingProperties.entrySet()) {
                if (!java.util.Objects.equals(initialProps.get(e.getKey()), e.getValue())) {
                    updated.put(e.getKey(), e.getValue());
                }
            }

            long totalTime = System.currentTimeMillis() - start;
            traceLogs.add(com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry.info("COMPLETE", "Test completed in " + totalTime + "ms"));

            return ResponseEntity.ok(com.company.warehouse.wes.domain.resource.MethodExecutionResult.builder()
                    .success(true)
                    .methodName(mName)
                    .statusCode(200)
                    .data(result)
                    .updatedProperties(updated)
                    .traceLogs(traceLogs)
                    .executionTimeMs(totalTime)
                    .message("Dynamic " + language + " method executed successfully")
                    .build());
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - start;
            log.warn("Dynamic {} method test '{}' failed: {}", language, mName, e.getMessage());
            traceLogs.add(com.company.warehouse.wes.business.resource.compiler.MethodTraceLogEntry.error("ERROR", e.getMessage()));
            return ResponseEntity.ok(com.company.warehouse.wes.domain.resource.MethodExecutionResult.builder()
                    .success(false)
                    .methodName(mName)
                    .statusCode(400)
                    .error(e.getMessage())
                    .message("Execution error: " + e.getMessage())
                    .traceLogs(traceLogs)
                    .executionTimeMs(totalTime)
                    .build());
        }
    }
}
