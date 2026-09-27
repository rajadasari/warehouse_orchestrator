package com.company.warehouse.wcs.data.repository;

import com.company.warehouse.wcs.data.entity.OpcUaTagMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpcUaTagMappingRepository extends JpaRepository<OpcUaTagMappingEntity, UUID> {
    Optional<OpcUaTagMappingEntity> findByTagKey(String tagKey);
    List<OpcUaTagMappingEntity> findByClientCode(String clientCode);
    List<OpcUaTagMappingEntity> findByServerCode(String serverCode);
    List<OpcUaTagMappingEntity> findByEquipmentCode(String equipmentCode);
    boolean existsByTagKey(String tagKey);
}
