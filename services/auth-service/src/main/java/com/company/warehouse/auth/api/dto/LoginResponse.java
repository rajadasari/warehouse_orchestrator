package com.company.warehouse.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String userId;
    private String username;
    private String fullName;
    private String email;
    private String role;
    private String roleName;
    private List<String> permissions;
    private String facilityId;
    private String defaultZone;
    private String ssoProvider;
    private String status;
    private boolean forcePasswordChange;
}
