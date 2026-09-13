package com.company.warehouse.wes.data.repository.workflow;

import com.company.warehouse.wes.data.entity.workflow.WorkflowDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinitionEntity, UUID> {

    Optional<WorkflowDefinitionEntity> findByWorkflowCode(String workflowCode);

    boolean existsByWorkflowCode(String workflowCode);

    List<WorkflowDefinitionEntity> findByActiveTrue();

    List<WorkflowDefinitionEntity> findByCategoryIgnoreCaseAndActiveTrue(String category);
}
