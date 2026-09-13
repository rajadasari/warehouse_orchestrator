package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.ResourceRelationshipEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceRelationshipRepository extends JpaRepository<ResourceRelationshipEntity, UUID> {

    List<ResourceRelationshipEntity> findBySourceResourceIdAndActiveTrue(String sourceResourceId);

    List<ResourceRelationshipEntity> findByTargetResourceIdAndActiveTrue(String targetResourceId);

    List<ResourceRelationshipEntity> findBySourceResourceIdOrTargetResourceId(String sourceResourceId, String targetResourceId);

    List<ResourceRelationshipEntity> findBySourceResourceIdAndRelationTypeAndActiveTrue(String sourceResourceId, String relationType);

    List<ResourceRelationshipEntity> findByTargetResourceIdAndRelationTypeAndActiveTrue(String targetResourceId, String relationType);

    List<ResourceRelationshipEntity> findByRelationCategoryAndActiveTrue(String relationCategory);

    Optional<ResourceRelationshipEntity> findBySourceResourceIdAndTargetResourceIdAndRelationType(
            String sourceResourceId, String targetResourceId, String relationType
    );

    boolean existsBySourceResourceIdAndTargetResourceIdAndRelationType(
            String sourceResourceId, String targetResourceId, String relationType
    );

    void deleteBySourceResourceIdOrTargetResourceId(String sourceResourceId, String targetResourceId);
}
