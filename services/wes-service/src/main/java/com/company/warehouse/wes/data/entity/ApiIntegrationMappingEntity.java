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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "api_integration_mapping", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiIntegrationMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "mapping_code", nullable = false, unique = true, length = 80)
    private String mappingCode;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "operation_type", nullable = false, length = 50)
    private String operationType;

    @Column(name = "target_resource_id", nullable = false, length = 100)
    private String targetResourceId;

    @Builder.Default
    @Column(name = "http_method", nullable = false, length = 10)
    private String httpMethod = "POST";

    @Column(name = "endpoint_url", nullable = false, length = 255)
    private String endpointUrl;

    @Builder.Default
    @Column(name = "headers_template", columnDefinition = "TEXT", nullable = false)
    private String headersTemplate = "{\"Content-Type\": \"application/json\"}";

    @Builder.Default
    @Column(name = "payload_template", columnDefinition = "TEXT", nullable = false)
    private String payloadTemplate = "{}";

    @Builder.Default
    @Column(name = "condition_rules", columnDefinition = "TEXT", nullable = false)
    private String conditionRules = "[]";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Version
    @Builder.Default
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
