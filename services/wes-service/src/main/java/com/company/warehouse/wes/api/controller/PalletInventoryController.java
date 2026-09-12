package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateInboundPalletRequest;
import com.company.warehouse.wes.api.dto.PalletDto;
import com.company.warehouse.wes.api.dto.PalletProcessLogDto;
import com.company.warehouse.wes.api.dto.RecordProcessLogRequest;
import com.company.warehouse.wes.business.service.PalletExecutionService;
import lombok.RequiredArgsConstructor;
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

@RestController
@RequestMapping("/api/v1/wes/pallets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PalletInventoryController {

    private final PalletExecutionService palletExecutionService;

    @GetMapping
    public ResponseEntity<List<PalletDto>> getAllPallets() {
        return ResponseEntity.ok(palletExecutionService.getAllPallets());
    }

    @PostMapping("/inbound")
    public ResponseEntity<PalletDto> createInboundPallet(@RequestBody CreateInboundPalletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(palletExecutionService.createInboundPallet(request));
    }

    @GetMapping("/{id}/process-logs")
    public ResponseEntity<List<PalletProcessLogDto>> getPalletProcessLogs(@PathVariable UUID id) {
        return ResponseEntity.ok(palletExecutionService.getPalletProcessLogs(id));
    }

    @PostMapping("/{id}/process-logs")
    public ResponseEntity<PalletProcessLogDto> recordProcessLog(
            @PathVariable UUID id,
            @RequestBody RecordProcessLogRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(palletExecutionService.recordProcessLog(id, request));
    }
}

