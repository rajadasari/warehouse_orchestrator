package com.company.warehouse.wcs.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "opcua_tag_mapping", schema = "wcs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpcUaTagMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tag_key", nullable = false, unique = true, length = 64)
    private String tagKey;

    @Column(name = "node_id", nullable = false)
    private String nodeId;

    @Column(name = "data_type", nullable = false, length = 32)
    @Builder.Default
    private String dataType = "STRING";

    @Column(name = "access_level", nullable = false, length = 16)
    @Builder.Default
    private String accessLevel = "READ_WRITE";

    @Column(name = "equipment_code", length = 64)
    private String equipmentCode;

    @Column(name = "client_code", length = 64)
    private String clientCode;

    @Column(name = "server_code", length = 64)
    private String serverCode;

    @Column(name = "sampling_interval_ms", nullable = false)
    @Builder.Default
    private Double samplingIntervalMs = 250.0;

    @Column(name = "deadband", nullable = false)
    @Builder.Default
    private Double deadband = 0.0;

    @Column(name = "description")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
