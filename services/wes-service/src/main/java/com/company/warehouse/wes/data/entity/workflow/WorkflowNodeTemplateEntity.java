package com.company.warehouse.wes.data.entity.workflow;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
@Table(name = "workflow_node_template", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowNodeTemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "template_code", nullable = false, unique = true, length = 80)
    private String templateCode;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "node_type", nullable = false, length = 40)
    private String nodeType;

    @Builder.Default
    @Column(name = "category", nullable = false, length = 40)
    private String category = "EQUIPMENT";

    @Builder.Default
    @Column(name = "icon", nullable = false, length = 60)
    private String icon = "Cpu";

    @Builder.Default
    @Column(name = "color", nullable = false, length = 40)
    private String color = "emerald";

    @Builder.Default
    @Column(name = "is_system", nullable = false)
    private boolean isSystem = false;

    @Column(name = "resource_code", length = 60)
    private String resourceCode;

    @Column(name = "target_method", length = 80)
    private String targetMethod;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", nullable = false, columnDefinition = "jsonb")
    private String configuration = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_schema", columnDefinition = "jsonb")
    private String inputSchema = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_schema", columnDefinition = "jsonb")
    private String outputSchema = "{}";

    @Builder.Default
    @Column(name = "created_by", length = 60)
    private String createdBy = "SYSTEM";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
