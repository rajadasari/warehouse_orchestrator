package com.company.warehouse.wes.business.spi.wms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsPreAnnounceResult {
    private boolean successful;
    private String preAnnounceId;
    private String palletLpn;
    private String errorMessage;

    public static WmsPreAnnounceResult success(String preAnnounceId, String palletLpn) {
        return WmsPreAnnounceResult.builder()
                .successful(true)
                .preAnnounceId(preAnnounceId)
                .palletLpn(palletLpn)
                .build();
    }

    public static WmsPreAnnounceResult failure(String palletLpn, String errorMessage) {
        return WmsPreAnnounceResult.builder()
                .successful(false)
                .palletLpn(palletLpn)
                .errorMessage(errorMessage)
                .build();
    }
}
