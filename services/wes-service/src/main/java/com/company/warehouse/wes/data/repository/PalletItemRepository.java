package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.PalletItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PalletItemRepository extends JpaRepository<PalletItemEntity, UUID> {
    List<PalletItemEntity> findByPalletId(UUID palletId);
    List<PalletItemEntity> findBySkuId(UUID skuId);
}
