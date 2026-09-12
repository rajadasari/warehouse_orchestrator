package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.PalletHandlingStrategyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PalletHandlingStrategyRepository extends JpaRepository<PalletHandlingStrategyEntity, UUID> {
    Optional<PalletHandlingStrategyEntity> findByStrategyCode(String strategyCode);
    boolean existsByStrategyCode(String strategyCode);
    List<PalletHandlingStrategyEntity> findByItemId(UUID itemId);
    List<PalletHandlingStrategyEntity> findBySkuId(UUID skuId);
    Optional<PalletHandlingStrategyEntity> findBySkuIdAndIsDefaultTrue(UUID skuId);
}
