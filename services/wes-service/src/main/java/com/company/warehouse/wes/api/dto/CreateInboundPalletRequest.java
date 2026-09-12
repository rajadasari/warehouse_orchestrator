package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInboundPalletRequest {
    private String palletLpn;
    private String loadType; // 'NO_LOAD', 'MATERIAL', 'MATERIAL_WITH_SKU', 'PALLET_STACK'
    private UUID strategyId;
    private UUID palletTypeId;
    private UUID itemId;
    private UUID skuId;
    private BigDecimal materialQuantity;
    private String status;
    private String location;
    private Boolean isMixedPallet;
    private BigDecimal actualWeightKg;
    private Integer packageCount;
    private BigDecimal totalQuantity;
    private String lotNumber;
    private LocalDate expiryDate;
    private Map<String, Object> customAttributes;
}
