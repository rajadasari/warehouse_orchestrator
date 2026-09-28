package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.FunctionalRuleActionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FunctionalRuleActionRepository extends JpaRepository<FunctionalRuleActionEntity, UUID> {

    List<FunctionalRuleActionEntity> findByRuleIdOrderByActionOrderAsc(UUID ruleId);

    void deleteByRuleId(UUID ruleId);
}
