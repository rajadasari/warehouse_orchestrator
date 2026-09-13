package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.ResourceTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceTemplateRepository extends JpaRepository<ResourceTemplateEntity, UUID> {

    Optional<ResourceTemplateEntity> findByTemplateCode(String templateCode);

    boolean existsByTemplateCode(String templateCode);

    List<ResourceTemplateEntity> findByCategoryIgnoreCase(String category);

    List<ResourceTemplateEntity> findByResourceTypeIgnoreCase(String resourceType);

    List<ResourceTemplateEntity> findByCategoryIgnoreCaseAndActiveTrue(String category);

    List<ResourceTemplateEntity> findByActiveTrue();
}
