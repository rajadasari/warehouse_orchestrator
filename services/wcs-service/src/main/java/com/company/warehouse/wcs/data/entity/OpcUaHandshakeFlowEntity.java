package com.company.warehouse.wcs.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "opcua_handshake_flow", schema = "wcs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpcUaHandshakeFlowEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "flow_code", nullable = false, unique = true, length = 64)
    private String flowCode;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "equipment_code", length = 64)
    private String equipmentCode;

    @Column(name = "client_code", length = 64)
    private String clientCode;

    @Column(name = "steps_json", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String stepsJson = "[]";

    @Column(name = "timeout_ms", nullable = false)
    @Builder.Default
    private Long timeoutMs = 5000L;

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
