package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsReserveOrderResponseDto {

    private boolean success;
    private String reservationId;
    private String wmsOrderId;
    private String palletLpn;
    private String status; // 'RESERVED', 'RESERVATION_FAILED'
    private String message;
}
