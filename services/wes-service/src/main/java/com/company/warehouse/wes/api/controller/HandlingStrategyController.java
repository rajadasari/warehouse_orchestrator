package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateHandlingStrategyRequest;
import com.company.warehouse.wes.api.dto.PalletHandlingStrategyDto;
import com.company.warehouse.wes.business.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/wes/strategies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HandlingStrategyController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<PalletHandlingStrategyDto>> getAllStrategies() {
        return ResponseEntity.ok(masterDataService.getAllStrategies());
    }

    @PostMapping
    public ResponseEntity<PalletHandlingStrategyDto> createStrategy(@RequestBody CreateHandlingStrategyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createStrategy(request));
    }
}
