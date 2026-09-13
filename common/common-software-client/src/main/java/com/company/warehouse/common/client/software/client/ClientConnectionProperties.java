package com.company.warehouse.common.client.software.client;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "integration.client")
public class ClientConnectionProperties {

    private boolean enabled = true;
    private String baseUrl = "http://localhost:8089";
    private String clientId = "software-client";
    private String clientSecret = "secret";
    private String tokenPath = "/api/authentication";
    private String tokenResponseField = "accessToken";
    private String targetResourceId = "DEFAULT-RESOURCE";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 10000;
}
