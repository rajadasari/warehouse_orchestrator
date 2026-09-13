package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.ResourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<ResourceEntity, UUID> {

    Optional<ResourceEntity> findByResourceId(String resourceId);

    Optional<ResourceEntity> findByResourceIdAndStatusIgnoreCase(String resourceId, String status);

    default Optional<ResourceEntity> findActiveByResourceId(String resourceId) {
        return findByResourceIdAndStatusIgnoreCase(resourceId, "ACTIVE");
    }

    boolean existsByResourceId(String resourceId);

    List<ResourceEntity> findByTypeIgnoreCase(String type);

    List<ResourceEntity> findByStatusIgnoreCase(String status);

    List<ResourceEntity> findByTypeIgnoreCaseAndStatusIgnoreCase(String type, String status);

    List<ResourceEntity> findByCategoryIgnoreCase(String category);

    List<ResourceEntity> findByTemplateCodeIgnoreCase(String templateCode);
}
