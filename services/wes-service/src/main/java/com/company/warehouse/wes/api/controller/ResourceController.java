package com.company.warehouse.wes.api.controller;

import com.company.warehouse.common.client.software.auth.TokenManager;
import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
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
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResourceController {

    private final ResourceManager resourceManager;
    private final TokenManager tokenManager;

    @PostMapping
    public ResponseEntity<ResourceResponseDto> createResource(@Valid @RequestBody ResourceRequestDto request) {
        log.info("POST /api/v1/wes/resources: Creating resource id='{}', name='{}', type='{}'",
                request.getResourceId(), request.getName(), request.getType());
        ResourceResponseDto response = resourceManager.createResource(request);
        triggerAuthorizationIfApplicable(response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ResourceResponseDto>> getAllResources(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        log.debug("GET /api/v1/wes/resources: Fetching resources type='{}', category='{}', status='{}'", type, category, status);
        return ResponseEntity.ok(resourceManager.getAllResources(type, category, status));
    }

    @GetMapping("/{resourceId}")
    public ResponseEntity<ResourceResponseDto> getResourceById(@PathVariable String resourceId) {
        log.debug("GET /api/v1/wes/resources/{}: Fetching resource", resourceId);
        return ResponseEntity.ok(resourceManager.getResourceById(resourceId));
    }

    @GetMapping("/{resourceId}/ip")
    public ResponseEntity<Map<String, String>> getResourceIp(@PathVariable String resourceId) {
        log.debug("GET /api/v1/wes/resources/{}/ip: Fetching IP", resourceId);
        return resourceManager.getResourceIp(resourceId)
                .map(ip -> ResponseEntity.ok(Map.of("resourceId", resourceId, "ip", ip)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{resourceId}")
    public ResponseEntity<ResourceResponseDto> updateResource(
            @PathVariable String resourceId,
            @RequestBody ResourceRequestDto request) {
        log.info("PUT /api/v1/wes/resources/{}: Updating resource", resourceId);
        ResourceResponseDto response = resourceManager.updateResource(resourceId, request);
        triggerAuthorizationIfApplicable(response);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{resourceId}/authorize")
    public ResponseEntity<Map<String, Object>> authorizeResource(@PathVariable String resourceId) {
        log.info("Triggering explicit authorization for resource: '{}'", resourceId);
        try {
            String token = tokenManager.forceRefreshToken(resourceId);
            boolean hasToken = token != null && !token.trim().isEmpty();
            TokenManager.TokenStatus status = tokenManager.getStatus(resourceId);
            return ResponseEntity.ok(Map.of(
                    "success", hasToken,
                    "token", hasToken ? token : "",
                    "status", status,
                    "message", hasToken
                            ? "Authorization successful! Token acquired and cached in memory."
                            : (status.getLastError() != null ? status.getLastError() : "Authorization failed. Check credentials.")
            ));
        } catch (Exception e) {
            log.error("Authorization failed for resource '{}': {}", resourceId, e.getMessage());
            TokenManager.TokenStatus status = tokenManager.getStatus(resourceId);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "token", "",
                    "status", status,
                    "error", e.getMessage() != null ? e.getMessage() : "Authorization error",
                    "message", "Authorization failed: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/{resourceId}/token-status")
    public ResponseEntity<TokenManager.TokenStatus> getResourceTokenStatus(@PathVariable String resourceId) {
        return ResponseEntity.ok(tokenManager.getStatus(resourceId));
    }

    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Void> deleteResource(@PathVariable String resourceId) {
        log.info("DELETE /api/v1/wes/resources/{}: Deleting resource", resourceId);
        resourceManager.deleteResource(resourceId);
        return ResponseEntity.noContent().build();
    }

    private void triggerAuthorizationIfApplicable(ResourceResponseDto dto) {
        if (dto == null) return;
        String type = dto.getType();
        String ip = dto.getIp();
        if ((ip == null || ip.trim().isEmpty()) && dto.getCustomProperties() != null) {
            Map<String, Object> props = dto.getCustomProperties();
            if (props.containsKey("ip") && props.get("ip") != null) ip = String.valueOf(props.get("ip"));
            else if (props.containsKey("ipAddress") && props.get("ipAddress") != null) ip = String.valueOf(props.get("ipAddress"));
            else if (props.containsKey("host") && props.get("host") != null) ip = String.valueOf(props.get("host"));
        }
        if (ip != null && !ip.trim().isEmpty()) {
            if (type == null || "WMS".equalsIgnoreCase(type) || "SOFTWARE".equalsIgnoreCase(type)) {
                try {
                    log.info("Triggering initial authorization check for resource '{}' at {}", dto.getResourceId(), ip);
                    tokenManager.forceRefreshToken(dto.getResourceId());
                } catch (Exception e) {
                    log.warn("Initial authorization check for resource '{}' failed: {}", dto.getResourceId(), e.getMessage());
                }
            }
        }
    }
}
