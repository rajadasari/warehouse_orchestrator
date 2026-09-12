package com.company.warehouse.wes.data.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_operation", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskOperationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private WesTaskEntity task;

    @Column(name = "sequence", nullable = false)
    private int sequence;

    @Column(name = "operation_type", nullable = false, length = 50)
    private String operationType;

    @Column(name = "handler_type", nullable = false, length = 40)
    private String handlerType; // 'WMS', 'WCS', 'OPERATOR', 'SYSTEM'

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING"; // 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_payload", nullable = false, columnDefinition = "jsonb")
    private String inputPayload = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_result", columnDefinition = "jsonb")
    private String outputResult;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
