package com.company.warehouse.wcs.data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "opcua_station_template", schema = "wcs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpcUaStationTemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_code", nullable = false, unique = true, length = 64)
    private String templateCode;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "relative_tags_json", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String relativeTagsJson = "[]";

    @Column(name = "sequence_steps_json", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String sequenceStepsJson = "[]";

    @Column(name = "output_variable", nullable = false, length = 64)
    @Builder.Default
    private String outputVariable = "stationResult";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
