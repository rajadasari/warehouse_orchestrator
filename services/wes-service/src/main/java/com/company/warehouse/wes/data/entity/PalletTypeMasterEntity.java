package com.company.warehouse.wes.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pallet_type_master", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PalletTypeMasterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Builder.Default
    @Column(name = "material", nullable = false, length = 30)
    private String material = "WOOD";

    @Column(name = "tare_weight_kg", nullable = false, precision = 10, scale = 3)
    private BigDecimal tareWeightKg;

    @Column(name = "length_mm", nullable = false, precision = 10, scale = 2)
    private BigDecimal lengthMm;

    @Column(name = "width_mm", nullable = false, precision = 10, scale = 2)
    private BigDecimal widthMm;

    @Column(name = "height_mm", nullable = false, precision = 10, scale = 2)
    private BigDecimal heightMm;

    @Column(name = "max_payload_kg", nullable = false, precision = 10, scale = 3)
    private BigDecimal maxPayloadKg;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
