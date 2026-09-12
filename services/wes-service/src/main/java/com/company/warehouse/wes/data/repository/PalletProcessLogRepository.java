package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.PalletProcessLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PalletProcessLogRepository extends JpaRepository<PalletProcessLogEntity, UUID> {

    List<PalletProcessLogEntity> findByPalletIdOrderByCreatedAtDesc(UUID palletId);

    List<PalletProcessLogEntity> findByPalletLpnOrderByCreatedAtDesc(String palletLpn);
}
