package com.company.warehouse.wes.data.entity;

import jakarta.persistence.*;
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
@Table(name = "network_device_tag", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NetworkDeviceTagEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Column(name = "tag_name", nullable = false, length = 120)
    private String tagName;

    @Column(name = "node_id", nullable = false, length = 250)
    private String nodeId;

    @Builder.Default
    @Column(name = "folder_path", nullable = false, length = 120)
    private String folderPath = "Root";

    @Builder.Default
    @Column(name = "data_type", nullable = false, length = 50)
    private String dataType = "String";

    @Builder.Default
    @Column(name = "quality", nullable = false, length = 50)
    private String quality = "GOOD (0x00000000)";

    @Column(name = "current_value", columnDefinition = "text")
    private String currentValue;

    @Builder.Default
    @Column(name = "is_writable", nullable = false)
    private Boolean isWritable = true;

    @Builder.Default
    @Column(name = "is_subscribed", nullable = false)
    private Boolean isSubscribed = true;

    @Builder.Default
    @Column(name = "last_updated", nullable = false)
    private Instant lastUpdated = Instant.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
