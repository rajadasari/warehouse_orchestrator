package com.company.warehouse.wes.api.dto.resource;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceRelationshipDto implements Serializable {

    private UUID id;

    @NotBlank(message = "Source resource ID is required")
    private String sourceResourceId;

    @NotBlank(message = "Target resource ID is required")
    private String targetResourceId;

    @NotBlank(message = "Relation category is required (MATERIAL_FLOW, INFORMATION_FLOW)")
    private String relationCategory;

    @NotBlank(message = "Relation type is required (TRANSFERS_TO, DATA_SOURCE_FOR, CONTROLS, ATTACHED_TO, SERVICED_BY)")
    private String relationType;

    private Map<String, Object> properties;

    @Builder.Default
    private boolean active = true;

    private Instant createdAt;
    private Instant updatedAt;
}
