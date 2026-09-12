package com.company.warehouse.common.core.model.master;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemMasterDto implements Serializable {
    private UUID id;
    private String itemCode;
    private String name;
    private String itemType;
    private String baseUom;
    private boolean allowMixedPallet;
    private String mixedPalletGroup;
    private String status;
    private Map<String, Object> customAttributes;
}
