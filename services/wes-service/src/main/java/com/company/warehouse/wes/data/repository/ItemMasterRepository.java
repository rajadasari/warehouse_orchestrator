package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemMasterRepository extends JpaRepository<ItemMasterEntity, UUID> {
    Optional<ItemMasterEntity> findByItemCode(String itemCode);
    boolean existsByItemCode(String itemCode);
}
