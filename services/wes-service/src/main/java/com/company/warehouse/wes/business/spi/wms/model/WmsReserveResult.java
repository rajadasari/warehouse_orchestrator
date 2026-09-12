package com.company.warehouse.wes.business.spi.wms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsReserveResult {
    private boolean successful;
    private String reservationId;
    private String wmsOrderId;
    private String palletLpn;
    private String errorMessage;

    public static WmsReserveResult success(String reservationId, String wmsOrderId, String palletLpn) {
        return WmsReserveResult.builder()
                .successful(true)
                .reservationId(reservationId)
                .wmsOrderId(wmsOrderId)
                .palletLpn(palletLpn)
                .build();
    }

    public static WmsReserveResult failure(String errorMessage) {
        return WmsReserveResult.builder()
                .successful(false)
                .errorMessage(errorMessage)
                .build();
    }
}
