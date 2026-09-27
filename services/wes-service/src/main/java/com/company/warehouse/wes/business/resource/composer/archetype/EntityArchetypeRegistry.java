package com.company.warehouse.wes.business.resource.composer.archetype;

import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry discovering and maintaining all built-in entity archetype specifications.
 */
@Slf4j
@Component
public class EntityArchetypeRegistry {

    private final Map<String, EntityArchetype> archetypes = new ConcurrentHashMap<>();

    public EntityArchetypeRegistry() {
        this(java.util.Collections.emptyList());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public EntityArchetypeRegistry(org.springframework.beans.factory.ObjectProvider<List<EntityArchetype>> discoveredArchetypesProvider) {
        this(discoveredArchetypesProvider != null ? discoveredArchetypesProvider.getIfAvailable() : java.util.Collections.emptyList());
    }

    public EntityArchetypeRegistry(List<EntityArchetype> discoveredArchetypes) {
        if (discoveredArchetypes != null) {
            for (EntityArchetype a : discoveredArchetypes) {
                archetypes.put(a.getArchetypeCode().trim().toUpperCase(), a);
                log.info("Registered Entity Archetype: '{}' ({})", a.getArchetypeCode(), a.getArchetypeName());
            }
        }
    }

    public Optional<EntityArchetype> getArchetype(String code) {
        if (code == null) return Optional.empty();
        return Optional.ofNullable(archetypes.get(code.trim().toUpperCase()));
    }

    public Optional<ComposedEntityTemplate> getTemplate(String code) {
        return getArchetype(code).map(EntityArchetype::toTemplate);
    }

    public boolean hasArchetype(String code) {
        if (code == null) return false;
        return archetypes.containsKey(code.trim().toUpperCase());
    }

    public List<EntityArchetype> getAllArchetypes() {
        return List.copyOf(archetypes.values());
    }

    public List<EntityArchetype> getByCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return getAllArchetypes();
        }
        String catUpper = category.trim().toUpperCase();
        return archetypes.values().stream()
                .filter(a -> a.getCategory().equalsIgnoreCase(catUpper))
                .toList();
    }
}
