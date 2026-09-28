package com.company.warehouse.wes.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted condition predicate for a functional support rule.
 * Maps: sourceNodeId [operator] thresholdValue.
 */
@Entity
@Table(name = "functional_rule_condition", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FunctionalRuleConditionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "rule_id", nullable = false)
    private UUID ruleId;

    @Builder.Default
    @Column(name = "condition_order", nullable = false)
    private Integer conditionOrder = 0;

    @Column(name = "source_node_id", nullable = false, length = 300)
    private String sourceNodeId;

    @Column(name = "operator", nullable = false, length = 30)
    private String operator;

    @Column(name = "threshold_value", nullable = false, length = 500)
    private String thresholdValue;

    @Builder.Default
    @Column(name = "threshold_data_type", nullable = false, length = 20)
    private String thresholdDataType = "STRING";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
