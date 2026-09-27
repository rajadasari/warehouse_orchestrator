package com.company.warehouse.wcs.data.repository;

import com.company.warehouse.wcs.data.entity.OpcUaHandshakeFlowEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpcUaHandshakeFlowRepository extends JpaRepository<OpcUaHandshakeFlowEntity, UUID> {
    Optional<OpcUaHandshakeFlowEntity> findByFlowCode(String flowCode);
    List<OpcUaHandshakeFlowEntity> findByEquipmentCode(String equipmentCode);
    boolean existsByFlowCode(String flowCode);
}
