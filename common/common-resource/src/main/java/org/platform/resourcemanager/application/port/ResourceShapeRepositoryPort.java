package org.platform.resourcemanager.application.port;

import org.platform.resourcemanager.domain.shape.ResourceShape;

import java.util.List;
import java.util.Optional;

/**
 * Hexagonal SPI Port for ResourceShape persistence and retrieval.
 */
public interface ResourceShapeRepositoryPort {

    ResourceShape save(ResourceShape shape);

    Optional<ResourceShape> findByCode(String shapeCode);

    List<ResourceShape> findAll();

    List<ResourceShape> findByCodes(List<String> shapeCodes);

    boolean deleteByCode(String shapeCode);

    boolean existsByCode(String shapeCode);
}
