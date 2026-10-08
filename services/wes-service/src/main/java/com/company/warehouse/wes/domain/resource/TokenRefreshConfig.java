package com.company.warehouse.wes.domain.resource;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * User-configurable token invalidation and reactive re-authentication policy.
 * Controls which HTTP status codes and response patterns trigger an automatic
 * token refresh and retry cycle.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TokenRefreshConfig {

    private String responseTokenProperty;
    private String invalidationStatusCodes; // e.g. "401, 403, 419"
    private String invalidationBodyMatch;   // e.g. "TOKEN_EXPIRED"
    private Integer maxRetries;             // 1, 2, 3

    public List<Integer> getParsedStatusCodes() {
        if (invalidationStatusCodes == null || invalidationStatusCodes.trim().isEmpty()) {
            return List.of(401, 403);
        }
        return Arrays.stream(invalidationStatusCodes.split("[,\\s]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .filter(s -> s.matches("\\d+"))
                .map(Integer::parseInt)
                .collect(Collectors.toList());
    }

    public int getEffectiveMaxRetries() {
        return (maxRetries != null && maxRetries > 0 && maxRetries <= 5) ? maxRetries : 1;
    }

    public boolean matches(int statusCode, String responseBody) {
        if (getParsedStatusCodes().contains(statusCode)) {
            return true;
        }
        if (invalidationBodyMatch != null && !invalidationBodyMatch.trim().isEmpty() && responseBody != null) {
            return responseBody.contains(invalidationBodyMatch.trim());
        }
        return false;
    }

    public static TokenRefreshConfig fromJson(String json) {
        if (json == null || json.trim().isEmpty() || "[]".equals(json.trim()) || "{}".equals(json.trim())) {
            return null;
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, TokenRefreshConfig.class);
        } catch (Exception e) {
            return null;
        }
    }
}
