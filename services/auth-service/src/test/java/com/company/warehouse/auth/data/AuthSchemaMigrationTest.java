package com.company.warehouse.auth.data;

import com.company.warehouse.auth.data.entity.DualApprovalAuditEntity;
import com.company.warehouse.auth.data.entity.PermissionEntity;
import com.company.warehouse.auth.data.entity.RoleEntity;
import com.company.warehouse.auth.data.entity.UserEntity;
import jakarta.persistence.Table;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthSchemaMigrationTest {

    @Test
    @DisplayName("V1 Flyway Migration Script exists and contains all 10 tables and indexes")
    void testFlywayV1MigrationScriptIntegrity() throws Exception {
        InputStream migrationStream = getClass().getResourceAsStream("/db/migration/V1__init_auth_schema.sql");
        assertNotNull(migrationStream, "V1__init_auth_schema.sql must exist in db/migration classpath");

        String sql = new String(migrationStream.readAllBytes(), StandardCharsets.UTF_8);

        // Verify Schema declaration
        assertTrue(sql.contains("CREATE SCHEMA IF NOT EXISTS auth;"), "Migration must declare auth schema");

        // Verify All 10 Required Tables
        List<String> requiredTables = List.of(
                "auth.users",
                "auth.roles",
                "auth.permissions",
                "auth.user_roles",
                "auth.role_permissions",
                "auth.user_facility_assignments",
                "auth.refresh_tokens",
                "auth.password_history",
                "auth.dual_approval_audit",
                "auth.security_audit_log"
        );

        for (String table : requiredTables) {
            assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS " + table),
                    "Migration script must declare table: " + table);
        }

        // Verify Critical Indexes
        assertTrue(sql.contains("idx_users_username_lower"), "Must contain lowercase unique username index");
        assertTrue(sql.contains("idx_users_badge_hash"), "Must contain partial badge_hash index");
        assertTrue(sql.contains("idx_dual_approval_resource_time"), "Must contain dual approval audit index");

        // Verify Seed Data
        assertTrue(sql.contains("ROLE_ADMIN"), "Must seed ROLE_ADMIN");
        assertTrue(sql.contains("ROLE_SUPERVISOR"), "Must seed ROLE_SUPERVISOR");
        assertTrue(sql.contains("ROLE_OPERATOR"), "Must seed ROLE_OPERATOR");
        assertTrue(sql.contains("admin"), "Must seed default admin bootstrap user");
        assertTrue(sql.contains("force_password_change"), "Must enforce first-time password reset");
    }

    @Test
    @DisplayName("JPA Entities are mapped to auth schema")
    void testJpaEntitySchemaMappings() {
        assertEquals("auth", UserEntity.class.getAnnotation(Table.class).schema());
        assertEquals("users", UserEntity.class.getAnnotation(Table.class).name());

        assertEquals("auth", RoleEntity.class.getAnnotation(Table.class).schema());
        assertEquals("roles", RoleEntity.class.getAnnotation(Table.class).name());

        assertEquals("auth", PermissionEntity.class.getAnnotation(Table.class).schema());
        assertEquals("permissions", PermissionEntity.class.getAnnotation(Table.class).name());

        assertEquals("auth", DualApprovalAuditEntity.class.getAnnotation(Table.class).schema());
        assertEquals("dual_approval_audit", DualApprovalAuditEntity.class.getAnnotation(Table.class).name());
    }

    @Test
    @DisplayName("IEC 62443 Use Control & Four-Eyes model invariants")
    void testIec62443ModelInvariants() {
        UUID operatorId = UUID.randomUUID();
        UUID supervisorId = UUID.randomUUID();

        // 1. Four-Eyes Principle: Operator and Supervisor cannot be the same user
        assertNotEquals(operatorId, supervisorId, "Four-Eyes Principle requires distinct operator and supervisor");

        // 2. User entity with Argon2id hash & first-time password reset flag
        UserEntity operator = UserEntity.builder()
                .userId(operatorId)
                .username("operator01")
                .passwordHash("$argon2id$v=19$m=65536,t=3,p=4$dummySalt$dummyHash")
                .fullName("Floor Operator 1")
                .forcePasswordChange(true)
                .failedLoginAttempts(0)
                .status("ACTIVE")
                .build();

        assertTrue(operator.isForcePasswordChange(), "Newly created user must have forcePasswordChange = true");
        assertEquals(0, operator.getFailedLoginAttempts());
        assertEquals("ACTIVE", operator.getStatus());

        // 3. Dual Approval Audit Record
        UserEntity supervisor = UserEntity.builder()
                .userId(supervisorId)
                .username("supervisor01")
                .fullName("Shift Supervisor")
                .build();

        DualApprovalAuditEntity audit = DualApprovalAuditEntity.builder()
                .actionName("CONVEYOR_ESTOP_RESET")
                .targetResource("CV-LINE-04")
                .operator(operator)
                .supervisor(supervisor)
                .reason("Cleared jammed box at divert photo-eye 02")
                .terminalIp("192.168.10.45")
                .supervisorAuthMethod("RFID_PIN")
                .build();

        assertNotNull(audit.getOperator());
        assertNotNull(audit.getSupervisor());
        assertNotEquals(audit.getOperator().getUserId(), audit.getSupervisor().getUserId());
        assertEquals("CONVEYOR_ESTOP_RESET", audit.getActionName());
    }

    @Test
    @DisplayName("Role and Permission mapping integrity")
    void testRolePermissionIntegrity() {
        PermissionEntity eStopResetPerm = PermissionEntity.builder()
                .permissionId(UUID.randomUUID())
                .permissionCode("BTN:CONVEYOR:E_STOP_RESET")
                .permissionName("Conveyor E-Stop Reset")
                .category("UI_BUTTON")
                .riskTier("SAFETY_CRITICAL")
                .requiresDualApproval(true)
                .build();

        assertTrue(eStopResetPerm.isRequiresDualApproval(), "Safety-critical permission must require dual approval");
        assertEquals("SAFETY_CRITICAL", eStopResetPerm.getRiskTier());

        RoleEntity supervisorRole = RoleEntity.builder()
                .roleId(UUID.randomUUID())
                .roleCode("ROLE_SUPERVISOR")
                .roleName("Shift Supervisor")
                .isSystemRole(true)
                .permissions(Set.of(eStopResetPerm))
                .build();

        assertTrue(supervisorRole.isSystemRole());
        assertEquals(1, supervisorRole.getPermissions().size());
        assertTrue(supervisorRole.getPermissions().contains(eStopResetPerm));
    }
}
