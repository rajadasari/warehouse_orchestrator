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
public class RoleDto {
    private String id;
    private String roleCode;
    private String roleName;
    private String description;
    private boolean isSystemRole;
    private List<String> permissions;
}
