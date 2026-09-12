package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.WesTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WesTaskRepository extends JpaRepository<WesTaskEntity, UUID> {
    Optional<WesTaskEntity> findByTaskNumber(String taskNumber);
    List<WesTaskEntity> findByPalletLpnOrderByCreatedAtDesc(String palletLpn);
    List<WesTaskEntity> findByStatus(String status);
}
