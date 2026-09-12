package com.company.warehouse.wes.business.spi.wms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsOutboundResult {
    private boolean successful;
    private String wmsOrderId;
    private String palletLpn;
    private String outboundStageSpur;
    private String errorMessage;

    public static WmsOutboundResult success(String wmsOrderId, String palletLpn, String outboundStageSpur) {
        return WmsOutboundResult.builder()
                .successful(true)
                .wmsOrderId(wmsOrderId)
                .palletLpn(palletLpn)
                .outboundStageSpur(outboundStageSpur)
                .build();
    }

    public static WmsOutboundResult failure(String errorMessage) {
        return WmsOutboundResult.builder()
                .successful(false)
                .errorMessage(errorMessage)
                .build();
    }
}
