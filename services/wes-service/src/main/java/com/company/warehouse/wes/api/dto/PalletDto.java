package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletDto {
    private UUID id;
    private String palletLpn;
    private String loadType;
    private UUID strategyId;
    private String strategyCode;
    private String strategyName;
    private UUID palletTypeId;
    private String palletTypeCode;
    private String palletTypeName;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String materialBaseUom;
    private String status;
    private String currentLocation;
    private boolean isMixedPallet;
    private BigDecimal actualWeightKg;
    private Map<String, Object> customAttributes;
    private List<PalletItemDto> items;
    private Instant createdAt;
}
