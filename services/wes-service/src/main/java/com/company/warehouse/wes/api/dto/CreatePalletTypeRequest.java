package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePalletTypeRequest {
    private String code;
    private String name;
    private String material;
    private BigDecimal tareWeightKg;
    private BigDecimal lengthMm;
    private BigDecimal widthMm;
    private BigDecimal heightMm;
    private BigDecimal maxPayloadKg;
}
