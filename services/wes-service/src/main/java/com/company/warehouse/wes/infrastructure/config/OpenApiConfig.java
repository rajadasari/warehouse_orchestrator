package com.company.warehouse.wes.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI wesOpenAPI(@Value("${server.port:8086}") String serverPort) {
        return new OpenAPI()
                .info(new Info()
                        .title("Warehouse Orchestrator & Execution System (WES) API")
                        .description("REST & Dynamic Integration APIs for Warehouse Master Data, Resource Management, Pallet Tracking, and Dynamic WMS Payload Engine.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Warehouse Orchestrator Engineering Team")
                                .email("engineering@warehouse.company.com"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://company.com/licenses")))
                .servers(List.of(
                        new Server().url("http://localhost:" + serverPort).description("Direct Backend Server (Port " + serverPort + ")"),
                        new Server().url("http://localhost:5173").description("Vite UI Reverse Proxy (Port 5173)")
                ));
    }
}
