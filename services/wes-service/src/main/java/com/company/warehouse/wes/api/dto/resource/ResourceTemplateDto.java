package com.company.warehouse.wes.api.dto.resource;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceTemplateDto implements Serializable {

    private UUID id;

    @NotBlank(message = "Template code is required")
    private String templateCode;

    @NotBlank(message = "Template name is required")
    private String templateName;

    @NotBlank(message = "Category is required (PHYSICAL, SOFTWARE, VIRTUAL, LOGICAL)")
    private String category;

    @NotBlank(message = "Resource type is required (e.g. CONVEYOR, TURNTABLE, AGV, PLC, BIN_LOCATION, WMS_GATEWAY)")
    private String resourceType;

    @Deprecated
    private String communicationProtocol;

    @Deprecated
    private String communicationMethod;

    public String getCommunicationMethod() {
        return communicationMethod != null && !communicationMethod.isBlank() ? communicationMethod : communicationProtocol;
    }

    public void setCommunicationMethod(String method) {
        this.communicationMethod = method;
        this.communicationProtocol = method;
    }

    private String description;
    private String application;
    private String defaultProtocol;
    private String defaultHost;
    private Integer defaultPort;
    private String documentationUrl;
    private String responseTokenPropertyName;

    private List<Map<String, Object>> propertySchema;

    private Map<String, Object> defaultProperties;

    private List<String> supportedCommands;

    private List<Map<String, Object>> methodsSchema;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean systemTemplate = false;

    public boolean isSystemTemplate() {
        return systemTemplate;
    }

    public void setSystemTemplate(boolean systemTemplate) {
        this.systemTemplate = systemTemplate;
    }

    private Instant createdAt;
    private Instant updatedAt;
}
