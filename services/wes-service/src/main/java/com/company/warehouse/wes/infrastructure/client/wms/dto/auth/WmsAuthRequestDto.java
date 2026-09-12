package com.company.warehouse.wes.infrastructure.client.wms.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for POST /WMS.Api/api/authentication
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WmsAuthRequestDto {

    @JsonProperty("clientId")
    private String clientId;

    @JsonProperty("clientSecret")
    private String clientSecret;
}
