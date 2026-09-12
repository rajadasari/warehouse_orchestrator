package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsCreateOrderRequestDto {

    private String clientOrderRef;
    private String orderType; // 'OUTBOUND_SHIPMENT', 'TRANSFER', 'CROSS_DOCK'
    private String palletLpn;
    private String itemCode;
    private String skuCode;
    private BigDecimal quantity;
    private String destinationLocation;
}
