package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.IntegrationSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IntegrationSessionRepository extends JpaRepository<IntegrationSessionEntity, UUID> {

    Optional<IntegrationSessionEntity> findByCorrelationKey(String correlationKey);

    List<IntegrationSessionEntity> findByChannelCode(String channelCode);

    List<IntegrationSessionEntity> findByStatus(String status);
}
