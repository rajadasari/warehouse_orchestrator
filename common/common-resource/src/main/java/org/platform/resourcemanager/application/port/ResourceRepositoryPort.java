package org.platform.resourcemanager.application.port;

import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;

import java.util.List;
import java.util.Optional;

/**
 * Persistence port (SPI) for resource aggregate storage.
 */
public interface ResourceRepositoryPort {

    void save(Resource resource);

    Optional<Resource> findById(ResourceId id);

    List<Resource> findAll();

    List<Resource> findByTenant(String tenantId);

    boolean existsById(ResourceId id);

    boolean deleteById(ResourceId id);

    long count();
}
