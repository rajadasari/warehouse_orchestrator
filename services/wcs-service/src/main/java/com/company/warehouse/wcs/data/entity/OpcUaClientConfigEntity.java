package com.company.warehouse.wcs.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "opcua_client_config", schema = "wcs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpcUaClientConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "client_code", nullable = false, unique = true, length = 64)
    private String clientCode;

    @Column(name = "endpoint_url", nullable = false)
    private String endpointUrl;

    @Column(name = "security_policy", nullable = false, length = 32)
    @Builder.Default
    private String securityPolicy = "NONE";

    @Column(name = "auth_type", nullable = false, length = 32)
    @Builder.Default
    private String authType = "ANONYMOUS";

    @Column(name = "username", length = 64)
    private String username;

    @Column(name = "password_encrypted")
    private String passwordEncrypted;

    @Column(name = "keystore_path")
    private String keystorePath;

    @Column(name = "certificate_alias", length = 64)
    private String certificateAlias;

    @Column(name = "request_timeout_ms", nullable = false)
    @Builder.Default
    private Long requestTimeoutMs = 5000L;

    @Column(name = "session_timeout_ms", nullable = false)
    @Builder.Default
    private Long sessionTimeoutMs = 60000L;

    @Column(name = "reconnect_interval_ms", nullable = false)
    @Builder.Default
    private Long reconnectIntervalMs = 3000L;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
