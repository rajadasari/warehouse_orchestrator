package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsOutboundReleaseRequestDto {

    private String wmsOrderId;
    private String palletLpn;
    private String targetLocation; // e.g. 'OUTBOUND-STAGE-01'
    private String dispatchCarrier;
}
