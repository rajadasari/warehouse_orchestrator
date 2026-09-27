package com.company.warehouse.wes.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "integration_session", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntegrationSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "correlation_key", nullable = false, unique = true, length = 100)
    private String correlationKey;

    @Column(name = "channel_code", nullable = false, length = 60)
    private String channelCode;

    @Builder.Default
    @Column(name = "direction", nullable = false, length = 20)
    private String direction = "INGRESS";

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "PENDING";

    @Column(name = "raw_payload", columnDefinition = "text")
    private String rawPayload;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "canonical_data", nullable = false, columnDefinition = "jsonb")
    private String canonicalData = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_results", nullable = false, columnDefinition = "jsonb")
    private String validationResults = "[]";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "handshake_data", nullable = false, columnDefinition = "jsonb")
    private String handshakeData = "{}";

    @Column(name = "error_details", columnDefinition = "text")
    private String errorDetails;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
