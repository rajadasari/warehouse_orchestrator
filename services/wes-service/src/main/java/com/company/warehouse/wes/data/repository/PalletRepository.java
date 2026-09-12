package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.PalletEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PalletRepository extends JpaRepository<PalletEntity, UUID> {
    Optional<PalletEntity> findByPalletLpn(String palletLpn);
    boolean existsByPalletLpn(String palletLpn);
    List<PalletEntity> findByStatus(String status);
    List<PalletEntity> findAllByOrderByCreatedAtDesc();
}
