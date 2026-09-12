package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSkuMasterRequest {
    private String skuCode;
    private UUID itemId;
    private String packageType;
    private BigDecimal unitsPerPackage;
    private String barcode;
    private Boolean isActive;
    private Map<String, Object> customAttributes;
}
