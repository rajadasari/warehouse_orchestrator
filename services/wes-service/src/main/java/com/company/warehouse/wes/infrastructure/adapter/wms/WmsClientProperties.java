package com.company.warehouse.wes.infrastructure.adapter.wms;

import com.company.warehouse.common.client.software.client.ClientConnectionProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * WMS-specific connection and endpoint configuration.
 * Inherits base timeout and auth properties from the universal software client.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Configuration
@org.springframework.context.annotation.Primary
@ConfigurationProperties(prefix = "integration.wms")
public class WmsClientProperties extends ClientConnectionProperties {

    private Endpoints endpoints = new Endpoints();

    @Data
    public static class Endpoints {
        private String preAnnounce = "/api/v1/wms/pallets/pre-announce";
        private String createOrder = "/api/v1/wms/orders";
        private String reserveOrder = "/api/v1/wms/orders/{orderId}/reserve";
        private String outboundRelease = "/api/v1/wms/orders/{orderId}/outbound-release";
    }
}
