package com.company.warehouse.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    private String username;
    private String fullName;
    private String email;
    private String role; // e.g. ROLE_OPERATOR, ROLE_SUPERVISOR, etc.
    private String facilityId;
    private String defaultZone;
    private String operatorBadgeId;
    private String password;
}
