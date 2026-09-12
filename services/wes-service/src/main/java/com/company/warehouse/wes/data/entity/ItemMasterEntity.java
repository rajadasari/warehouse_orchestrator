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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "item_master", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemMasterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "item_code", nullable = false, unique = true, length = 60)
    private String itemCode;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Builder.Default
    @Column(name = "item_type", nullable = false, length = 40)
    private String itemType = "RAW_MATERIAL";

    @Column(name = "base_uom", nullable = false, length = 20)
    private String baseUom;

    @Builder.Default
    @Column(name = "allow_mixed_pallet", nullable = false)
    private boolean allowMixedPallet = true;

    @Column(name = "mixed_pallet_group", length = 50)
    private String mixedPalletGroup;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

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
