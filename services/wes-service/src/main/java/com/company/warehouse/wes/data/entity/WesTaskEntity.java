package com.company.warehouse.wes.data.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "wes_task", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WesTaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "task_number", nullable = false, unique = true, length = 60)
    private String taskNumber;

    @Builder.Default
    @Column(name = "task_type", nullable = false, length = 40)
    private String taskType = "INBOUND_PUTAWAY";

    @Column(name = "pallet_lpn", nullable = false, length = 60)
    private String palletLpn;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "CREATED";

    @Builder.Default
    @Column(name = "current_operation_seq", nullable = false)
    private int currentOperationSeq = 1;

    @Column(name = "source_location", nullable = false, length = 100)
    private String sourceLocation;

    @Column(name = "allocated_location", length = 100)
    private String allocatedLocation;

    @Builder.Default
    @Column(name = "submitted_by", nullable = false, length = 80)
    private String submittedBy = "OPERATOR";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_attributes", nullable = false, columnDefinition = "jsonb")
    private String customAttributes = "{}";

    @Builder.Default
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("sequence ASC")
    private List<TaskOperationEntity> operations = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
