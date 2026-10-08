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
@Table(name = "resource", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "resource_id", nullable = false, unique = true, length = 100)
    private String resourceId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "type", nullable = false, length = 50)
    private String type; // e.g. 'SOFTWARE', 'HARDWARE', 'EQUIPMENT', 'PLC', 'WMS'

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    @Builder.Default
    @Column(name = "category", nullable = false, length = 30)
    private String category = "GENERAL";

    @Column(name = "template_code", length = 60)
    private String templateCode;

    @Column(name = "description", length = 500)
    private String description;

    /**
     * @deprecated Legacy field. Industrial connection parameters are managed via OT Gateway and customProperties.
     */
    @Deprecated
    @Builder.Default
    @Column(name = "application", nullable = false, length = 100)
    private String application = "WMS";

    /**
     * @deprecated Legacy field. Digital twins are protocol-free; protocol/gateway mapping belongs to NetworkChannel.
     */
    @Deprecated
    @Column(name = "protocol", length = 30)
    private String protocol;

    /**
     * @deprecated Legacy field. Physical/network endpoint coordinates reside in NetworkChannel or customProperties.
     */
    @Deprecated
    @Column(name = "host", length = 255)
    private String host;

    /**
     * @deprecated Legacy field. Physical/network endpoint coordinates reside in NetworkChannel or customProperties.
     */
    @Deprecated
    @Column(name = "port")
    private Integer port;

    @Column(name = "documentation_url", length = 500)
    private String documentationUrl;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "template_properties", nullable = false, columnDefinition = "jsonb")
    private String templateProperties = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_properties", nullable = false, columnDefinition = "jsonb")
    private String customProperties = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "methods_config", nullable = false, columnDefinition = "jsonb")
    private String methodsConfig = "{}";

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
