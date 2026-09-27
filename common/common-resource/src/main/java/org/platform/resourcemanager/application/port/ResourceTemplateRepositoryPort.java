package org.platform.resourcemanager.application.port;

import org.platform.resourcemanager.domain.template.ResourceTemplate;

import java.util.List;
import java.util.Optional;

/**
 * Persistence port (SPI) for resource template aggregate storage.
 */
public interface ResourceTemplateRepositoryPort {

    void save(ResourceTemplate template);

    Optional<ResourceTemplate> findByCode(String templateCode);

    List<ResourceTemplate> findAll();

    List<ResourceTemplate> findByCategory(String category);

    boolean existsByCode(String templateCode);

    boolean deleteByCode(String templateCode);

    long count();
}
