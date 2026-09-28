package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.FunctionalRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FunctionalRuleRepository extends JpaRepository<FunctionalRuleEntity, UUID> {

    List<FunctionalRuleEntity> findByChannelIdOrderByCreatedAtDesc(UUID channelId);

    List<FunctionalRuleEntity> findByChannelIdAndIsReactiveTrue(UUID channelId);

    List<FunctionalRuleEntity> findByIsReactiveTrueAndIsEnabledTrue();

    int countByChannelId(UUID channelId);
}
