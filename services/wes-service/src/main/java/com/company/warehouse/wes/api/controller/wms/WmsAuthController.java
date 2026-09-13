package com.company.warehouse.wes.api.controller.wms;

import com.company.warehouse.common.client.software.auth.TokenManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/wes/wms/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WmsAuthController {

    private final TokenManager tokenManager;

    /**
     * Obtains or refreshes the access token and caches it in memory for all subsequent transactions.
     */
    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> acquireToken(@RequestParam(required = false) String resourceId) {
        String token = tokenManager.getBearerToken(resourceId);
        TokenManager.TokenStatus status = tokenManager.getStatus(resourceId);
        boolean hasToken = token != null && !token.trim().isEmpty();

        if (hasToken) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "token", token,
                    "status", status,
                    "message", "Access token acquired and saved in WES memory for future transactions"
            ));
        } else {
            String errorMsg = status.getLastError() != null
                    ? status.getLastError()
                    : "Failed to acquire token from WMS auth endpoint " + status.getAuthEndpoint();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "token", "",
                    "status", status,
                    "error", errorMsg,
                    "message", "Authentication failed: " + errorMsg
            ));
        }
    }

    /**
     * Force refreshes the token immediately from the WMS authentication API.
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> forceRefreshToken(@RequestParam(required = false) String resourceId) {
        String token = tokenManager.forceRefreshToken(resourceId);
        TokenManager.TokenStatus status = tokenManager.getStatus(resourceId);
        boolean hasToken = token != null && !token.trim().isEmpty();

        if (hasToken) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "token", token,
                    "status", status,
                    "message", "Access token forcefully refreshed and saved"
            ));
        } else {
            String errorMsg = status.getLastError() != null
                    ? status.getLastError()
                    : "Failed to refresh token from WMS auth endpoint " + status.getAuthEndpoint();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "token", "",
                    "status", status,
                    "error", errorMsg,
                    "message", "Authentication refresh failed: " + errorMsg
            ));
        }
    }

    /**
     * Tests live authentication with user-configured properties/credentials before or after saving.
     */
    @PostMapping("/test-connection")
    public ResponseEntity<TokenManager.TokenTestResult> testConnection(@org.springframework.web.bind.annotation.RequestBody(required = false) TestAuthConnectionRequest request) {
        String resId = request != null ? request.resourceId() : null;
        String baseUrl = request != null ? request.baseUrl() : null;
        String tokenPath = request != null ? request.tokenPath() : null;
        String clientId = request != null ? request.clientId() : null;
        String clientSecret = request != null ? request.clientSecret() : null;

        TokenManager.TokenTestResult result = tokenManager.testAndCacheToken(resId, baseUrl, tokenPath, clientId, clientSecret);
        return ResponseEntity.ok(result);
    }

    public record TestAuthConnectionRequest(
            String resourceId,
            String baseUrl,
            String tokenPath,
            String clientId,
            String clientSecret
    ) {}

    /**
     * Returns the current token cache status and expiration timestamp.
     */
    @GetMapping("/status")
    public ResponseEntity<TokenManager.TokenStatus> getTokenStatus(@RequestParam(required = false) String resourceId) {
        return ResponseEntity.ok(tokenManager.getStatus(resourceId));
    }

    /**
     * Invalidates the cached token.
     */
    @PostMapping("/invalidate")
    public ResponseEntity<Map<String, Object>> invalidateToken(@RequestParam(required = false) String resourceId) {
        tokenManager.invalidateToken(resourceId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Cached WMS token invalidated"
        ));
    }
}
