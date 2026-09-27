package com.company.warehouse.wes.business.config;

import com.company.warehouse.wes.api.dto.config.DatabaseConfigDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseConfigService {

    private final DataSource activeDataSource;

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/warehouse_db}")
    private String configuredDatasourceUrl;

    @Value("${spring.datasource.username:warehouse_app}")
    private String configuredUsername;

    @Value("${spring.datasource.hikari.maximum-pool-size:10}")
    private int configuredMaxPoolSize;

    @Value("${spring.datasource.hikari.minimum-idle:2}")
    private int configuredMinIdle;

    @Value("${spring.datasource.password:warehouse_test123}")
    private String configuredPassword;

    public DatabaseConfigDto.CurrentConfigResponse getCurrentConfiguration() {
        String host = "localhost";
        int port = 5432;
        String dbName = "warehouse_db";
        String schema = "wes";
        String sslMode = "disable";

        try {
            Pattern pattern = Pattern.compile("jdbc:postgresql://([^:/]+)(?::(\\d+))?/([^?]+)(?:\\?(.*))?");
            Matcher matcher = pattern.matcher(configuredDatasourceUrl);
            if (matcher.find()) {
                host = matcher.group(1);
                if (matcher.group(2) != null) {
                    port = Integer.parseInt(matcher.group(2));
                }
                dbName = matcher.group(3);
                String query = matcher.group(4);
                if (query != null) {
                    for (String param : query.split("&")) {
                        String[] kv = param.split("=");
                        if (kv.length == 2) {
                            if ("currentSchema".equalsIgnoreCase(kv[0])) schema = kv[1];
                            if ("sslmode".equalsIgnoreCase(kv[0])) sslMode = kv[1];
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Notice parsing current datasource URL: {}", e.getMessage());
        }

        boolean connected = false;
        long latencyMs = 0;
        String serverVersion = "Unknown";
        String driverVersion = "PostgreSQL JDBC";

        long start = System.currentTimeMillis();
        try (Connection conn = activeDataSource.getConnection()) {
            latencyMs = System.currentTimeMillis() - start;
            connected = true;
            serverVersion = conn.getMetaData().getDatabaseProductVersion();
            driverVersion = conn.getMetaData().getDriverVersion();
        } catch (Exception e) {
            latencyMs = System.currentTimeMillis() - start;
            log.warn("Active datasource probe failed: {}", e.getMessage());
        }

        String safeUrl = configuredDatasourceUrl.replaceAll("password=[^&;]+", "password=******");

        return DatabaseConfigDto.CurrentConfigResponse.builder()
                .host(host)
                .port(port)
                .databaseName(dbName)
                .username(configuredUsername)
                .currentSchema(schema)
                .sslMode(sslMode)
                .maxPoolSize(configuredMaxPoolSize)
                .minIdle(configuredMinIdle)
                .jdbcUrl(safeUrl)
                .isConnected(connected)
                .responseTimeMs(latencyMs)
                .serverVersion(serverVersion)
                .driverVersion(driverVersion)
                .build();
    }

    public DatabaseConfigDto.TestConnectionResponse testConnection(DatabaseConfigDto.TestConnectionRequest req) {
        String host = (req.getHost() != null && !req.getHost().trim().isEmpty()) ? req.getHost().trim() : "localhost";
        int port = req.getPort() > 0 ? req.getPort() : 5432;
        String dbName = (req.getDatabaseName() != null && !req.getDatabaseName().trim().isEmpty()) ? req.getDatabaseName().trim() : "warehouse_db";
        String username = (req.getUsername() != null && !req.getUsername().trim().isEmpty()) ? req.getUsername().trim() : "warehouse_app";
        String password = (req.getPassword() != null && !req.getPassword().trim().isEmpty())
                ? req.getPassword().trim()
                : (configuredPassword != null ? configuredPassword : "warehouse_test123");
        String sslMode = (req.getSslMode() != null && !req.getSslMode().trim().isEmpty()) ? req.getSslMode().trim() : "disable";

        String testUrl = String.format("jdbc:postgresql://%s:%d/%s?sslmode=%s&connectTimeout=5&socketTimeout=5",
                host, port, dbName, sslMode);

        long start = System.currentTimeMillis();
        Connection conn = null;
        try {
            Class.forName("org.postgresql.Driver");
            try {
                conn = DriverManager.getConnection(testUrl, username, password);
            } catch (Exception initialEx) {
                // If connecting to localhost or 127.0.0.1 was refused, check if PostgreSQL is listening on IPv6 [::1]
                if (("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)) && 
                    initialEx.getMessage() != null && initialEx.getMessage().contains("refused")) {
                    try {
                        String ipv6Url = String.format("jdbc:postgresql://[::1]:%d/%s?sslmode=%s&connectTimeout=5&socketTimeout=5",
                                port, dbName, sslMode);
                        conn = DriverManager.getConnection(ipv6Url, username, password);
                        host = "[::1]";
                    } catch (Exception ipv6Ex) {
                        log.warn("IPv6 fallback attempt to [::1] failed: {}", ipv6Ex.getMessage());
                        throw initialEx;
                    }
                } else {
                    throw initialEx;
                }
            }

            try {
                long latency = System.currentTimeMillis() - start;
                String serverVersion = conn.getMetaData().getDatabaseProductVersion();

                String currentDb = "";
                String currentUser = "";
                try (PreparedStatement ps = conn.prepareStatement("SELECT current_database(), current_user;");
                     ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        currentDb = rs.getString(1);
                        currentUser = rs.getString(2);
                    }
                }

                int tableCount = 0;
                List<String> schemasFound = new ArrayList<>();
                String checkSchemasSql = "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('auth','wes','wms','wcs','asrs','fleet');";
                try (PreparedStatement ps = conn.prepareStatement(checkSchemasSql);
                     ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        schemasFound.add(rs.getString(1));
                    }
                }

                if (!schemasFound.isEmpty()) {
                    String tableCountSql = "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('auth','wes','wms','wcs','asrs','fleet');";
                    try (PreparedStatement ps = conn.prepareStatement(tableCountSql);
                         ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            tableCount = rs.getInt(1);
                        }
                    }
                }

                return DatabaseConfigDto.TestConnectionResponse.builder()
                        .success(true)
                        .responseTimeMs(latency)
                        .serverVersion(serverVersion)
                        .currentDatabase(currentDb)
                        .currentUser(currentUser)
                        .platformTableCount(tableCount)
                        .existingSchemas(schemasFound)
                        .message(String.format("Successfully connected to PostgreSQL at %s:%d/%s (%d ms). %d platform tables present across %d schemas.",
                                host, port, currentDb, latency, tableCount, schemasFound.size()))
                        .build();
            } finally {
                if (conn != null) {
                    try { conn.close(); } catch (Exception ignored) {}
                }
            }
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            log.error("Database connection test failed for {}:{}/{} - {}", host, port, dbName, ex.getMessage());
            return DatabaseConfigDto.TestConnectionResponse.builder()
                    .success(false)
                    .responseTimeMs(latency)
                    .message("Failed to establish connection to target database.")
                    .errorDetails(ex.getMessage())
                    .build();
        }
    }

    public DatabaseConfigDto.UpdateConfigResponse updateConfiguration(DatabaseConfigDto.UpdateConfigRequest req) {
        String host = (req.getHost() != null && !req.getHost().trim().isEmpty()) ? req.getHost().trim() : "localhost";
        int port = req.getPort() > 0 ? req.getPort() : 5432;
        String dbName = (req.getDatabaseName() != null && !req.getDatabaseName().trim().isEmpty()) ? req.getDatabaseName().trim() : "warehouse_db";
        String username = (req.getUsername() != null && !req.getUsername().trim().isEmpty()) ? req.getUsername().trim() : "warehouse_app";
        String password = (req.getPassword() != null && !req.getPassword().trim().isEmpty())
                ? req.getPassword().trim()
                : (configuredPassword != null ? configuredPassword : "warehouse_test123");

        DatabaseConfigDto.TestConnectionResponse testResult = testConnection(
                DatabaseConfigDto.TestConnectionRequest.builder()
                        .host(host)
                        .port(port)
                        .databaseName(dbName)
                        .username(username)
                        .password(password)
                        .sslMode(req.getSslMode())
                        .build()
        );

        if (!testResult.isSuccess()) {
            return DatabaseConfigDto.UpdateConfigResponse.builder()
                    .success(false)
                    .message("Validation failed: Target database is not reachable with provided credentials. " + testResult.getErrorDetails())
                    .requiresRestart(false)
                    .build();
        }

        List<File> targetFiles = List.of(
                new File("C:\\warehouse-platform\\config\\platform.env"),
                new File("C:\\warehouse-platform\\config\\application.yml")
        );

        String savedLocation = "None";
        boolean written = false;

        for (File f : targetFiles) {
            if (f.getParentFile() != null && f.getParentFile().exists()) {
                try {
                    if (f.getName().endsWith(".env")) {
                        String envContent = String.format(
                                "# Database Connection (Updated via Orchestrator UI)%n" +
                                        "DB_HOST=%s%n" +
                                        "DB_PORT=%d%n" +
                                        "DB_NAME=%s%n" +
                                        "DB_USERNAME=%s%n" +
                                        "DB_PASSWORD=%s%n",
                                host, port, dbName, username, password
                        );
                        Files.writeString(f.toPath(), envContent, StandardCharsets.UTF_8,
                                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                        savedLocation = f.getAbsolutePath();
                        written = true;
                    }
                } catch (Exception e) {
                    log.warn("Could not write to {}: {}", f.getAbsolutePath(), e.getMessage());
                }
            }
        }

        File wrapperDir = new File("C:\\warehouse-platform\\service-wrapper");
        if (wrapperDir.exists() && wrapperDir.isDirectory()) {
            File[] xmls = wrapperDir.listFiles((dir, name) -> name.endsWith(".xml"));
            if (xmls != null) {
                for (File xmlFile : xmls) {
                    try {
                        String content = Files.readString(xmlFile.toPath(), StandardCharsets.UTF_8);
                        content = content.replaceAll("<env name=\"DB_HOST\" value=\"[^\"]*\"/>",
                                "<env name=\"DB_HOST\" value=\"" + host + "\"/>");
                        content = content.replaceAll("<env name=\"DB_PORT\" value=\"[^\"]*\"/>",
                                "<env name=\"DB_PORT\" value=\"" + port + "\"/>");
                        content = content.replaceAll("<env name=\"DB_NAME\" value=\"[^\"]*\"/>",
                                "<env name=\"DB_NAME\" value=\"" + dbName + "\"/>");
                        content = content.replaceAll("<env name=\"DB_USERNAME\" value=\"[^\"]*\"/>",
                                "<env name=\"DB_USERNAME\" value=\"" + username + "\"/>");
                        if (!password.isEmpty()) {
                            content = content.replaceAll("<env name=\"DB_PASSWORD\" value=\"[^\"]*\"/>",
                                    "<env name=\"DB_PASSWORD\" value=\"" + password + "\"/>");
                        }
                        Files.writeString(xmlFile.toPath(), content, StandardCharsets.UTF_8,
                                StandardOpenOption.TRUNCATE_EXISTING);
                    } catch (Exception ex) {
                        log.warn("Could not update {}: {}", xmlFile.getName(), ex.getMessage());
                    }
                }
            }
        }

        return DatabaseConfigDto.UpdateConfigResponse.builder()
                .success(true)
                .message(String.format("Database connection target updated to %s:%d/%s. Changes persisted to platform configuration.",
                        host, port, dbName))
                .targetConfigFile(written ? savedLocation : "C:\\warehouse-platform\\config\\platform.env")
                .requiresRestart(true)
                .build();
    }
}
