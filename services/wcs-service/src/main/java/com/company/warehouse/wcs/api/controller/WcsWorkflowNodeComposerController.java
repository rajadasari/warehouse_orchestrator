package com.company.warehouse.wcs.api.controller;

import com.company.warehouse.common.industrial.opcua.handshake.HandshakeExecutionResult;
import com.company.warehouse.wcs.api.dto.OpcUaStationTemplateDto;
import com.company.warehouse.wcs.api.dto.StationNodeGenerateRequest;
import com.company.warehouse.wcs.api.dto.StationNodeGenerateResponse;
import com.company.warehouse.wcs.business.service.WcsWorkflowNodeComposerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller exposing Station Sequence Templates and Workflow Node Composition for AI and UI.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wcs/opcua/composer")
@RequiredArgsConstructor
public class WcsWorkflowNodeComposerController {

    private final WcsWorkflowNodeComposerService composerService;

    @GetMapping("/templates")
    public ResponseEntity<List<OpcUaStationTemplateDto>> getAllTemplates() {
        return ResponseEntity.ok(composerService.getAllTemplates());
    }

    @GetMapping("/templates/{code}")
    public ResponseEntity<OpcUaStationTemplateDto> getTemplate(@PathVariable String code) {
        return composerService.getTemplateByCode(code)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/templates")
    public ResponseEntity<OpcUaStationTemplateDto> saveTemplate(@RequestBody OpcUaStationTemplateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(composerService.saveTemplate(dto));
    }

    /**
     * AI and UI call this endpoint to compose a reusable workflow node for any station on a conveyor line.
     */
    @PostMapping("/generate-node")
    public ResponseEntity<StationNodeGenerateResponse> generateStationNode(@RequestBody StationNodeGenerateRequest request) {
        return ResponseEntity.ok(composerService.generateStationNode(request));
    }

    /**
     * Executes a composed station sequence directly (used during workflow step execution or simulation).
     */
    @PostMapping("/execute")
    public ResponseEntity<HandshakeExecutionResult> executeStationSequence(@RequestBody Map<String, Object> payload) {
        String templateCode = String.valueOf(payload.get("templateCode"));
        String stationCode = String.valueOf(payload.get("stationCode"));
        String tagPrefix = payload.get("tagPrefix") != null ? String.valueOf(payload.get("tagPrefix")) : "";
        String clientCode = payload.get("clientCode") != null ? String.valueOf(payload.get("clientCode")) : "WCS_VIRTUAL_SERVER";

        @SuppressWarnings("unchecked")
        Map<String, Object> context = (payload.get("context") instanceof Map)
                ? (Map<String, Object>) payload.get("context")
                : Map.of();

        HandshakeExecutionResult result = composerService.executeStationSequence(
                templateCode, stationCode, tagPrefix, clientCode, context
        );
        return ResponseEntity.ok(result);
    }
}
