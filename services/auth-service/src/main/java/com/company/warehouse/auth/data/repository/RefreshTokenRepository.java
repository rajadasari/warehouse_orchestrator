package com.company.warehouse.auth.data.repository;

import com.company.warehouse.auth.data.entity.RefreshTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshTokenEntity t SET t.isRevoked = true, t.revokedAt = :revokedAt, t.revokedReason = :reason WHERE t.user.userId = :userId AND t.isRevoked = false")
    int revokeAllUserTokens(@Param("userId") UUID userId, @Param("revokedAt") Instant revokedAt, @Param("reason") String reason);
}
