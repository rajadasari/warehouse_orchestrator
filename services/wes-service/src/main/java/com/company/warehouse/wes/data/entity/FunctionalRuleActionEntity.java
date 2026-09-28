package com.company.warehouse.wes.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted write action for a functional support rule.
 * Maps: targetNodeId ← writeValue when all conditions pass.
 */
@Entity
@Table(name = "functional_rule_action", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FunctionalRuleActionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "rule_id", nullable = false)
    private UUID ruleId;

    @Builder.Default
    @Column(name = "action_order", nullable = false)
    private Integer actionOrder = 0;

    @Column(name = "target_node_id", nullable = false, length = 300)
    private String targetNodeId;

    @Column(name = "write_value", nullable = false, length = 500)
    private String writeValue;

    @Builder.Default
    @Column(name = "write_data_type", nullable = false, length = 20)
    private String writeDataType = "STRING";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
