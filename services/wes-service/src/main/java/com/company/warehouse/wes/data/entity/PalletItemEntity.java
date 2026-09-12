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
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "pallet_item", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PalletItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pallet_id", nullable = false)
    private PalletEntity pallet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id")
    private ItemMasterEntity item;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sku_id")
    private SkuMasterEntity sku;

    @Builder.Default
    @Column(name = "package_count", nullable = false)
    private int packageCount = 1;

    @Column(name = "total_quantity", nullable = false, precision = 12, scale = 4)
    private BigDecimal totalQuantity;

    @Column(name = "lot_number", length = 60)
    private String lotNumber;

    @Column(name = "serial_number", length = 60)
    private String serialNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

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
