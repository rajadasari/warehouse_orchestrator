package com.company.warehouse.common.client.software.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Universal ClientHttpRequestInterceptor for external software integrations.
 * Automatically injects Bearer authorization and handles token invalidation upon HTTP 401.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements ClientHttpRequestInterceptor {

    private final TokenManager tokenManager;

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        String targetResId = request.getHeaders().getFirst("X-Target-Resource-Id");
        String token = tokenManager.getBearerToken(targetResId);
        if (token != null && !token.trim().isEmpty()) {
            // Handle Authorization header (replace <token> placeholder or setBearerAuth)
            String existingAuth = request.getHeaders().getFirst("Authorization");
            if (existingAuth != null && existingAuth.contains("<token>")) {
                request.getHeaders().set("Authorization", existingAuth.replace("<token>", token));
            } else {
                request.getHeaders().setBearerAuth(token);
            }

            // Custom format support: "Authentication: accessToken"
            String existingCustom = request.getHeaders().getFirst("Authentication");
            if (existingCustom != null && existingCustom.contains("<token>")) {
                request.getHeaders().set("Authentication", existingCustom.replace("<token>", token));
            } else if (!request.getHeaders().containsKey("Authentication")) {
                request.getHeaders().set("Authentication", token);
            }
            log.debug("Injected authentication token for outbound request to {} (Resource: {})", request.getURI(), targetResId);
        } else {
            log.warn("No authentication token available for resource '{}'. Outbound request to {} may fail with 401.", targetResId, request.getURI());
        }

        if (!request.getHeaders().containsKey("X-Correlation-ID")) {
            request.getHeaders().set("X-Correlation-ID", UUID.randomUUID().toString());
        }

        request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        request.getHeaders().setAccept(List.of(MediaType.APPLICATION_JSON));

        ClientHttpResponse response = execution.execute(request, body);

        // If target software returns 401 Unauthorized, invalidate cached token
        if (response.getStatusCode().value() == 401) {
            log.warn("Target software returned 401 Unauthorized for resource '{}' on {}. Invalidating cached token.", targetResId, request.getURI());
            tokenManager.invalidateToken(targetResId);
        }

        return response;
    }
}
