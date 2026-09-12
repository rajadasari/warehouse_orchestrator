package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkuMasterDto {
    private UUID id;
    private String skuCode;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String packageType;
    private BigDecimal unitsPerPackage;
    private String barcode;
    private boolean isActive;
    private Map<String, Object> customAttributes;
    private Instant createdAt;
}
