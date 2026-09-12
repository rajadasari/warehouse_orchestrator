package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.CustomAttributeDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomAttributeDefinitionRepository extends JpaRepository<CustomAttributeDefinitionEntity, UUID> {
    List<CustomAttributeDefinitionEntity> findByTargetEntityOrderBySortOrderAsc(String targetEntity);
    Optional<CustomAttributeDefinitionEntity> findByTargetEntityAndAttributeCode(String targetEntity, String attributeCode);
    boolean existsByTargetEntityAndAttributeCode(String targetEntity, String attributeCode);
}
