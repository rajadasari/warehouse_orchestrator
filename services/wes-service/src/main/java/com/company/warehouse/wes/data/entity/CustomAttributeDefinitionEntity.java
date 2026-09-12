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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "custom_attribute_definition", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomAttributeDefinitionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "target_entity", nullable = false, length = 30)
    private String targetEntity;

    @Column(name = "attribute_code", nullable = false, length = 50)
    private String attributeCode;

    @Column(name = "label", nullable = false, length = 100)
    private String label;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "data_type", nullable = false, length = 30)
    private String dataType;

    @Column(name = "unit_of_measure", length = 20)
    private String unitOfMeasure;

    @Builder.Default
    @Column(name = "applies_to_category", nullable = false, length = 50)
    private String appliesToCategory = "ALL";

    @Builder.Default
    @Column(name = "is_required", nullable = false)
    private boolean isRequired = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_value", columnDefinition = "jsonb")
    private String defaultValue;

    @Column(name = "min_value", precision = 15, scale = 4)
    private BigDecimal minValue;

    @Column(name = "max_value", precision = 15, scale = 4)
    private BigDecimal maxValue;

    @Column(name = "validation_regex", length = 255)
    private String validationRegex;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_options", columnDefinition = "jsonb")
    private String allowedOptions;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

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
