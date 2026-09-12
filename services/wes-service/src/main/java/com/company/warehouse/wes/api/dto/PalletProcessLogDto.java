package com.company.warehouse.wes.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletProcessLogDto {
    private UUID id;
    private UUID palletId;
    private String palletLpn;
    private String processStage;
    private String location;
    private String status;
    private Map<String, Object> propertiesSnapshot;
    private String notes;
    private Instant createdAt;
}
