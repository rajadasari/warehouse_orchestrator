package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletItemDto {
    private UUID id;
    private UUID itemId;
    private String itemCode;
    private UUID skuId;
    private String skuCode;
    private String itemName;
    private String packageType;
    private int packageCount;
    private BigDecimal totalQuantity;
    private String baseUom;
    private String lotNumber;
    private String serialNumber;
    private LocalDate expiryDate;
}
