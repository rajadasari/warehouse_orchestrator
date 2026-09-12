package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MasterDataOverviewDto {
    private long totalMaterials;
    private long totalSkus;
    private long totalStrategies;
    private long totalCustomFields;
    private long totalPalletTypes;
    private long totalPallets;
    private long activeStagedPallets;
}
