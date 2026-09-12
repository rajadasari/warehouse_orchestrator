package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateItemMasterRequest {
    private String itemCode;
    private String name;
    private String itemType;
    private String baseUom;
    private boolean allowMixedPallet;
    private String mixedPalletGroup;
    private String status;
    private Map<String, Object> customAttributes;
}
