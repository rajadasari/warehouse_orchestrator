package com.company.warehouse.wes.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InboundPalletSubmissionRequest {

    @NotBlank(message = "Pallet LPN is required")
    private String palletLpn;

    @Builder.Default
    private String loadType = "MATERIAL_WITH_SKU"; // 'NO_LOAD', 'MATERIAL', 'MATERIAL_WITH_SKU', 'PALLET_STACK'

    private String inboundType; // 'RAW_MATERIAL_PO', 'FINISHED_GOODS_MFG', 'CUSTOMER_RETURN', etc.

    @NotBlank(message = "Pallet Type Code is required")
    private String palletTypeCode; // e.g. 'EUR_WOOD', 'US_GMA'

    private String itemCode;       // e.g. 'MAT-MILK-POWDER'

    private String skuCode;        // e.g. 'SKU-MILK-BAG25KG'

    @Positive(message = "Quantity must be positive")
    private BigDecimal quantity;

    private String uom;            // 'KG', 'BAG', 'EA'

    private String lotNumber;

    private LocalDate expiryDate;

    @NotNull(message = "Actual weight is required")
    @Positive(message = "Actual weight must be positive")
    private BigDecimal actualWeightKg;

    @NotBlank(message = "Source location is required")
    private String sourceLocation; // e.g. 'RCV-DOCK-01'

    @Builder.Default
    private String operatorId = "OPERATOR";

    private Map<String, Object> customAttributes;
}
