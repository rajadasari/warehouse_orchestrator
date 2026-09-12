package com.company.warehouse.wes.business.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

/**
 * Encapsulates resolved connection endpoint details and security credentials
 * for an external or internal system resource (e.g. WMS, WCS, PLC, ERP).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceConnectionConfig {

    private String resourceId;
    private String name;
    private String type;
    private String status;

    private String protocol; // 'http' or 'https'
    private String ip;
    private Integer port;
    private String basePath;
    private String clientId;
    private String clientSecret;

    @Builder.Default
    private Map<String, Object> customProperties = Collections.emptyMap();

    /**
     * Constructs standard HTTP/HTTPS Base URL (e.g. "http://192.168.1.100:8089").
     */
    public String getBaseUrl(String fallbackUrl) {
        if (ip == null || ip.trim().isEmpty()) {
            return fallbackUrl;
        }

        String scheme = (protocol != null && !protocol.trim().isEmpty()) ? protocol.trim() : "http";
        String host = ip.trim();
        if (host.startsWith("http://") || host.startsWith("https://")) {
            return host;
        }

        if (port != null && port > 0 && port != 80 && port != 443) {
            return scheme + "://" + host + ":" + port;
        }
        return scheme + "://" + host;
    }

    public Optional<String> getOptionalClientId() {
        return Optional.ofNullable(clientId).filter(s -> !s.trim().isEmpty());
    }

    public Optional<String> getOptionalClientSecret() {
        return Optional.ofNullable(clientSecret).filter(s -> !s.trim().isEmpty());
    }
}
