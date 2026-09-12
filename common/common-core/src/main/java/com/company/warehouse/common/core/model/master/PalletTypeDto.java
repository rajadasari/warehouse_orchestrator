package com.company.warehouse.common.core.model.master;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletTypeDto implements Serializable {
    private UUID id;
    private String code;
    private String name;
    private String material;
    private BigDecimal tareWeightKg;
    private BigDecimal lengthMm;
    private BigDecimal widthMm;
    private BigDecimal heightMm;
    private BigDecimal maxPayloadKg;
}
