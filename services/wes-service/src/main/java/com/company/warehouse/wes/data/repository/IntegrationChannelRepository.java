package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.IntegrationChannelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IntegrationChannelRepository extends JpaRepository<IntegrationChannelEntity, UUID> {

    Optional<IntegrationChannelEntity> findByChannelCode(String channelCode);

    boolean existsByChannelCode(String channelCode);

    List<IntegrationChannelEntity> findByDirectionAndActiveTrue(String direction);

    List<IntegrationChannelEntity> findByDomainAndActiveTrue(String domain);
}
