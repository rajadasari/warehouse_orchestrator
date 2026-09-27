package com.company.warehouse.wes.business.resource.composer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Basic identity, categorization, and physical/logical network coordinates for an Entity Template or Instance.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityBasicInfo implements Serializable {

    private String templateCode;

    private String templateName;

    @Builder.Default
    private String category = "SOFTWARE"; // 'SOFTWARE', 'HARDWARE', 'DEVICE'

    @Builder.Default
    private String resourceType = "REST_GENERIC";

    @Builder.Default
    private String communicationProtocol = "REST";

    private String description;

    @Builder.Default
    private String application = "GENERIC_REST_APP";

    @Builder.Default
    private String defaultProtocol = "http";

    @Builder.Default
    private String defaultHost = "127.0.0.1";

    @Builder.Default
    private int defaultPort = 8080;

    private String documentationUrl;

    @Builder.Default
    private boolean active = true;
}
