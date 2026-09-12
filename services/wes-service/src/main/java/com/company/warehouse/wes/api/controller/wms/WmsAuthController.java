package com.company.warehouse.wes.api.controller.wms;

import com.company.warehouse.wes.infrastructure.client.wms.auth.WmsTokenManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/wes/wms/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WmsAuthController {

    private final WmsTokenManager tokenManager;

    /**
     * Obtains or refreshes the access token and caches it in memory for all subsequent transactions.
     */
    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> acquireToken() {
        String token = tokenManager.getBearerToken();
        WmsTokenManager.TokenStatus status = tokenManager.getStatus();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "token", token,
                "status", status,
                "message", "Access token acquired and saved in WES memory for future transactions"
        ));
    }

    /**
     * Force refreshes the token immediately from the WMS authentication API.
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> forceRefreshToken() {
        String token = tokenManager.forceRefreshToken();
        WmsTokenManager.TokenStatus status = tokenManager.getStatus();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "token", token,
                "status", status,
                "message", "Access token forcefully refreshed and saved"
        ));
    }

    /**
     * Returns the current token cache status and expiration timestamp.
     */
    @GetMapping("/status")
    public ResponseEntity<WmsTokenManager.TokenStatus> getTokenStatus() {
        return ResponseEntity.ok(tokenManager.getStatus());
    }

    /**
     * Invalidates the cached token.
     */
    @PostMapping("/invalidate")
    public ResponseEntity<Map<String, Object>> invalidateToken() {
        tokenManager.invalidateToken();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Cached WMS token invalidated"
        ));
    }
}
