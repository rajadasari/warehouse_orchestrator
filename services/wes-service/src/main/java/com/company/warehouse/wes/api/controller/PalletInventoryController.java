package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateInboundPalletRequest;
import com.company.warehouse.wes.api.dto.PalletDto;
import com.company.warehouse.wes.api.dto.PalletProcessLogDto;
import com.company.warehouse.wes.api.dto.RecordProcessLogRequest;
import com.company.warehouse.wes.business.service.PalletExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/pallets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PalletInventoryController {

    private final PalletExecutionService palletExecutionService;

    @GetMapping
    public ResponseEntity<List<PalletDto>> getAllPallets() {
        log.debug("GET /api/v1/wes/pallets: Fetching all pallets");
        return ResponseEntity.ok(palletExecutionService.getAllPallets());
    }

    @PostMapping("/inbound")
    public ResponseEntity<PalletDto> createInboundPallet(@RequestBody CreateInboundPalletRequest request) {
        log.info("POST /api/v1/wes/pallets/inbound: Creating pallet LPN='{}', loadType='{}'",
                request.getPalletLpn(), request.getLoadType());
        return ResponseEntity.status(HttpStatus.CREATED).body(palletExecutionService.createInboundPallet(request));
    }

    @GetMapping("/{id}/process-logs")
    public ResponseEntity<List<PalletProcessLogDto>> getPalletProcessLogs(@PathVariable UUID id) {
        log.debug("GET /api/v1/wes/pallets/{}/process-logs: Fetching process logs", id);
        return ResponseEntity.ok(palletExecutionService.getPalletProcessLogs(id));
    }

    @PostMapping("/{id}/process-logs")
    public ResponseEntity<PalletProcessLogDto> recordProcessLog(
            @PathVariable UUID id,
            @RequestBody RecordProcessLogRequest request) {
        log.info("POST /api/v1/wes/pallets/{}/process-logs: Recording step='{}', status='{}'",
                id, request.getProcessStage(), request.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED).body(palletExecutionService.recordProcessLog(id, request));
    }
}

