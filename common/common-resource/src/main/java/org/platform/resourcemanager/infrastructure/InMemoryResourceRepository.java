package org.platform.resourcemanager.infrastructure;

import org.platform.resourcemanager.application.port.ResourceRepositoryPort;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * High-performance thread-safe in-memory implementation of ResourceRepositoryPort.
 */
public class InMemoryResourceRepository implements ResourceRepositoryPort {

    private final Map<ResourceId, Resource> store = new ConcurrentHashMap<>();

    @Override
    public void save(Resource resource) {
        Objects.requireNonNull(resource, "resource must not be null");
        store.put(resource.getId(), resource);
    }

    @Override
    public Optional<Resource> findById(ResourceId id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<Resource> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public List<Resource> findByTenant(String tenantId) {
        if (tenantId == null) {
            return List.of();
        }
        return store.values().stream()
                .filter(r -> tenantId.equals(r.getId().tenantId()))
                .collect(Collectors.toUnmodifiableList());
    }

    @Override
    public boolean existsById(ResourceId id) {
        return id != null && store.containsKey(id);
    }

    @Override
    public boolean deleteById(ResourceId id) {
        if (id == null) {
            return false;
        }
        return store.remove(id) != null;
    }

    @Override
    public long count() {
        return store.size();
    }

    public void clear() {
        store.clear();
    }
}
