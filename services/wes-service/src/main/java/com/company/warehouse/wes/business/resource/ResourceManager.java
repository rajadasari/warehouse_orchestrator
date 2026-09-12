package com.company.warehouse.wes.business.resource;

import com.company.warehouse.wes.api.dto.resource.ResourceRequestDto;
import com.company.warehouse.wes.api.dto.resource.ResourceResponseDto;
import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceManager {

    private final ResourceRepository resourceRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ResourceResponseDto createResource(ResourceRequestDto request) {
        String resId = request.getResourceId().trim();

        if (resourceRepository.existsByResourceId(resId)) {
            throw new IllegalArgumentException("Resource with ID '" + resId + "' already exists");
        }

        Map<String, Object> props = request.getResolvedCustomProperties();
        String jsonProps = serializeProperties(props);

        ResourceEntity entity = ResourceEntity.builder()
                .resourceId(resId)
                .name(request.getName().trim())
                .type(request.getType().trim().toUpperCase())
                .status(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .customProperties(jsonProps)
                .build();

        ResourceEntity saved = resourceRepository.save(entity);
        log.info("Created resource '{}' (Type: {}, IP: {})", saved.getResourceId(), saved.getType(), props.get("ip"));

        return toDto(saved, props);
    }

    @Transactional
    public ResourceResponseDto updateResource(String resourceId, ResourceRequestDto request) {
        ResourceEntity entity = resourceRepository.findByResourceId(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            entity.setName(request.getName().trim());
        }
        if (request.getType() != null && !request.getType().trim().isEmpty()) {
            entity.setType(request.getType().trim().toUpperCase());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            entity.setStatus(request.getStatus().trim().toUpperCase());
        }

        Map<String, Object> props = request.getResolvedCustomProperties();
        if (!props.isEmpty()) {
            // Merge with existing properties
            Map<String, Object> currentProps = deserializeProperties(entity.getCustomProperties());
            currentProps.putAll(props);
            entity.setCustomProperties(serializeProperties(currentProps));
            props = currentProps;
        } else {
            props = deserializeProperties(entity.getCustomProperties());
        }

        ResourceEntity updated = resourceRepository.save(entity);
        log.info("Updated resource '{}'", updated.getResourceId());

        return toDto(updated, props);
    }

    @Transactional(readOnly = true)
    public ResourceResponseDto getResourceById(String resourceId) {
        ResourceEntity entity = resourceRepository.findByResourceId(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));

        Map<String, Object> props = deserializeProperties(entity.getCustomProperties());
        return toDto(entity, props);
    }

    @Transactional(readOnly = true)
    public Optional<String> getResourceIp(String resourceId) {
        return resourceRepository.findByResourceId(resourceId)
                .map(entity -> {
                    Map<String, Object> props = deserializeProperties(entity.getCustomProperties());
                    if (props.containsKey("ip")) {
                        return String.valueOf(props.get("ip"));
                    }
                    if (props.containsKey("ipAddress")) {
                        return String.valueOf(props.get("ipAddress"));
                    }
                    if (props.containsKey("host")) {
                        return String.valueOf(props.get("host"));
                    }
                    return null;
                });
    }

    /**
     * Primary helper for developers building new APIs.
     * Extracts dynamic Base URL, port, protocol, clientId, and clientSecret from wes.resource.
     */
    @Transactional(readOnly = true)
    public Optional<ResourceConnectionConfig> getResourceConfig(String resourceId) {
        return resourceRepository.findByResourceId(resourceId)
                .map(entity -> {
                    Map<String, Object> props = deserializeProperties(entity.getCustomProperties());

                    String ip = null;
                    if (props.containsKey("ip")) ip = String.valueOf(props.get("ip"));
                    else if (props.containsKey("ipAddress")) ip = String.valueOf(props.get("ipAddress"));
                    else if (props.containsKey("host")) ip = String.valueOf(props.get("host"));

                    Integer port = null;
                    if (props.containsKey("port") && props.get("port") != null) {
                        try {
                            port = Integer.parseInt(String.valueOf(props.get("port")).trim());
                        } catch (Exception ignored) {}
                    }

                    String protocol = props.containsKey("protocol") ? String.valueOf(props.get("protocol")) : "http";
                    String basePath = props.containsKey("basePath") ? String.valueOf(props.get("basePath")) : null;
                    String clientId = props.containsKey("clientId") ? String.valueOf(props.get("clientId")) : null;
                    String clientSecret = props.containsKey("clientSecret") ? String.valueOf(props.get("clientSecret")) : null;

                    return ResourceConnectionConfig.builder()
                            .resourceId(entity.getResourceId())
                            .name(entity.getName())
                            .type(entity.getType())
                            .status(entity.getStatus())
                            .protocol(protocol)
                            .ip(ip)
                            .port(port)
                            .basePath(basePath)
                            .clientId(clientId)
                            .clientSecret(clientSecret)
                            .customProperties(props)
                            .build();
                });
    }

    @Transactional(readOnly = true)
    public List<ResourceResponseDto> getAllResources(String type, String status) {
        List<ResourceEntity> entities;

        if (type != null && !type.trim().isEmpty() && status != null && !status.trim().isEmpty()) {
            entities = resourceRepository.findByTypeIgnoreCaseAndStatusIgnoreCase(type.trim(), status.trim());
        } else if (type != null && !type.trim().isEmpty()) {
            entities = resourceRepository.findByTypeIgnoreCase(type.trim());
        } else if (status != null && !status.trim().isEmpty()) {
            entities = resourceRepository.findByStatusIgnoreCase(status.trim());
        } else {
            entities = resourceRepository.findAll();
        }

        return entities.stream()
                .map(e -> toDto(e, deserializeProperties(e.getCustomProperties())))
                .toList();
    }

    @Transactional
    public void deleteResource(String resourceId) {
        ResourceEntity entity = resourceRepository.findByResourceId(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found with ID: " + resourceId));
        resourceRepository.delete(entity);
        log.info("Deleted resource '{}'", resourceId);
    }

    private ResourceResponseDto toDto(ResourceEntity entity, Map<String, Object> props) {
        String ip = null;
        if (props.containsKey("ip")) {
            ip = String.valueOf(props.get("ip"));
        } else if (props.containsKey("ipAddress")) {
            ip = String.valueOf(props.get("ipAddress"));
        }

        return ResourceResponseDto.builder()
                .id(entity.getId())
                .resourceId(entity.getResourceId())
                .name(entity.getName())
                .type(entity.getType())
                .status(entity.getStatus())
                .ip(ip)
                .customProperties(props)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String serializeProperties(Map<String, Object> props) {
        try {
            return objectMapper.writeValueAsString(props);
        } catch (Exception e) {
            log.error("Failed to serialize custom properties", e);
            return "{}";
        }
    }

    private Map<String, Object> deserializeProperties(String json) {
        if (json == null || json.trim().isEmpty()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize custom properties: {}", json);
            return Collections.emptyMap();
        }
    }
}
