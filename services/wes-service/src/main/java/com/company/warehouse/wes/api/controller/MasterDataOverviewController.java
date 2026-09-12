package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.api.dto.MasterDataOverviewDto;
import com.company.warehouse.wes.business.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wes/overview")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MasterDataOverviewController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<MasterDataOverviewDto> getOverview() {
        return ResponseEntity.ok(masterDataService.getOverviewMetrics());
    }
}
