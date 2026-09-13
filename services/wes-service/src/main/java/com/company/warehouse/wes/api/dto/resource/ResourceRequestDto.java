package com.company.warehouse.wes.api.dto.resource;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceRequestDto {

    @NotBlank(message = "Resource ID is required")
    private String resourceId; // e.g. "LOGIQS-AMBIENT-WMS"

    @NotBlank(message = "Resource name is required")
    private String name;       // e.g. "Logiqs Ambient WMS"

    @NotBlank(message = "Resource type is required")
    private String type;       // e.g. "Software", "Hardware", "PLC", "WMS"

    @Builder.Default
    private String category = "SOFTWARE"; // "HARDWARE", "DEVICE", "SOFTWARE"

    private String templateCode;

    @Builder.Default
    private Map<String, Object> templateProperties = new HashMap<>();

    @Builder.Default
    private String status = "ACTIVE";

    /**
     * Direct IP convenience field. If provided, automatically mapped into customProperties["ip"].
     */
    private String ip;

    @Builder.Default
    private Map<String, Object> customProperties = new HashMap<>();

    public Map<String, Object> getResolvedCustomProperties() {
        Map<String, Object> props = customProperties != null ? new HashMap<>(customProperties) : new HashMap<>();
        if (ip != null && !ip.trim().isEmpty() && !props.containsKey("ip")) {
            props.put("ip", ip.trim());
        }
        return props;
    }
}
