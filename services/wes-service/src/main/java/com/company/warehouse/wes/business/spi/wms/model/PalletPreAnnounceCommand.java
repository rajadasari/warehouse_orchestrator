package com.company.warehouse.wes.business.spi.wms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletPreAnnounceCommand {
    private String palletLpn;
    private String palletTypeCode;
    private String itemCode;
    private String skuCode;
    private BigDecimal quantity;
    private String uom;
    private String lotNumber;
    private LocalDate expiryDate;
    private BigDecimal actualWeightKg;
    private String sourceLocation;
    private String targetResourceId;
}
