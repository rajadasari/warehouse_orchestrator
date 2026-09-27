package org.platform.resourcemanager.domain.model;

import org.platform.resourcemanager.api.exception.ConcurrencyConflictException;
import org.platform.resourcemanager.domain.fsm.CoreStates;
import org.platform.resourcemanager.domain.fsm.ResourceState;

import java.io.Serializable;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Universal Resource Aggregate Root.
 * Thread-safe entity enforcing invariant boundaries and optimistic CAS versioning.
 */
public class Resource implements Serializable {

    private final ResourceId id;
    private volatile String name;
    private volatile ResourceType resourceClass;
    private volatile ResourceCategory category;
    private volatile OperationalStatus status;
    private volatile ResourceState state;
    private volatile ISA95Path hierarchyPath;
    private volatile SpatialCoordinate coordinate;
    private final Set<String> capabilities;
    private final Map<String, DynamicProperty> properties;
    private final AtomicLong version;
    private final Instant createdAt;
    private volatile Instant lastModifiedAt;

    public Resource(
            ResourceId id,
            String name,
            ResourceType resourceClass,
            ResourceCategory category,
            OperationalStatus status,
            ResourceState state,
            ISA95Path hierarchyPath,
            SpatialCoordinate coordinate,
            Set<String> capabilities,
            Map<String, DynamicProperty> properties,
            long initialVersion,
            Instant createdAt,
            Instant lastModifiedAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.name = (name == null || name.isBlank()) ? id.resourceId() : name.trim();
        this.resourceClass = (resourceClass == null) ? StandardResourceClass.EQUIPMENT : resourceClass;
        this.category = (category == null) ? ResourceCategory.PHYSICAL : category;
        this.state = (state == null) ? CoreStates.ready() : state;
        this.status = (status == null) ? this.state.defaultStatus() : status;
        this.hierarchyPath = (hierarchyPath == null) ? ISA95Path.parse("") : hierarchyPath;
        this.coordinate = (coordinate == null) ? SpatialCoordinate.origin() : coordinate;
        this.capabilities = ConcurrentHashMap.newKeySet();
        if (capabilities != null) {
            this.capabilities.addAll(capabilities);
        }
        this.properties = new ConcurrentHashMap<>();
        if (properties != null) {
            this.properties.putAll(properties);
        }
        this.version = new AtomicLong(initialVersion);
        this.createdAt = (createdAt == null) ? Instant.now() : createdAt;
        this.lastModifiedAt = (lastModifiedAt == null) ? this.createdAt : lastModifiedAt;
    }

    private void verifyAndAdvanceCas(long expectedVersion) {
        long actual = this.version.get();
        if (actual != expectedVersion || !this.version.compareAndSet(expectedVersion, expectedVersion + 1)) {
            throw new ConcurrencyConflictException(this.id, expectedVersion, this.version.get());
        }
        this.lastModifiedAt = Instant.now();
    }

    public synchronized void updateStatus(OperationalStatus newStatus, long expectedVersion) {
        Objects.requireNonNull(newStatus, "newStatus must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.status = newStatus;
    }

    public synchronized void updateState(ResourceState newState, long expectedVersion) {
        Objects.requireNonNull(newState, "newState must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.state = newState;
        this.status = newState.defaultStatus();
    }

    public synchronized void updateCoordinate(SpatialCoordinate newCoordinate, long expectedVersion) {
        Objects.requireNonNull(newCoordinate, "newCoordinate must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.coordinate = newCoordinate;
    }

    public synchronized void setProperty(DynamicProperty property, long expectedVersion) {
        Objects.requireNonNull(property, "property must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.properties.put(property.key(), property);
    }

    public synchronized void removeProperty(String propertyKey, long expectedVersion) {
        Objects.requireNonNull(propertyKey, "propertyKey must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.properties.remove(propertyKey);
    }

    public synchronized void addCapability(String capability, long expectedVersion) {
        Objects.requireNonNull(capability, "capability must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.capabilities.add(capability.toUpperCase().trim());
    }

    public synchronized void removeCapability(String capability, long expectedVersion) {
        Objects.requireNonNull(capability, "capability must not be null");
        verifyAndAdvanceCas(expectedVersion);
        this.capabilities.remove(capability.toUpperCase().trim());
    }

    public synchronized void applyBatchUpdate(
            SpatialCoordinate newCoordinate,
            Set<String> toAddCaps,
            Set<String> toRemoveCaps,
            Map<String, DynamicProperty> propsToSet,
            Set<String> propKeysToRemove,
            long expectedVersion
    ) {
        verifyAndAdvanceCas(expectedVersion);
        if (newCoordinate != null) {
            this.coordinate = newCoordinate;
        }
        if (toAddCaps != null) {
            toAddCaps.forEach(c -> this.capabilities.add(c.toUpperCase().trim()));
        }
        if (toRemoveCaps != null) {
            toRemoveCaps.forEach(c -> this.capabilities.remove(c.toUpperCase().trim()));
        }
        if (propsToSet != null) {
            this.properties.putAll(propsToSet);
        }
        if (propKeysToRemove != null) {
            propKeysToRemove.forEach(this.properties::remove);
        }
    }

    public boolean hasCapability(String capability) {
        if (capability == null) return false;
        return this.capabilities.contains(capability.toUpperCase().trim());
    }

    public ResourceId getId() { return id; }
    public String getName() { return name; }
    public ResourceType getResourceClass() { return resourceClass; }
    public ResourceCategory getCategory() { return category; }
    public OperationalStatus getStatus() { return status; }
    public ResourceState getState() { return state; }
    public ISA95Path getHierarchyPath() { return hierarchyPath; }
    public SpatialCoordinate getCoordinate() { return coordinate; }
    public Set<String> getCapabilities() { return Collections.unmodifiableSet(capabilities); }
    public Map<String, DynamicProperty> getProperties() { return Collections.unmodifiableMap(properties); }
    public long getVersion() { return version.get(); }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastModifiedAt() { return lastModifiedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Resource other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Resource[" + id + ", status=" + status + ", state=" + state.name() + ", v=" + version.get() + "]";
    }
}
