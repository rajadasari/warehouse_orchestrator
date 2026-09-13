package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreatePalletTypeRequest;
import com.company.warehouse.wes.api.dto.PalletTypeMasterDto;
import com.company.warehouse.wes.business.service.MasterDataService;
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
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wes/pallet-types")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PalletTypeController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<PalletTypeMasterDto>> getAllPalletTypes() {
        log.debug("GET /api/v1/wes/pallet-types: Fetching all pallet types");
        return ResponseEntity.ok(masterDataService.getAllPalletTypes());
    }

    @PostMapping
    public ResponseEntity<PalletTypeMasterDto> createPalletType(@RequestBody CreatePalletTypeRequest request) {
        log.info("POST /api/v1/wes/pallet-types: Creating pallet type code='{}', name='{}'",
                request.getCode(), request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createPalletType(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PalletTypeMasterDto> updatePalletType(
            @PathVariable UUID id,
            @RequestBody CreatePalletTypeRequest request) {
        log.info("PUT /api/v1/wes/pallet-types/{}: Updating pallet type code='{}'", id, request.getCode());
        return ResponseEntity.ok(masterDataService.updatePalletType(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePalletType(@PathVariable UUID id) {
        log.info("DELETE /api/v1/wes/pallet-types/{}: Deleting pallet type", id);
        masterDataService.deletePalletType(id);
        return ResponseEntity.noContent().build();
    }
}
