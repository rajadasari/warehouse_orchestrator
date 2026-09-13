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

    @NotBlank(message = "Category is required (HARDWARE, DEVICE, SOFTWARE)")
    private String category;

    @NotBlank(message = "Resource type is required (e.g. CONVEYOR, TURNTABLE, WEIGH_SCALE, WMS_REST)")
    private String resourceType;

    @NotBlank(message = "Communication protocol is required (PLC_S7, MODBUS_TCP, TCP_SOCKET, REST, GRPC)")
    private String communicationProtocol;

    private List<Map<String, Object>> propertySchema;

    private Map<String, Object> defaultProperties;

    private List<String> supportedCommands;

    @Builder.Default
    private boolean active = true;

    private Instant createdAt;
    private Instant updatedAt;
}
