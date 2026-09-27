package com.company.warehouse.wcs.data.repository;

import com.company.warehouse.wcs.data.entity.OpcUaStationTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpcUaStationTemplateRepository extends JpaRepository<OpcUaStationTemplateEntity, UUID> {
    Optional<OpcUaStationTemplateEntity> findByTemplateCode(String templateCode);
    boolean existsByTemplateCode(String templateCode);
}
