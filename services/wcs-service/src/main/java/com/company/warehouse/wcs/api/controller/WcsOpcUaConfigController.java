package com.company.warehouse.wcs.api.controller;

import com.company.warehouse.wcs.api.dto.*;
import com.company.warehouse.wcs.business.service.WcsOpcUaConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Configuration REST APIs for AI Agents and Control Room Engineers to configure OPC UA in WCS.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wcs/opcua")
@RequiredArgsConstructor
public class WcsOpcUaConfigController {

    private final WcsOpcUaConfigService configService;

    // =========================================================================
    // 1. AI INTROSPECTION & DRY-RUN VALIDATION
    // =========================================================================

    @GetMapping("/ai-schema")
    public ResponseEntity<OpcUaAiSchemaDto> getAiSchema() {
        return ResponseEntity.ok(configService.getAiSchema());
    }

    @PostMapping("/validate")
    public ResponseEntity<OpcUaValidateResponse> validateConfig(@RequestBody OpcUaValidateRequest request) {
        return ResponseEntity.ok(configService.validateConfig(request));
    }

    // =========================================================================
    // 2. CLIENT CONFIGURATION ENDPOINTS
    // =========================================================================

    @GetMapping("/clients")
    public ResponseEntity<List<OpcUaClientDto>> getAllClients() {
        return ResponseEntity.ok(configService.getAllClients());
    }

    @GetMapping("/clients/{code}")
    public ResponseEntity<OpcUaClientDto> getClient(@PathVariable String code) {
        return configService.getClientByCode(code)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/clients")
    public ResponseEntity<OpcUaClientDto> saveClient(@RequestBody OpcUaClientDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(configService.saveClient(dto));
    }

    @DeleteMapping("/clients/{code}")
    public ResponseEntity<Void> deleteClient(@PathVariable String code) {
        return configService.deleteClient(code)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // =========================================================================
    // 3. SERVER CONFIGURATION ENDPOINTS
    // =========================================================================

    @GetMapping("/servers")
    public ResponseEntity<List<OpcUaServerDto>> getAllServers() {
        return ResponseEntity.ok(configService.getAllServers());
    }

    @GetMapping("/servers/{code}")
    public ResponseEntity<OpcUaServerDto> getServer(@PathVariable String code) {
        return configService.getServerByCode(code)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/servers")
    public ResponseEntity<OpcUaServerDto> saveServer(@RequestBody OpcUaServerDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(configService.saveServer(dto));
    }

    @DeleteMapping("/servers/{code}")
    public ResponseEntity<Void> deleteServer(@PathVariable String code) {
        return configService.deleteServer(code)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // =========================================================================
    // 4. TAG MAPPING ENDPOINTS
    // =========================================================================

    @GetMapping("/tags")
    public ResponseEntity<List<OpcUaTagMappingDto>> getAllTags() {
        return ResponseEntity.ok(configService.getAllTags());
    }

    @GetMapping("/tags/{key}")
    public ResponseEntity<OpcUaTagMappingDto> getTag(@PathVariable String key) {
        return configService.getTagByKey(key)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/tags")
    public ResponseEntity<OpcUaTagMappingDto> saveTag(@RequestBody OpcUaTagMappingDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(configService.saveTag(dto));
    }

    @DeleteMapping("/tags/{key}")
    public ResponseEntity<Void> deleteTag(@PathVariable String key) {
        return configService.deleteTag(key)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // =========================================================================
    // 5. TAG GROUP ENDPOINTS
    // =========================================================================

    @GetMapping("/tag-groups")
    public ResponseEntity<List<OpcUaTagGroupDto>> getAllGroups() {
        return ResponseEntity.ok(configService.getAllGroups());
    }

    @GetMapping("/tag-groups/{key}")
    public ResponseEntity<OpcUaTagGroupDto> getGroup(@PathVariable String key) {
        return configService.getGroupByKey(key)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/tag-groups")
    public ResponseEntity<OpcUaTagGroupDto> saveGroup(@RequestBody OpcUaTagGroupDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(configService.saveGroup(dto));
    }

    @DeleteMapping("/tag-groups/{key}")
    public ResponseEntity<Void> deleteGroup(@PathVariable String key) {
        return configService.deleteGroup(key)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
