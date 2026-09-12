package com.company.warehouse.wes.data.entity;

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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pallet_process_log", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PalletProcessLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pallet_id", nullable = false)
    private PalletEntity pallet;

    @Column(name = "pallet_lpn", nullable = false, length = 60)
    private String palletLpn;

    @Column(name = "process_stage", nullable = false, length = 10)
    private String processStage;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "status", length = 30)
    private String status;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "properties_snapshot", nullable = false, columnDefinition = "jsonb")
    private String propertiesSnapshot = "{}";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
