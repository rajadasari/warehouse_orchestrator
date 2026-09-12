package com.company.warehouse.wes.business.spi.wms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderCommand {
    private String clientOrderRef;
    private String orderType;
    private String palletLpn;
    private String itemCode;
    private String skuCode;
    private BigDecimal quantity;
    private String destinationLocation;
}
