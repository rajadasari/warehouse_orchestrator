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
@Table(name = "integration_channel", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntegrationChannelEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "channel_code", nullable = false, unique = true, length = 60)
    private String channelCode;

    @Column(name = "channel_name", nullable = false, length = 120)
    private String channelName;

    @Builder.Default
    @Column(name = "direction", nullable = false, length = 20)
    private String direction = "INGRESS"; // INGRESS, EGRESS, BIDIRECTIONAL

    @Builder.Default
    @Column(name = "domain", nullable = false, length = 40)
    private String domain = "INBOUND"; // INBOUND, OUTBOUND, INTERNAL_TRANSFER, INVENTORY, EQUIPMENT

    @Builder.Default
    @Column(name = "payload_format", nullable = false, length = 20)
    private String payloadFormat = "AUTO"; // AUTO, XML, JSON

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "mapping_rules", nullable = false, columnDefinition = "jsonb")
    private String mappingRules = "[]";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", nullable = false, columnDefinition = "jsonb")
    private String validationRules = "[]";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "handshake_config", nullable = false, columnDefinition = "jsonb")
    private String handshakeConfig = "{}";

    @Builder.Default
    @Column(name = "default_success_state", nullable = false, length = 40)
    private String defaultSuccessState = "ACCEPTED";

    @Column(name = "workflow_code", length = 60)
    private String workflowCode;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
