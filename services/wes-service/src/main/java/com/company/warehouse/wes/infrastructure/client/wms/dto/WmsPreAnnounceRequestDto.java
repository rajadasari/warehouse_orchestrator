package com.company.warehouse.wes.infrastructure.client.wms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Filtered projection payload sent to Third-Party WMS for Pallet Pre-Announcement.
 * Omits internal WES strategies, operator IDs, and validation tier states.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsPreAnnounceRequestDto {

    private String palletLpn;
    private String palletTypeCode;
    private String itemCode;
    private String skuCode;
    private BigDecimal quantity;
    private String uom;
    private String lotNumber;
    private LocalDate expiryDate;
    private BigDecimal grossWeightKg;
    private String receivingLocation;
    private String receiptTimestamp;
}
