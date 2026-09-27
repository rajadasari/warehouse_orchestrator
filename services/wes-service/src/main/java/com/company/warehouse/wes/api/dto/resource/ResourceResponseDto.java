package com.company.warehouse.wes.api.dto.resource;

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
public class ResourceResponseDto implements Serializable {

    private UUID id;
    private String resourceId;
    private String name;
    private String type;
    private String category;
    private String templateCode;
    private String status;
    private String description;
    private String application;
    private String protocol;
    private String host;
    private Integer port;
    private String documentationUrl;
    private String ip;
    private Map<String, Object> templateProperties;
    private Map<String, Object> customProperties;
    private Map<String, Object> effectiveProperties;
    private Map<String, Object> methodsConfig;
    private Object effectiveMethods;
    private Instant createdAt;
    private Instant updatedAt;
}
