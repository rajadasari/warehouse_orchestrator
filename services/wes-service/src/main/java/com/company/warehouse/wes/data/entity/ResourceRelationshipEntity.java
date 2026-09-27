package com.company.warehouse.wes.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(
    name = "resource_relationship", 
    schema = "wo",
    uniqueConstraints = @UniqueConstraint(name = "uq_resource_relationship", columnNames = {"source_resource_id", "target_resource_id", "relation_type"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceRelationshipEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "source_resource_id", nullable = false, length = 100)
    private String sourceResourceId;

    @Column(name = "target_resource_id", nullable = false, length = 100)
    private String targetResourceId;

    @Column(name = "relation_category", nullable = false, length = 30)
    private String relationCategory; // 'MATERIAL_FLOW', 'INFORMATION_FLOW'

    @Column(name = "relation_type", nullable = false, length = 50)
    private String relationType; // 'TRANSFERS_TO', 'DATA_SOURCE_FOR', 'CONTROLS', 'ATTACHED_TO', 'SERVICED_BY'

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "properties", nullable = false, columnDefinition = "jsonb")
    private String properties = "{}";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

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
