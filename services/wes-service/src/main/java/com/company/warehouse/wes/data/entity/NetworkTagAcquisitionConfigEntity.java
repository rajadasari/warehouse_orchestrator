package com.company.warehouse.wes.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "network_tag_acquisition_config", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NetworkTagAcquisitionConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tag_id", nullable = false, unique = true)
    private UUID tagId;

    @Builder.Default
    @Column(name = "acquisition_method", nullable = false, length = 40)
    private String acquisitionMethod = "SUBSCRIPTION";

    @Builder.Default
    @Column(name = "sampling_interval_ms", nullable = false)
    private Integer samplingIntervalMs = 250;

    @Builder.Default
    @Column(name = "publishing_interval_ms", nullable = false)
    private Integer publishingIntervalMs = 500;

    @Builder.Default
    @Column(name = "deadband_value", nullable = false)
    private Double deadbandValue = 0.0;

    @Builder.Default
    @Column(name = "is_logging_enabled", nullable = false)
    private Boolean isLoggingEnabled = false;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
