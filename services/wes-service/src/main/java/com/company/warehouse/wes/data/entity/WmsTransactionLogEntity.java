package com.company.warehouse.wes.data.entity;

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
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wms_transaction_log", schema = "wes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WmsTransactionLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "transaction_type", nullable = false, length = 40)
    private String transactionType; // 'PRE_ANNOUNCE', 'CREATE_ORDER', 'RESERVE_ORDER', 'OUTBOUND_RELEASE'

    @Column(name = "pallet_lpn", length = 60)
    private String palletLpn;

    @Column(name = "order_reference", length = 80)
    private String orderReference;

    @Column(name = "wms_reference_id", length = 100)
    private String wmsReferenceId; // PreAnnounceId, WmsOrderId, ReservationId

    @Column(name = "status", nullable = false, length = 30)
    private String status; // 'SUCCESS', 'FAILED', 'SIMULATED'

    @Column(name = "details", length = 500)
    private String details;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    private String payload = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_payload", columnDefinition = "jsonb")
    private String responsePayload = "{}";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
