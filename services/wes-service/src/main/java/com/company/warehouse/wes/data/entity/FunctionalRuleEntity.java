package com.company.warehouse.wes.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted functional support rule definition.
 * Links to a network device channel and stores the rule topology and reactive execution mode.
 */
@Entity
@Table(name = "functional_rule", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FunctionalRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Column(name = "rule_name", nullable = false, length = 120)
    private String ruleName;

    @Builder.Default
    @Column(name = "topology", nullable = false, length = 40)
    private String topology = "SINGLE_READ_SINGLE_WRITE";

    @Builder.Default
    @Column(name = "is_reactive", nullable = false)
    private Boolean isReactive = false;

    @Builder.Default
    @Column(name = "execution_mode", nullable = false, length = 30)
    private String executionMode = "CONTINUOUS";

    @Builder.Default
    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "last_executed_at")
    private Instant lastExecutedAt;

    @Column(name = "last_execution_status", length = 30)
    private String lastExecutionStatus;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
