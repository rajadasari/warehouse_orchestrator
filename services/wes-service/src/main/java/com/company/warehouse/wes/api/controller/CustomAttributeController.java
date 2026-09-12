package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateCustomAttributeRequest;
import com.company.warehouse.wes.api.dto.CustomAttributeDto;
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
@RequestMapping("/api/v1/wes/custom-attributes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomAttributeController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<CustomAttributeDto>> getAllCustomAttributes() {
        return ResponseEntity.ok(masterDataService.getAllCustomAttributes());
    }

    @PostMapping
    public ResponseEntity<CustomAttributeDto> createCustomAttribute(@RequestBody CreateCustomAttributeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createCustomAttribute(request));
    }
}
