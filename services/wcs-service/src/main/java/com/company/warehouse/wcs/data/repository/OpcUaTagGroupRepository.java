package com.company.warehouse.wcs.data.repository;

import com.company.warehouse.wcs.data.entity.OpcUaTagGroupEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpcUaTagGroupRepository extends JpaRepository<OpcUaTagGroupEntity, UUID> {
    Optional<OpcUaTagGroupEntity> findByGroupKey(String groupKey);
    List<OpcUaTagGroupEntity> findByEquipmentCode(String equipmentCode);
    boolean existsByGroupKey(String groupKey);
}
