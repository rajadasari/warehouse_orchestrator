package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.resource.ResourceRelationshipDto;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/resource-relationships")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResourceRelationshipController {

    private final ResourceManager resourceManager;

    @GetMapping
    public ResponseEntity<List<ResourceRelationshipDto>> getAllRelationships(
            @RequestParam(required = false) String category) {
        log.debug("GET /api/v1/wes/resource-relationships: category='{}'", category);
        return ResponseEntity.ok(resourceManager.getAllRelationships(category));
    }

    @GetMapping("/resource/{resourceId}")
    public ResponseEntity<List<ResourceRelationshipDto>> getRelationshipsForResource(
            @PathVariable String resourceId) {
        log.debug("GET /api/v1/wes/resource-relationships/resource/{}", resourceId);
        return ResponseEntity.ok(resourceManager.getRelationshipsForResource(resourceId));
    }

    @PostMapping
    public ResponseEntity<ResourceRelationshipDto> createRelationship(
            @Valid @RequestBody ResourceRelationshipDto dto) {
        log.info("POST /api/v1/wes/resource-relationships: Creating '{}' --[{}]--> '{}'",
                dto.getSourceResourceId(), dto.getRelationType(), dto.getTargetResourceId());
        ResourceRelationshipDto created = resourceManager.createRelationship(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRelationship(@PathVariable UUID id) {
        log.info("DELETE /api/v1/wes/resource-relationships/{}", id);
        resourceManager.deleteRelationship(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/downstream/{sourceResourceId}")
    public ResponseEntity<List<String>> getDownstreamTargets(@PathVariable String sourceResourceId) {
        return ResponseEntity.ok(resourceManager.getDownstreamTargets(sourceResourceId));
    }

    @GetMapping("/data-sources/{targetResourceId}")
    public ResponseEntity<List<String>> getAssociatedDataSources(@PathVariable String targetResourceId) {
        return ResponseEntity.ok(resourceManager.getAssociatedDataSources(targetResourceId));
    }
}
