package com.company.warehouse.wes.api.controller.integration;

import com.company.warehouse.wes.api.dto.integration.ChannelDryRunRequest;
import com.company.warehouse.wes.api.dto.integration.ChannelDryRunResponse;
import com.company.warehouse.wes.api.dto.integration.IntegrationChannelDto;
import com.company.warehouse.wes.business.integration.IntegrationChannelConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST API exposing full configuration, testing dry-runs, and AI schema introspection
 * for Integration Channels in Warehouse Orchestrator.
 * Designed for programmatic integration with AI agents and external orchestrators.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wes/integration/channels")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IntegrationChannelConfigController {

    private final IntegrationChannelConfigService configService;

    /**
     * AI Schema Introspection: Returns supported rule types, operators, formats, and handshake modes.
     */
    @GetMapping("/ai-schema")
    public ResponseEntity<Map<String, Object>> getAiSchema() {
        log.debug("GET /api/v1/wes/integration/channels/ai-schema: Introspecting schema for AI agents");
        return ResponseEntity.ok(configService.getAiSchema());
    }

    /**
     * Test / Dry-Run Endpoint: Allows AI agents to test candidate mappings and rules against sample payloads.
     */
    @PostMapping("/validate")
    public ResponseEntity<ChannelDryRunResponse> dryRunValidation(@RequestBody ChannelDryRunRequest request) {
        log.info("POST /api/v1/wes/integration/channels/validate: Dry-running configuration");
        return ResponseEntity.ok(configService.dryRun(request));
    }

    /**
     * List all configured integration channels.
     */
    @GetMapping
    public ResponseEntity<List<IntegrationChannelDto>> getAllChannels() {
        log.debug("GET /api/v1/wes/integration/channels");
        return ResponseEntity.ok(configService.getAllChannels());
    }

    /**
     * Fetch a specific integration channel by code.
     */
    @GetMapping("/{channelCode}")
    public ResponseEntity<IntegrationChannelDto> getChannelByCode(@PathVariable String channelCode) {
        log.debug("GET /api/v1/wes/integration/channels/{}", channelCode);
        return ResponseEntity.ok(configService.getChannelByCode(channelCode));
    }

    /**
     * Create a new integration channel (invoked by AI or human administrators).
     */
    @PostMapping
    public ResponseEntity<IntegrationChannelDto> createChannel(@Valid @RequestBody IntegrationChannelDto dto) {
        log.info("POST /api/v1/wes/integration/channels: Creating channel code='{}', name='{}'",
                dto.getChannelCode(), dto.getChannelName());
        IntegrationChannelDto created = configService.createChannel(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update an existing integration channel.
     */
    @PutMapping("/{channelCode}")
    public ResponseEntity<IntegrationChannelDto> updateChannel(
            @PathVariable String channelCode,
            @RequestBody IntegrationChannelDto dto) {
        log.info("PUT /api/v1/wes/integration/channels/{}: Updating channel", channelCode);
        return ResponseEntity.ok(configService.updateChannel(channelCode, dto));
    }

    /**
     * Delete an integration channel.
     */
    @DeleteMapping("/{channelCode}")
    public ResponseEntity<Void> deleteChannel(@PathVariable String channelCode) {
        log.info("DELETE /api/v1/wes/integration/channels/{}", channelCode);
        configService.deleteChannel(channelCode);
        return ResponseEntity.noContent().build();
    }
}
