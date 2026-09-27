package org.platform.resourcemanager.infrastructure;

import org.platform.resourcemanager.application.port.ResourceShapeRepositoryPort;
import org.platform.resourcemanager.domain.shape.ResourceShape;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe In-Memory implementation of ResourceShapeRepositoryPort.
 */
public class InMemoryResourceShapeRepository implements ResourceShapeRepositoryPort {

    private final Map<String, ResourceShape> store = new ConcurrentHashMap<>();

    @Override
    public ResourceShape save(ResourceShape shape) {
        Objects.requireNonNull(shape, "shape must not be null");
        store.put(shape.shapeCode(), shape);
        return shape;
    }

    @Override
    public Optional<ResourceShape> findByCode(String shapeCode) {
        if (shapeCode == null || shapeCode.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(shapeCode.trim().toUpperCase()));
    }

    @Override
    public List<ResourceShape> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public List<ResourceShape> findByCodes(List<String> shapeCodes) {
        if (shapeCodes == null || shapeCodes.isEmpty()) {
            return List.of();
        }
        List<ResourceShape> result = new ArrayList<>();
        for (String code : shapeCodes) {
            findByCode(code).ifPresent(result::add);
        }
        return Collections.unmodifiableList(result);
    }

    @Override
    public boolean deleteByCode(String shapeCode) {
        if (shapeCode == null || shapeCode.isBlank()) {
            return false;
        }
        return store.remove(shapeCode.trim().toUpperCase()) != null;
    }

    @Override
    public boolean existsByCode(String shapeCode) {
        if (shapeCode == null || shapeCode.isBlank()) {
            return false;
        }
        return store.containsKey(shapeCode.trim().toUpperCase());
    }

    public void clear() {
        store.clear();
    }
}
