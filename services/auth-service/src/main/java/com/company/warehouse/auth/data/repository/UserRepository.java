package com.company.warehouse.auth.data.repository;

import com.company.warehouse.auth.data.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByUsernameIgnoreCase(String username);

    Optional<UserEntity> findByBadgeHash(String badgeHash);

    Optional<UserEntity> findByOperatorBadgeId(String operatorBadgeId);

    Optional<UserEntity> findBySsoProviderAndSsoExternalId(String ssoProvider, String ssoExternalId);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT u FROM UserEntity u LEFT JOIN FETCH u.roles r LEFT JOIN FETCH r.permissions WHERE LOWER(u.username) = LOWER(:username) AND u.isDeleted = false")
    Optional<UserEntity> findByUsernameWithRolesAndPermissions(@Param("username") String username);
}
