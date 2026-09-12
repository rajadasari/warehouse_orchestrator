package com.company.warehouse.wes.infrastructure.client.wms.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "integration.wms")
public class WmsClientProperties {

    private boolean enabled = true;
    private String baseUrl = "http://localhost:8089";
    private String clientId = "wes-service-client";
    private String clientSecret = "secret";
    private String tokenPath = "/WMS.Api/api/authentication";
    private String targetResourceId = "LOGIQS-AMBIENT-WMS";

    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 10000;

    private Endpoints endpoints = new Endpoints();

    @Data
    public static class Endpoints {
        private String preAnnounce = "/api/v1/wms/pallets/pre-announce";
        private String createOrder = "/api/v1/wms/orders";
        private String reserveOrder = "/api/v1/wms/orders/{orderId}/reserve";
        private String outboundRelease = "/api/v1/wms/orders/{orderId}/outbound-release";
    }
}
