package com.company.warehouse.wcs.data.repository;

import com.company.warehouse.wcs.data.entity.OpcUaClientConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpcUaClientConfigRepository extends JpaRepository<OpcUaClientConfigEntity, UUID> {
    Optional<OpcUaClientConfigEntity> findByClientCode(String clientCode);
    boolean existsByClientCode(String clientCode);
}
