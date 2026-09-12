package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.business.resource.ResourceManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

@RestController
@RequestMapping("/api/v1/wes/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResourceController {

    private final ResourceManager resourceManager;

    @PostMapping
    public ResponseEntity<ResourceResponseDto> createResource(@Valid @RequestBody ResourceRequestDto request) {
        ResourceResponseDto response = resourceManager.createResource(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ResourceResponseDto>> getAllResources(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(resourceManager.getAllResources(type, status));
    }

    @GetMapping("/{resourceId}")
    public ResponseEntity<ResourceResponseDto> getResourceById(@PathVariable String resourceId) {
        return ResponseEntity.ok(resourceManager.getResourceById(resourceId));
    }

    @GetMapping("/{resourceId}/ip")
    public ResponseEntity<Map<String, String>> getResourceIp(@PathVariable String resourceId) {
        return resourceManager.getResourceIp(resourceId)
                .map(ip -> ResponseEntity.ok(Map.of("resourceId", resourceId, "ip", ip)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{resourceId}")
    public ResponseEntity<ResourceResponseDto> updateResource(
            @PathVariable String resourceId,
            @RequestBody ResourceRequestDto request) {
        return ResponseEntity.ok(resourceManager.updateResource(resourceId, request));
    }

    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Void> deleteResource(@PathVariable String resourceId) {
        resourceManager.deleteResource(resourceId);
        return ResponseEntity.noContent().build();
    }
}
