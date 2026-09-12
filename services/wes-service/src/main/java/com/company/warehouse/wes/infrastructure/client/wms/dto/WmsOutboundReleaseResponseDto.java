package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsOutboundReleaseResponseDto {

    private boolean success;
    private String wmsOrderId;
    private String palletLpn;
    private String status; // 'RELEASED', 'RELEASE_FAILED'
    private String outboundStageSpur;
    private String message;
}
