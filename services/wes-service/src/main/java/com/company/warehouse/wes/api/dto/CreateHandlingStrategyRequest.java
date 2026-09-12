package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateHandlingStrategyRequest {
    private String strategyCode;
    private String name;
    private UUID itemId;
    private UUID skuId;
    private UUID palletTypeId;
    private int fullLayerQty;
    private int maxLayers;
    private boolean isDefault;
    private Map<String, Object> customAttributes;
}
