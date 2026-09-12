package com.company.warehouse.common.core.model.master;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkuMasterDto implements Serializable {
    private UUID id;
    private String skuCode;
    private UUID itemId;
    private String itemCode;
    private String packageType;
    private BigDecimal unitsPerPackage;
    private String barcode;
    private boolean active;
    private Map<String, Object> customAttributes;
}
