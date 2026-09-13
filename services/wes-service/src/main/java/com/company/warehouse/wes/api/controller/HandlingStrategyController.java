package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateHandlingStrategyRequest;
import com.company.warehouse.wes.api.dto.PalletHandlingStrategyDto;
import com.company.warehouse.wes.business.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/strategies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HandlingStrategyController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<PalletHandlingStrategyDto>> getAllStrategies() {
        log.debug("GET /api/v1/wes/strategies: Fetching all pallet handling strategies");
        return ResponseEntity.ok(masterDataService.getAllStrategies());
    }

    @PostMapping
    public ResponseEntity<PalletHandlingStrategyDto> createStrategy(@RequestBody CreateHandlingStrategyRequest request) {
        log.info("POST /api/v1/wes/strategies: Creating strategy name='{}', skuId='{}', palletTypeId='{}'",
                request.getName(), request.getSkuId(), request.getPalletTypeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createStrategy(request));
    }
}
