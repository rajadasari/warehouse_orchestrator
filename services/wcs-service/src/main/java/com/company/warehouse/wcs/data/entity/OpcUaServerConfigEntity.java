package com.company.warehouse.wcs.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "opcua_server_config", schema = "wcs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpcUaServerConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "server_code", nullable = false, unique = true, length = 64)
    private String serverCode;

    @Column(name = "bind_port", nullable = false)
    @Builder.Default
    private Integer bindPort = 4840;

    @Column(name = "endpoint_path", nullable = false, length = 128)
    @Builder.Default
    private String endpointPath = "/wcs/opcua";

    @Column(name = "namespace_uri", nullable = false)
    @Builder.Default
    private String namespaceUri = "urn:company:warehouse:wcs";

    @Column(name = "supported_security_policies")
    @Builder.Default
    private String supportedSecurityPolicies = "NONE,BASIC256_SHA256";

    @Column(name = "supported_auth_types")
    @Builder.Default
    private String supportedAuthTypes = "ANONYMOUS,USERNAME_PASSWORD";

    @Column(name = "auto_start", nullable = false)
    @Builder.Default
    private boolean autoStart = true;

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
