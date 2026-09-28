package com.company.warehouse.wes.data.repository.workflow;

import com.company.warehouse.wes.data.entity.workflow.WorkflowNodeTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowNodeTemplateRepository extends JpaRepository<WorkflowNodeTemplateEntity, UUID> {

    Optional<WorkflowNodeTemplateEntity> findByTemplateCode(String templateCode);

    boolean existsByTemplateCode(String templateCode);

    List<WorkflowNodeTemplateEntity> findByCategoryIgnoreCase(String category);

    List<WorkflowNodeTemplateEntity> findByNodeTypeIgnoreCase(String nodeType);

    void deleteByTemplateCode(String templateCode);
}
