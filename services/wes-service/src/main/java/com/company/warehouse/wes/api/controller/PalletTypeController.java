package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreatePalletTypeRequest;
import com.company.warehouse.wes.api.dto.PalletTypeMasterDto;
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
@RequestMapping("/api/v1/wes/pallet-types")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PalletTypeController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<PalletTypeMasterDto>> getAllPalletTypes() {
        return ResponseEntity.ok(masterDataService.getAllPalletTypes());
    }

    @PostMapping
    public ResponseEntity<PalletTypeMasterDto> createPalletType(@RequestBody CreatePalletTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createPalletType(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PalletTypeMasterDto> updatePalletType(
            @PathVariable UUID id,
            @RequestBody CreatePalletTypeRequest request) {
        return ResponseEntity.ok(masterDataService.updatePalletType(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePalletType(@PathVariable UUID id) {
        masterDataService.deletePalletType(id);
        return ResponseEntity.noContent().build();
    }
}
