package com.company.warehouse.wes.business.spi.wms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsOrderResult {
    private boolean successful;
    private String wmsOrderId;
    private String orderNumber;
    private String errorMessage;

    public static WmsOrderResult success(String wmsOrderId, String orderNumber) {
        return WmsOrderResult.builder()
                .successful(true)
                .wmsOrderId(wmsOrderId)
                .orderNumber(orderNumber)
                .build();
    }

    public static WmsOrderResult failure(String errorMessage) {
        return WmsOrderResult.builder()
                .successful(false)
                .errorMessage(errorMessage)
                .build();
    }
}
