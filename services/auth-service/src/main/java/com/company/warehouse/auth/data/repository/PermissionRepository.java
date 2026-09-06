package com.company.warehouse.auth.data.repository;

import com.company.warehouse.auth.data.entity.PermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<PermissionEntity, UUID> {

    Optional<PermissionEntity> findByPermissionCode(String permissionCode);

    boolean existsByPermissionCode(String permissionCode);
}
