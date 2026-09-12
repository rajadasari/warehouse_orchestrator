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
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pallet_handling_strategy", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PalletHandlingStrategyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "strategy_code", nullable = false, unique = true, length = 60)
    private String strategyCode;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false)
    private ItemMasterEntity item;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sku_id", nullable = false)
    private SkuMasterEntity sku;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pallet_type_id", nullable = false)
    private PalletTypeMasterEntity palletType;

    @Column(name = "full_layer_qty", nullable = false)
    private int fullLayerQty;

    @Column(name = "max_layers", nullable = false)
    private int maxLayers;

    @Column(name = "standard_package_count", nullable = false)
    private int standardPackageCount;

    @Column(name = "standard_total_quantity", nullable = false, precision = 12, scale = 4)
    private BigDecimal standardTotalQuantity;

    @Column(name = "expected_total_weight_kg", precision = 10, scale = 2)
    private BigDecimal expectedTotalWeightKg;

    @Column(name = "expected_height_mm", precision = 10, scale = 2)
    private BigDecimal expectedHeightMm;

    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private boolean isDefault = true;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_attributes", nullable = false, columnDefinition = "jsonb")
    private String customAttributes = "{}";

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
