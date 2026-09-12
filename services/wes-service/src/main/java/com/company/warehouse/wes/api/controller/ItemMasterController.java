package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateItemMasterRequest;
import com.company.warehouse.wes.api.dto.ItemMasterDto;
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
@RequestMapping("/api/v1/wes/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ItemMasterController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<ItemMasterDto>> getAllItems() {
        return ResponseEntity.ok(masterDataService.getAllItems());
    }

    @PostMapping
    public ResponseEntity<ItemMasterDto> createItem(@RequestBody CreateItemMasterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createItem(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemMasterDto> updateItem(@PathVariable UUID id, @RequestBody CreateItemMasterRequest request) {
        return ResponseEntity.ok(masterDataService.updateItem(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        masterDataService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
