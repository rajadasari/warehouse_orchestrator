package org.platform.resourcemanager.domain.builder;

import org.platform.resourcemanager.api.exception.ValidationException;
import org.platform.resourcemanager.domain.fsm.CoreStates;
import org.platform.resourcemanager.domain.fsm.ResourceState;
import org.platform.resourcemanager.domain.model.*;

import java.time.Instant;
import java.util.*;

/**
 * Fluent builder for creating Resource instances with invariant validation.
 */
public class ResourceBuilder {

    private ResourceId id;
    private String name;
    private ResourceType resourceClass = StandardResourceClass.EQUIPMENT;
    private ResourceCategory category = ResourceCategory.PHYSICAL;
    private OperationalStatus status;
    private ResourceState state = CoreStates.ready();
    private ISA95Path hierarchyPath = ISA95Path.parse("");
    private SpatialCoordinate coordinate = SpatialCoordinate.origin();
    private final Set<String> capabilities = new HashSet<>();
    private final Map<String, DynamicProperty> properties = new HashMap<>();
    private long version = 1L;
    private Instant createdAt = Instant.now();
    private Instant lastModifiedAt;

    public static ResourceBuilder create() {
        return new ResourceBuilder();
    }

    public static ResourceBuilder create(ResourceId id) {
        return new ResourceBuilder().id(id);
    }

    public static ResourceBuilder create(String tenantId, String resourceId) {
        return new ResourceBuilder().id(ResourceId.of(tenantId, resourceId));
    }

    public ResourceBuilder id(ResourceId id) {
        this.id = id;
        return this;
    }

    public ResourceBuilder name(String name) {
        this.name = name;
        return this;
    }

    public ResourceBuilder resourceClass(ResourceType resourceClass) {
        this.resourceClass = resourceClass;
        return this;
    }

    public ResourceBuilder category(ResourceCategory category) {
        this.category = category;
        return this;
    }

    public ResourceBuilder status(OperationalStatus status) {
        this.status = status;
        return this;
    }

    public ResourceBuilder state(ResourceState state) {
        this.state = state;
        return this;
    }

    public ResourceBuilder hierarchyPath(ISA95Path hierarchyPath) {
        this.hierarchyPath = hierarchyPath;
        return this;
    }

    public ResourceBuilder hierarchyPath(String path) {
        this.hierarchyPath = ISA95Path.parse(path);
        return this;
    }

    public ResourceBuilder coordinate(SpatialCoordinate coordinate) {
        this.coordinate = coordinate;
        return this;
    }

    public ResourceBuilder coordinate(double x, double y, double z) {
        this.coordinate = SpatialCoordinate.of(x, y, z);
        return this;
    }

    public ResourceBuilder addCapability(String capability) {
        if (capability != null && !capability.isBlank()) {
            this.capabilities.add(capability.toUpperCase().trim());
        }
        return this;
    }

    public ResourceBuilder capabilities(Collection<String> capabilities) {
        if (capabilities != null) {
            capabilities.forEach(this::addCapability);
        }
        return this;
    }

    public ResourceBuilder addProperty(DynamicProperty property) {
        if (property != null) {
            this.properties.put(property.key(), property);
        }
        return this;
    }

    public ResourceBuilder addProperty(String key, Object value) {
        return addProperty(DynamicProperty.of(key, value));
    }

    public ResourceBuilder version(long version) {
        this.version = version;
        return this;
    }

    public Resource build() {
        List<String> validationErrors = new ArrayList<>();
        if (id == null) {
            validationErrors.add("ResourceId is required");
        }
        if (state == null) {
            state = CoreStates.ready();
        }
        if (status == null) {
            status = state.defaultStatus();
        }
        if (!validationErrors.isEmpty()) {
            throw new ValidationException("Resource validation failed", validationErrors);
        }

        return new Resource(
                id,
                name != null ? name : id.resourceId(),
                resourceClass,
                category,
                status,
                state,
                hierarchyPath,
                coordinate,
                capabilities,
                properties,
                version,
                createdAt,
                lastModifiedAt != null ? lastModifiedAt : createdAt
        );
    }
}
