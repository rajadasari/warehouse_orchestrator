package com.company.warehouse.auth.data.repository;

import com.company.warehouse.auth.data.entity.UserFacilityAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserFacilityAssignmentRepository extends JpaRepository<UserFacilityAssignmentEntity, UUID> {

    List<UserFacilityAssignmentEntity> findByUser_UserId(UUID userId);

    Optional<UserFacilityAssignmentEntity> findFirstByUser_UserIdAndIsPrimaryTrue(UUID userId);
}
