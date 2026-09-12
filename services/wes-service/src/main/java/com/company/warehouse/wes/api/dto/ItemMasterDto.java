package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemMasterDto {
    private UUID id;
    private String itemCode;
    private String name;
    private String itemType;
    private String baseUom;
    private boolean allowMixedPallet;
    private String mixedPalletGroup;
    private String status;
    private Map<String, Object> customAttributes;
    private Instant createdAt;
    private Instant updatedAt;
}
