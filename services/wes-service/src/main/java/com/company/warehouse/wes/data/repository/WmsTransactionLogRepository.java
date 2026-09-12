package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.WmsTransactionLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WmsTransactionLogRepository extends JpaRepository<WmsTransactionLogEntity, UUID> {
    List<WmsTransactionLogEntity> findTop50ByOrderByCreatedAtDesc();
}
