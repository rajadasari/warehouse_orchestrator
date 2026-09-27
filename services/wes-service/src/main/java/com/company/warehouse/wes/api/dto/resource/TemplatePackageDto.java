package com.company.warehouse.wes.api.dto.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;

/**
 * Portable self-contained bundle for moving templates between environments (Dev -> Staging -> Prod).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplatePackageDto implements Serializable {

    @Builder.Default
    private String schemaVersion = "1.0.0";

    @Builder.Default
    private String environment = "DEVELOPMENT";

    private String exportedBy;

    @Builder.Default
    private Instant exportedAt = Instant.now();

    private List<ResourceTemplateDto> templates;
}
