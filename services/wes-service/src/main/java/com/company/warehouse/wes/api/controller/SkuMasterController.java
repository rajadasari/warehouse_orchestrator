package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateSkuMasterRequest;
import com.company.warehouse.wes.api.dto.SkuMasterDto;
import com.company.warehouse.wes.business.service.MasterDataService;
import lombok.RequiredArgsConstructor;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wes/skus")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SkuMasterController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<SkuMasterDto>> getAllSkus() {
        return ResponseEntity.ok(masterDataService.getAllSkus());
    }

    @PostMapping
    public ResponseEntity<SkuMasterDto> createSku(@RequestBody CreateSkuMasterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createSku(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SkuMasterDto> updateSku(@PathVariable UUID id, @RequestBody CreateSkuMasterRequest request) {
        return ResponseEntity.ok(masterDataService.updateSku(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSku(@PathVariable UUID id) {
        masterDataService.deleteSku(id);
        return ResponseEntity.noContent().build();
    }
}
