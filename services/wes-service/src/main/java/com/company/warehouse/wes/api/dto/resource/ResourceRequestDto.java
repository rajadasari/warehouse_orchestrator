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

    private String description;

    @Builder.Default
    private String application = "WMS";

    @Builder.Default
    private String protocol = "http";

    private String host;

    private Integer port;

    private String documentationUrl;

    /**
     * IP convenience field for backward compatibility.
     */
    private String ip;

    @Builder.Default
    private Map<String, Object> methodsConfig = new HashMap<>();

    @Builder.Default
    private Map<String, Object> customProperties = new HashMap<>();

    public String getResolvedHost() {
        if (host != null && !host.trim().isEmpty()) return host.trim();
        if (ip != null && !ip.trim().isEmpty()) return ip.trim();
        if (customProperties != null) {
            for (String k : new String[]{"ipAddress", "ip", "host", "plcIp", "baseUrl", "targetHost"}) {
                if (customProperties.containsKey(k) && customProperties.get(k) != null) {
                    String val = String.valueOf(customProperties.get(k)).trim();
                    if (!val.isEmpty()) return val;
                }
            }
        }
        return "127.0.0.1";
    }

    public Map<String, Object> getResolvedCustomProperties() {
        return customProperties != null ? new HashMap<>(customProperties) : new HashMap<>();
    }
}
