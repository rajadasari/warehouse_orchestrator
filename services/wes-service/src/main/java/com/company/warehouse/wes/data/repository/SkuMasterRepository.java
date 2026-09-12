package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.SkuMasterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SkuMasterRepository extends JpaRepository<SkuMasterEntity, UUID> {
    Optional<SkuMasterEntity> findBySkuCode(String skuCode);
    boolean existsBySkuCode(String skuCode);
    List<SkuMasterEntity> findByItemId(UUID itemId);
}
