package com.company.warehouse.wes.api.dto.integration;

import com.company.warehouse.common.client.software.integration.handshake.HandshakeConfig;
import com.company.warehouse.common.client.software.integration.mapping.FieldMappingRule;
import com.company.warehouse.common.client.software.integration.rules.ValidationRule;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for creating, updating, and exporting Integration Channel configurations.
 * Designed for programmatic AI and administrative configuration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationChannelDto implements Serializable {

    private UUID id;

    @NotBlank(message = "channelCode is mandatory")
    private String channelCode;

    @NotBlank(message = "channelName is mandatory")
    private String channelName;

    @Builder.Default
    private String direction = "INGRESS"; // INGRESS, EGRESS, BIDIRECTIONAL

    @Builder.Default
    private String domain = "INBOUND"; // INBOUND, OUTBOUND, INTERNAL_TRANSFER, INVENTORY, EQUIPMENT

    @Builder.Default
    private String payloadFormat = "AUTO"; // AUTO, XML, JSON

    private List<FieldMappingRule> mappingRules;

    private List<ValidationRule> validationRules;

    private HandshakeConfig handshakeConfig;

    @Builder.Default
    private String defaultSuccessState = "ACCEPTED";

    private String workflowCode;

    @Builder.Default
    private boolean active = true;

    private Instant createdAt;
    private Instant updatedAt;
}
