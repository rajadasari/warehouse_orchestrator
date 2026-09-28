package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.FunctionalRuleConditionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FunctionalRuleConditionRepository extends JpaRepository<FunctionalRuleConditionEntity, UUID> {

    List<FunctionalRuleConditionEntity> findByRuleIdOrderByConditionOrderAsc(UUID ruleId);

    void deleteByRuleId(UUID ruleId);
}
