package com.company.warehouse.wes.infrastructure.client.wms.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WmsAuthInterceptor implements ClientHttpRequestInterceptor {

    private final WmsTokenManager tokenManager;

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        String token = tokenManager.getBearerToken();
        if (token != null && !token.trim().isEmpty()) {
            // WMS.Api custom format: "Authentication: accessToken"
            request.getHeaders().set("Authentication", token);
            // Standard OAuth2 format: "Authorization: Bearer <token>"
            request.getHeaders().setBearerAuth(token);
        }

        if (!request.getHeaders().containsKey("X-Correlation-ID")) {
            request.getHeaders().set("X-Correlation-ID", UUID.randomUUID().toString());
        }

        request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        request.getHeaders().setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        ClientHttpResponse response = execution.execute(request, body);

        // If WMS returns 401 Unauthorized, invalidate token cache for next request
        if (response.getStatusCode().value() == 401) {
            tokenManager.invalidateToken();
        }

        return response;
    }
}
