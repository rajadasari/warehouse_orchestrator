package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.ApiIntegrationMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiIntegrationMappingRepository extends JpaRepository<ApiIntegrationMappingEntity, UUID> {

    Optional<ApiIntegrationMappingEntity> findByMappingCode(String mappingCode);

    boolean existsByMappingCode(String mappingCode);

    List<ApiIntegrationMappingEntity> findByTargetResourceIdAndOperationTypeAndActiveTrue(
            String targetResourceId, String operationType);

    List<ApiIntegrationMappingEntity> findByTargetResourceIdIgnoreCase(String targetResourceId);

    List<ApiIntegrationMappingEntity> findByOperationTypeIgnoreCase(String operationType);

    List<ApiIntegrationMappingEntity> findByActiveTrue();
}
