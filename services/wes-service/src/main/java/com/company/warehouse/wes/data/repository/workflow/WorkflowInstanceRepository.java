package com.company.warehouse.wes.data.repository.workflow;

import com.company.warehouse.wes.data.entity.workflow.WorkflowInstanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstanceEntity, UUID> {

    List<WorkflowInstanceEntity> findByWorkflowCode(String workflowCode);

    List<WorkflowInstanceEntity> findByWorkflowCodeOrderByCreatedAtDesc(String workflowCode);

    List<WorkflowInstanceEntity> findAllByOrderByCreatedAtDesc();

    List<WorkflowInstanceEntity> findByEntityReference(String entityReference);

    List<WorkflowInstanceEntity> findByStatus(String status);

    Optional<WorkflowInstanceEntity> findByCorrelationKey(String correlationKey);
}
