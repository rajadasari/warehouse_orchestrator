package com.company.warehouse.auth.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dual_approval_audit", schema = "auth")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DualApprovalAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "approval_id", updatable = false, nullable = false)
    private UUID approvalId;

    @Column(name = "action_name", nullable = false, length = 128)
    private String actionName;

    @Column(name = "target_resource", nullable = false, length = 128)
    private String targetResource;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_user_id", nullable = false)
    private UserEntity operator;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supervisor_user_id", nullable = false)
    private UserEntity supervisor;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "terminal_ip", nullable = false, length = 45)
    private String terminalIp;

    @Builder.Default
    @Column(name = "supervisor_auth_method", nullable = false, length = 32)
    private String supervisorAuthMethod = "RFID_PIN";

    @CreationTimestamp
    @Column(name = "approved_at", nullable = false, updatable = false)
    private Instant approvedAt;
}
