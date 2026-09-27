package com.company.warehouse.wcs.api.controller;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.model.OpcUaTagValue;
import com.company.warehouse.wcs.business.service.WcsOpcUaRuntimeManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Interactive runtime REST controller for single, batch, and group OPC UA reads/writes.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wcs/opcua/runtime")
@RequiredArgsConstructor
public class WcsOpcUaRuntimeController {

    private final WcsOpcUaRuntimeManager runtimeManager;

    @PostMapping("/{code}/read-single")
    public ResponseEntity<OpcUaTagValue> readSingle(
            @PathVariable String code,
            @RequestParam String tagKey) {
        OpcUaOperations io = runtimeManager.getIo(code);
        return ResponseEntity.ok(io.readSingle(tagKey));
    }

    @PostMapping("/{code}/write-single")
    public ResponseEntity<Map<String, Object>> writeSingle(
            @PathVariable String code,
            @RequestBody Map<String, Object> payload) {
        String tagKey = String.valueOf(payload.get("tagKey"));
        Object value = payload.get("value");

        OpcUaOperations io = runtimeManager.getIo(code);
        boolean success = io.writeSingle(tagKey, value);
        return ResponseEntity.ok(Map.of("tagKey", tagKey, "success", success));
    }

    @PostMapping("/{code}/read-batch")
    public ResponseEntity<Map<String, OpcUaTagValue>> readBatch(
            @PathVariable String code,
            @RequestBody List<String> tagKeys) {
        OpcUaOperations io = runtimeManager.getIo(code);
        return ResponseEntity.ok(io.readBatch(tagKeys));
    }

    @PostMapping("/{code}/read-group/{groupKey}")
    public ResponseEntity<Map<String, OpcUaTagValue>> readGroup(
            @PathVariable String code,
            @PathVariable String groupKey) {
        OpcUaOperations io = runtimeManager.getIo(code);
        return ResponseEntity.ok(io.readGroup(groupKey));
    }

    @PostMapping("/{code}/write-batch")
    public ResponseEntity<Map<String, Boolean>> writeBatch(
            @PathVariable String code,
            @RequestBody Map<String, Object> values) {
        OpcUaOperations io = runtimeManager.getIo(code);
        return ResponseEntity.ok(io.writeBatch(values));
    }

    @PostMapping("/{code}/write-group/{groupKey}")
    public ResponseEntity<Map<String, Boolean>> writeGroup(
            @PathVariable String code,
            @PathVariable String groupKey,
            @RequestBody Map<String, Object> values) {
        OpcUaOperations io = runtimeManager.getIo(code);
        return ResponseEntity.ok(io.writeGroup(groupKey, values));
    }

    @PostMapping("/{code}/browse")
    public ResponseEntity<List<String>> browse(
            @PathVariable String code,
            @RequestParam(required = false, defaultValue = "Root") String nodeId) {
        OpcUaOperations io = runtimeManager.getIo(code);
        return ResponseEntity.ok(io.browse(nodeId));
    }
}
