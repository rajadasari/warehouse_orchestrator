package org.platform.resourcemanager.application.service;

import org.platform.resourcemanager.api.dto.UpdateResourceRequest;
import org.platform.resourcemanager.api.exception.ResourceNotFoundException;
import org.platform.resourcemanager.application.port.EventPublisherPort;
import org.platform.resourcemanager.application.port.ResourceAuditLoggerPort;
import org.platform.resourcemanager.application.port.ResourceRepositoryPort;
import org.platform.resourcemanager.domain.event.ResourceCreatedEvent;
import org.platform.resourcemanager.domain.model.DynamicProperty;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;
import org.platform.resourcemanager.domain.model.SpatialCoordinate;

import java.util.*;


/**
 * Application service coordinating resource lifecycle, registration, updates, and telemetry.
 */
public class ResourceLifecycleService {

    private final ResourceRepositoryPort repository;
    private final ResourceAuditLoggerPort auditLogger;
    private final EventPublisherPort eventPublisher;

    public ResourceLifecycleService(
            ResourceRepositoryPort repository,
            ResourceAuditLoggerPort auditLogger,
            EventPublisherPort eventPublisher
    ) {
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
        this.auditLogger = Objects.requireNonNull(auditLogger, "auditLogger must not be null");
        this.eventPublisher = Objects.requireNonNull(eventPublisher, "eventPublisher must not be null");
    }

    public Resource registerResource(Resource resource) {
        Objects.requireNonNull(resource, "resource must not be null");
        repository.save(resource);
        auditLogger.log(resource.getId(), "REGISTER", "Resource created with name: " + resource.getName(), resource.getVersion());
        eventPublisher.publish(ResourceCreatedEvent.of(resource.getId(), resource.getName(), resource.getResourceClass().code()));
        return resource;
    }

    public Resource getResource(ResourceId id) {
        Objects.requireNonNull(id, "id must not be null");
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException(id));
    }

    public Optional<Resource> findResource(ResourceId id) {
        return repository.findById(id);
    }

    public List<Resource> getAllResources() {
        return repository.findAll();
    }

    public List<Resource> getResourcesByTenant(String tenantId) {
        return repository.findByTenant(tenantId);
    }

    public void updateCoordinate(ResourceId id, SpatialCoordinate coordinate, long expectedVersion) {
        Resource resource = getResource(id);
        resource.updateCoordinate(coordinate, expectedVersion);
        repository.save(resource);
        auditLogger.log(id, "UPDATE_COORDINATE", String.format("Coordinate updated to (%.2f, %.2f, %.2f)",
                coordinate.x(), coordinate.y(), coordinate.z()), resource.getVersion());
    }

    public void setProperty(ResourceId id, DynamicProperty property, long expectedVersion) {
        Resource resource = getResource(id);
        resource.setProperty(property, expectedVersion);
        repository.save(resource);
        auditLogger.log(id, "SET_PROPERTY", "Updated property: " + property.key(), resource.getVersion());
    }

    public Resource updateResource(ResourceId id, UpdateResourceRequest request) {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(request, "request must not be null");

        Resource resource = getResource(id);
        SpatialCoordinate newCoord = null;
        if (request.x() != null || request.y() != null || request.z() != null) {
            double x = (request.x() != null) ? request.x() : resource.getCoordinate().x();
            double y = (request.y() != null) ? request.y() : resource.getCoordinate().y();
            double z = (request.z() != null) ? request.z() : resource.getCoordinate().z();
            newCoord = SpatialCoordinate.of(x, y, z, resource.getCoordinate().yaw(), resource.getCoordinate().zoneId(), resource.getCoordinate().floorId());
        }

        Map<String, DynamicProperty> dynamicProps = new HashMap<>();
        if (request.propertiesToSet() != null) {
            request.propertiesToSet().forEach((k, v) -> dynamicProps.put(k, DynamicProperty.of(k, v)));
        }

        resource.applyBatchUpdate(
                newCoord,
                request.capabilitiesToAdd(),
                request.capabilitiesToRemove(),
                dynamicProps,
                request.propertyKeysToRemove(),
                request.expectedVersion()
        );

        repository.save(resource);
        auditLogger.log(id, "UPDATE_RESOURCE", "Resource updated", resource.getVersion());
        return resource;
    }

    public boolean decommissionResource(ResourceId id) {
        Objects.requireNonNull(id, "id must not be null");
        Optional<Resource> opt = repository.findById(id);
        if (opt.isPresent()) {
            Resource r = opt.get();
            auditLogger.log(id, "DECOMMISSION", "Resource deleted", r.getVersion());
            return repository.deleteById(id);
        }
        return false;
    }

    public ResourceRepositoryPort getRepository() {
        return repository;
    }

    public ResourceAuditLoggerPort getAuditLogger() {
        return auditLogger;
    }
}
