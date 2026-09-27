package com.company.warehouse.wes.adapter.resource;

import com.company.warehouse.wes.data.entity.ResourceEntity;
import com.company.warehouse.wes.data.repository.ResourceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.platform.resourcemanager.application.port.ResourceRepositoryPort;
import org.platform.resourcemanager.domain.fsm.CoreStates;
import org.platform.resourcemanager.domain.fsm.ResourceState;
import org.platform.resourcemanager.domain.model.DynamicProperty;
import org.platform.resourcemanager.domain.model.ISA95Path;
import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceCategory;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.model.SpatialCoordinate;
import org.platform.resourcemanager.domain.model.StandardResourceClass;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * PostgreSQL persistence adapter implementing the common-resource ResourceRepositoryPort.
 * Bridges domain Resource aggregates directly to the existing wes.resource table.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostgresResourceRepositoryAdapter implements ResourceRepositoryPort {

    private final ResourceRepository resourceRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void save(Resource resource) {
        String resId = resource.getId().resourceId();
        ResourceEntity entity = resourceRepository.findByResourceId(resId)
                .orElseGet(() -> ResourceEntity.builder()
                        .resourceId(resId)
                        .name(resource.getName())
                        .type(resource.getResourceClass().code())
                        .build());

        entity.setName(resource.getName());
        entity.setType(resource.getResourceClass().code());
        entity.setStatus(resource.getStatus().name());
        entity.setCategory(resource.getCategory().name());

        Map<String, Object> propsMap = new HashMap<>();
        resource.getProperties().forEach((k, v) -> propsMap.put(k, v.value()));

        // Also preserve spatial and hierarchy info in custom_properties
        if (resource.getCoordinate() != null) {
            propsMap.put("x", resource.getCoordinate().x());
            propsMap.put("y", resource.getCoordinate().y());
            propsMap.put("z", resource.getCoordinate().z());
        }
        if (resource.getHierarchyPath() != null) {
            propsMap.put("hierarchyPath", resource.getHierarchyPath().toString());
        }
        if (resource.getState() != null) {
            propsMap.put("packmlState", resource.getState().name());
        }

        try {
            entity.setCustomProperties(objectMapper.writeValueAsString(propsMap));
        } catch (Exception e) {
            log.error("Failed to serialize properties for resource {}", resId, e);
        }

        resourceRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Resource> findById(ResourceId id) {
        return resourceRepository.findByResourceId(id.resourceId())
                .map(this::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Resource> findAll() {
        return resourceRepository.findAll().stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Resource> findByTenant(String tenantId) {
        return findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(ResourceId id) {
        return resourceRepository.existsByResourceId(id.resourceId());
    }

    @Override
    @Transactional
    public boolean deleteById(ResourceId id) {
        return resourceRepository.findByResourceId(id.resourceId())
                .map(entity -> {
                    resourceRepository.delete(entity);
                    return true;
                }).orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public long count() {
        return resourceRepository.count();
    }

    private Resource toDomain(ResourceEntity entity) {
        Map<String, Object> rawProps = Collections.emptyMap();
        try {
            if (entity.getCustomProperties() != null && !entity.getCustomProperties().isBlank()) {
                rawProps = objectMapper.readValue(entity.getCustomProperties(), new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to parse customProperties for resource {}", entity.getResourceId(), e);
        }

        Map<String, DynamicProperty> dynamicProps = new HashMap<>();
        rawProps.forEach((k, v) -> dynamicProps.put(k, DynamicProperty.of(k, v)));

        double x = getDouble(rawProps, "x", 0.0);
        double y = getDouble(rawProps, "y", 0.0);
        double z = getDouble(rawProps, "z", 0.0);
        SpatialCoordinate coordinate = SpatialCoordinate.of(x, y, z);

        String pathStr = rawProps.getOrDefault("hierarchyPath", "").toString();
        ISA95Path path = ISA95Path.parse(pathStr);

        ResourceCategory category = ResourceCategory.PHYSICAL;
        try {
            if (entity.getCategory() != null) {
                category = ResourceCategory.valueOf(entity.getCategory().toUpperCase());
            }
        } catch (Exception ignored) {
            // Keep default
        }

        OperationalStatus status = OperationalStatus.AVAILABLE;
        try {
            if (entity.getStatus() != null) {
                status = OperationalStatus.valueOf(entity.getStatus().toUpperCase());
            }
        } catch (Exception ignored) {
            // Keep default
        }

        ResourceState state = CoreStates.ready();
        String stateStr = (String) rawProps.get("packmlState");
        if (stateStr != null) {
            state = switch (stateStr.toUpperCase()) {
                case "RUNNING", "EXECUTE" -> CoreStates.running();
                case "STOPPED" -> CoreStates.stopped();
                case "FAULTED" -> CoreStates.faulted("Database persisted fault state");
                default -> CoreStates.ready();
            };
        }

        return new Resource(
                ResourceId.of(entity.getResourceId()),
                entity.getName(),
                StandardResourceClass.fromString(entity.getType()),
                category,
                status,
                state,
                path,
                coordinate,
                Set.of(),
                dynamicProps,
                entity.getVersion(),
                entity.getCreatedAt() != null ? entity.getCreatedAt() : Instant.now(),
                entity.getUpdatedAt() != null ? entity.getUpdatedAt() : Instant.now()
        );
    }

    private double getDouble(Map<String, Object> map, String key, double defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        if (val instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {}
        }
        return defaultVal;
    }
}
