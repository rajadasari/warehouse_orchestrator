package com.company.warehouse.wes.api.dto.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class DatabaseConfigDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrentConfigResponse {
        private String host;
        private int port;
        private String databaseName;
        private String username;
        private String currentSchema;
        private String sslMode;
        private int maxPoolSize;
        private int minIdle;
        private String jdbcUrl;
        private boolean isConnected;
        private long responseTimeMs;
        private String serverVersion;
        private String driverVersion;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TestConnectionRequest {
        private String host;
        private int port;
        private String databaseName;
        private String username;
        private String password;
        private String currentSchema;
        private String sslMode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TestConnectionResponse {
        private boolean success;
        private long responseTimeMs;
        private String serverVersion;
        private String currentDatabase;
        private String currentUser;
        private int platformTableCount;
        private List<String> existingSchemas;
        private String message;
        private String errorDetails;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateConfigRequest {
        private String host;
        private int port;
        private String databaseName;
        private String username;
        private String password;
        private String currentSchema;
        private String sslMode;
        private Integer maxPoolSize;
        private Integer minIdle;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateConfigResponse {
        private boolean success;
        private String message;
        private String targetConfigFile;
        private boolean requiresRestart;
    }
}
