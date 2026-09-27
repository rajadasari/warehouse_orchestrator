package org.platform.resourcemanager.infrastructure;

import org.platform.resourcemanager.application.port.ResourceTemplateRepositoryPort;
import org.platform.resourcemanager.domain.template.ResourceTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-memory thread-safe implementation of ResourceTemplateRepositoryPort.
 */
public class InMemoryResourceTemplateRepository implements ResourceTemplateRepositoryPort {

    private final Map<String, ResourceTemplate> templates = new ConcurrentHashMap<>();

    @Override
    public void save(ResourceTemplate template) {
        Objects.requireNonNull(template, "template must not be null");
        templates.put(template.templateCode(), template);
    }

    @Override
    public Optional<ResourceTemplate> findByCode(String templateCode) {
        if (templateCode == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(templates.get(templateCode.trim().toUpperCase()));
    }

    @Override
    public List<ResourceTemplate> findAll() {
        return List.copyOf(templates.values());
    }

    @Override
    public List<ResourceTemplate> findByCategory(String category) {
        if (category == null) {
            return List.of();
        }
        String catUpper = category.trim().toUpperCase();
        return templates.values().stream()
                .filter(t -> t.category().name().equalsIgnoreCase(catUpper))
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByCode(String templateCode) {
        if (templateCode == null) {
            return false;
        }
        return templates.containsKey(templateCode.trim().toUpperCase());
    }

    @Override
    public boolean deleteByCode(String templateCode) {
        if (templateCode == null) {
            return false;
        }
        return templates.remove(templateCode.trim().toUpperCase()) != null;
    }

    @Override
    public long count() {
        return templates.size();
    }
}
