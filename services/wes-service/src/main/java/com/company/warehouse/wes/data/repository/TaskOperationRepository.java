package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.TaskOperationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskOperationRepository extends JpaRepository<TaskOperationEntity, UUID> {
    List<TaskOperationEntity> findByTaskIdOrderBySequenceAsc(UUID taskId);
    Optional<TaskOperationEntity> findByTaskIdAndSequence(UUID taskId, int sequence);
}
