package com.company.warehouse.wes.data.entity;

import jakarta.persistence.*;
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
@Table(name = "network_device_channel", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NetworkDeviceChannelEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "channel_code", nullable = false, unique = true, length = 80)
    private String channelCode;

    @Column(name = "channel_name", nullable = false, length = 120)
    private String channelName;

    @Builder.Default
    @Column(name = "device_type", nullable = false, length = 80)
    private String deviceType = "PLC";

    @Column(name = "protocol", nullable = false, length = 40)
    private String protocol; // OPC_UA, MODBUS_TCP, SIEMENS_S7, MQTT_SPARKPLUG, REST_HTTP

    @Column(name = "endpoint_url", nullable = false, length = 500)
    private String endpointUrl;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "ONLINE"; // ONLINE, STANDBY, FAULT, DISCONNECTED

    @Builder.Default
    @Column(name = "security_policy", length = 100)
    private String securityPolicy = "Basic256Sha256 - Sign & Encrypt";

    @Builder.Default
    @Column(name = "auth_type", length = 50)
    private String authType = "ANONYMOUS";

    @Builder.Default
    @Column(name = "tags_count")
    private Integer tagsCount = 0;

    @Builder.Default
    @Column(name = "latency_ms")
    private Double latencyMs = 3.5;

    @Builder.Default
    @Column(name = "session_timeout_ms")
    private Integer sessionTimeoutMs = 60000;

    @Builder.Default
    @Column(name = "reconnect_interval_ms")
    private Integer reconnectIntervalMs = 3000;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", nullable = false, columnDefinition = "jsonb")
    private String config = "{}";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
