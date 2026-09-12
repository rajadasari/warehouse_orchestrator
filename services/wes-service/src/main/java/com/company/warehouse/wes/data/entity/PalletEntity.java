package com.company.warehouse.wes.data.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pallet", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PalletEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "pallet_lpn", nullable = false, unique = true, length = 60)
    private String palletLpn;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pallet_handling_strategy_id")
    private PalletHandlingStrategyEntity handlingStrategy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pallet_type_id", nullable = false)
    private PalletTypeMasterEntity palletType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id")
    private ItemMasterEntity item;

    @Builder.Default
    @Column(name = "load_type", nullable = false, length = 30)
    private String loadType = "MATERIAL_WITH_SKU";

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "CREATED";

    @Column(name = "current_location", length = 100)
    private String currentLocation;

    @Builder.Default
    @Column(name = "is_mixed_pallet", nullable = false)
    private boolean isMixedPallet = false;

    @Column(name = "actual_weight_kg", precision = 10, scale = 2)
    private BigDecimal actualWeightKg;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_attributes", nullable = false, columnDefinition = "jsonb")
    private String customAttributes = "{}";

    @Builder.Default
    @OneToMany(mappedBy = "pallet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<PalletItemEntity> items = new ArrayList<>();

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
