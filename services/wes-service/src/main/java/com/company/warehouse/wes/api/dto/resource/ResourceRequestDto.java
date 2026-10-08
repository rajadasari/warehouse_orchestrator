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

    private String type;       // Inherited automatically from template (e.g. "INDUSTRIAL_NODE", "REST_GENERIC")

    private String category;   // Inherited automatically from template (e.g. "OT_DEVICE", "SOFTWARE", "GENERAL")

    private String templateCode;

    @Builder.Default
    private Map<String, Object> templateProperties = new HashMap<>();

    @Builder.Default
    private String status = "ACTIVE";

    private String description;

    @Builder.Default
    private String application = "WMS";

    private String protocol;

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
        // Only fallback to 127.0.0.1 if a network protocol is specified; standalone twins have null host
        if (protocol != null && !protocol.isBlank()) {
            return "127.0.0.1";
        }
        return null;
    }

    public Map<String, Object> getResolvedCustomProperties() {
        return customProperties != null ? new HashMap<>(customProperties) : new HashMap<>();
    }
}
