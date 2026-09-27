package com.company.warehouse.wcs.data.repository;

import com.company.warehouse.wcs.data.entity.OpcUaServerConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpcUaServerConfigRepository extends JpaRepository<OpcUaServerConfigEntity, UUID> {
    Optional<OpcUaServerConfigEntity> findByServerCode(String serverCode);
    boolean existsByServerCode(String serverCode);
}
