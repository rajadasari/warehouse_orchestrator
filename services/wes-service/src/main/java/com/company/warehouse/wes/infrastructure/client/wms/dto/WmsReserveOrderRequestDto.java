package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsReserveOrderRequestDto {

    private String wmsOrderId;
    private String palletLpn;
    private String reserveStrategy; // 'HARD_ALLOCATION', 'SOFT_ALLOCATION'
}
