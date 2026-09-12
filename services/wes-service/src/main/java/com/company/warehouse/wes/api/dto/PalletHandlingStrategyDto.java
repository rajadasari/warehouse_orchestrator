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
public class PalletHandlingStrategyDto {
    private UUID id;
    private String strategyCode;
    private String name;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private UUID skuId;
    private String skuCode;
    private String packageType;
    private UUID palletTypeId;
    private String palletTypeCode;
    private String palletTypeName;
    private int fullLayerQty;
    private int maxLayers;
    private int standardPackageCount;
    private BigDecimal standardTotalQuantity;
    private BigDecimal expectedTotalWeightKg;
    private BigDecimal expectedHeightMm;
    private boolean isDefault;
    private Map<String, Object> customAttributes;
}
