package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsCreateOrderResponseDto {

    private boolean success;
    private String wmsOrderId;
    private String orderNumber;
    private String status; // 'CREATED', 'FAILED'
    private String message;
}
