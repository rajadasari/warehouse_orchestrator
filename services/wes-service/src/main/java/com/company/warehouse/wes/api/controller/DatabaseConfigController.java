package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.config.DatabaseConfigDto;
import com.company.warehouse.wes.business.config.DatabaseConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/config/database")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DatabaseConfigController {

    private final DatabaseConfigService databaseConfigService;

    @GetMapping
    public ResponseEntity<DatabaseConfigDto.CurrentConfigResponse> getCurrentConfiguration() {
        log.debug("GET /api/v1/wes/config/database: Fetching current database configuration");
        return ResponseEntity.ok(databaseConfigService.getCurrentConfiguration());
    }

    @PostMapping("/test")
    public ResponseEntity<DatabaseConfigDto.TestConnectionResponse> testConnection(
            @RequestBody DatabaseConfigDto.TestConnectionRequest request) {
        log.info("POST /api/v1/wes/config/database/test: Testing connection to {}:{}/{}",
                request.getHost(), request.getPort(), request.getDatabaseName());
        DatabaseConfigDto.TestConnectionResponse response = databaseConfigService.testConnection(request);
        return ResponseEntity.ok(response);
    }

    @PutMapping
    public ResponseEntity<DatabaseConfigDto.UpdateConfigResponse> updateConfiguration(
            @RequestBody DatabaseConfigDto.UpdateConfigRequest request) {
        log.info("PUT /api/v1/wes/config/database: Updating target database to {}:{}/{}",
                request.getHost(), request.getPort(), request.getDatabaseName());
        DatabaseConfigDto.UpdateConfigResponse response = databaseConfigService.updateConfiguration(request);
        return ResponseEntity.ok(response);
    }
}
