package com.company.warehouse.wes.infrastructure.client.wms.dto.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WmsAuthResponseDto {

    @JsonAlias({"accessToken", "access_token", "token", "jwt", "id_token"})
    private String accessToken;

    @JsonAlias({"tokenType", "token_type"})
    private String tokenType;

    @JsonAlias({"expiresIn", "expires_in", "expire_in"})
    private Long expiresIn;
}
