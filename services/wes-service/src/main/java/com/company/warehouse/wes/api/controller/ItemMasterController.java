package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateItemMasterRequest;
import com.company.warehouse.wes.api.dto.ItemMasterDto;
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
@RequestMapping("/api/v1/wes/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ItemMasterController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<ItemMasterDto>> getAllItems() {
        log.debug("GET /api/v1/wes/items: Fetching all items");
        return ResponseEntity.ok(masterDataService.getAllItems());
    }

    @PostMapping
    public ResponseEntity<ItemMasterDto> createItem(@RequestBody CreateItemMasterRequest request) {
        log.info("POST /api/v1/wes/items: Creating item code='{}', name='{}'", request.getItemCode(), request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createItem(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemMasterDto> updateItem(@PathVariable UUID id, @RequestBody CreateItemMasterRequest request) {
        log.info("PUT /api/v1/wes/items/{}: Updating item code='{}'", id, request.getItemCode());
        return ResponseEntity.ok(masterDataService.updateItem(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        log.info("DELETE /api/v1/wes/items/{}: Deleting item", id);
        masterDataService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
