package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PalletTypeMasterRepository extends JpaRepository<PalletTypeMasterEntity, UUID> {
    Optional<PalletTypeMasterEntity> findByCode(String code);
    boolean existsByCode(String code);
}
