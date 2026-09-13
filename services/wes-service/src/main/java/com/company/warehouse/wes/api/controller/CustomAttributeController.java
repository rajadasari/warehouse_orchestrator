package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.CreateCustomAttributeRequest;
import com.company.warehouse.wes.api.dto.CustomAttributeDto;
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
@RequestMapping("/api/v1/wes/custom-attributes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomAttributeController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<CustomAttributeDto>> getAllCustomAttributes() {
        log.debug("GET /api/v1/wes/custom-attributes: Fetching all custom attributes");
        return ResponseEntity.ok(masterDataService.getAllCustomAttributes());
    }

    @PostMapping
    public ResponseEntity<CustomAttributeDto> createCustomAttribute(@RequestBody CreateCustomAttributeRequest request) {
        log.info("POST /api/v1/wes/custom-attributes: Creating attribute code='{}' for target entity='{}'",
                request.getAttributeCode(), request.getTargetEntity());
        return ResponseEntity.status(HttpStatus.CREATED).body(masterDataService.createCustomAttribute(request));
    }
}
