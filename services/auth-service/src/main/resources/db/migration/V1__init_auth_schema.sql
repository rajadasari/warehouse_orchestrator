-- ==============================================================================
-- Flyway Migration: V1__init_auth_schema.sql
-- Description: Initialize User Management & Authentication Schema (IEC 62443 / NIST)
-- Schema: auth
-- ==============================================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Schema
CREATE SCHEMA IF NOT EXISTS auth;

-- ==============================================================================
-- Table 1: auth.users
-- Core identity store for operators, supervisors, and administrators
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.users (
    user_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username                VARCHAR(64) NOT NULL,
    password_hash           VARCHAR(255),
    full_name               VARCHAR(128) NOT NULL,
    email                   VARCHAR(128),
    phone_number            VARCHAR(32),
    operator_badge_id       VARCHAR(64),
    badge_hash              VARCHAR(255),
    pin_hash                VARCHAR(255),
    sso_provider            VARCHAR(32) NOT NULL DEFAULT 'LOCAL',
    sso_external_id         VARCHAR(128),
    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    force_password_change   BOOLEAN NOT NULL DEFAULT TRUE,
    password_changed_at     TIMESTAMPTZ,
    failed_login_attempts   INTEGER NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ,
    last_login_at           TIMESTAMPTZ,
    last_login_ip           VARCHAR(45),
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    version                 INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_operator_badge_id UNIQUE (operator_badge_id),
    CONSTRAINT chk_users_username_len CHECK (char_length(username) >= 3),
    CONSTRAINT chk_users_sso_provider CHECK (sso_provider IN ('LOCAL', 'AZURE_AD', 'OKTA', 'KEYCLOAK', 'OIDC')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'LOCKED', 'SUSPENDED', 'DEACTIVATED')),
    CONSTRAINT chk_users_failed_attempts CHECK (failed_login_attempts >= 0)
);

-- ==============================================================================
-- Table 2: auth.roles
-- Standard operational and administrative roles in the warehouse hierarchy
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.roles (
    role_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code               VARCHAR(64) NOT NULL,
    role_name               VARCHAR(128) NOT NULL,
    description             VARCHAR(255),
    is_system_role          BOOLEAN NOT NULL DEFAULT FALSE,
    version                 INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_roles_role_code UNIQUE (role_code)
);

-- ==============================================================================
-- Table 3: auth.permissions
-- Granular security tokens granting access to UI pages, buttons, and API mutations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.permissions (
    permission_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code         VARCHAR(64) NOT NULL,
    permission_name         VARCHAR(128) NOT NULL,
    category                VARCHAR(32) NOT NULL,
    risk_tier               VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    requires_dual_approval  BOOLEAN NOT NULL DEFAULT FALSE,
    description             VARCHAR(255),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_permissions_code UNIQUE (permission_code),
    CONSTRAINT chk_permissions_category CHECK (category IN ('UI_PAGE', 'UI_BUTTON', 'API_MUTATION', 'SYSTEM_ADMIN')),
    CONSTRAINT chk_permissions_risk_tier CHECK (risk_tier IN ('MONITORING', 'STANDARD', 'SAFETY_CRITICAL'))
);

-- ==============================================================================
-- Table 4: auth.user_roles (Junction)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.user_roles (
    user_id                 UUID NOT NULL,
    role_id                 UUID NOT NULL,
    assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by             UUID,

    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES auth.users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES auth.roles (role_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth.users (user_id) ON DELETE SET NULL
);

-- ==============================================================================
-- Table 5: auth.role_permissions (Junction)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.role_permissions (
    role_id                 UUID NOT NULL,
    permission_id           UUID NOT NULL,
    assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by             UUID,

    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES auth.roles (role_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_perm FOREIGN KEY (permission_id) REFERENCES auth.permissions (permission_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth.users (user_id) ON DELETE SET NULL
);

-- ==============================================================================
-- Table 6: auth.user_facility_assignments
-- Multi-facility and operational zone scoping (IDOR prevention)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.user_facility_assignments (
    assignment_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    facility_id             VARCHAR(64) NOT NULL,
    default_zone            VARCHAR(32),
    shift_code              VARCHAR(32),
    is_primary              BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_facility UNIQUE (user_id, facility_id),
    CONSTRAINT fk_facility_assignments_user FOREIGN KEY (user_id) REFERENCES auth.users (user_id) ON DELETE CASCADE
);

-- ==============================================================================
-- Table 7: auth.refresh_tokens
-- Refresh token lifecycle, rotation, and revocation
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    token_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    token_hash              VARCHAR(255) NOT NULL,
    terminal_ip             VARCHAR(45) NOT NULL,
    user_agent              VARCHAR(255),
    device_fingerprint      VARCHAR(128),
    expires_at              TIMESTAMPTZ NOT NULL,
    is_revoked              BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at              TIMESTAMPTZ,
    revoked_reason          VARCHAR(64),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES auth.users (user_id) ON DELETE CASCADE
);

-- ==============================================================================
-- Table 8: auth.password_history
-- NIST SP 800-63B password rotation prevention (last 5 passwords)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.password_history (
    history_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_password_history_user FOREIGN KEY (user_id) REFERENCES auth.users (user_id) ON DELETE CASCADE
);

-- ==============================================================================
-- Table 9: auth.dual_approval_audit
-- IEC 62443 SR 2.4 Four-Eyes Principle approval trail
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.dual_approval_audit (
    approval_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name             VARCHAR(128) NOT NULL,
    target_resource         VARCHAR(128) NOT NULL,
    operator_user_id        UUID NOT NULL,
    supervisor_user_id      UUID NOT NULL,
    reason                  VARCHAR(255) NOT NULL,
    terminal_ip             VARCHAR(45) NOT NULL,
    supervisor_auth_method  VARCHAR(32) NOT NULL DEFAULT 'RFID_PIN',
    approved_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dual_approval_different_users CHECK (operator_user_id <> supervisor_user_id),
    CONSTRAINT chk_dual_approval_method CHECK (supervisor_auth_method IN ('RFID_PIN', 'PASSWORD', 'BIOMETRIC')),
    CONSTRAINT fk_dual_approval_operator FOREIGN KEY (operator_user_id) REFERENCES auth.users (user_id),
    CONSTRAINT fk_dual_approval_supervisor FOREIGN KEY (supervisor_user_id) REFERENCES auth.users (user_id)
);

-- ==============================================================================
-- Table 10: auth.security_audit_log
-- Forensic security events trail (logins, lockouts, changes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.security_audit_log (
    log_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type              VARCHAR(64) NOT NULL,
    user_id                 UUID,
    username_attempted      VARCHAR(64),
    terminal_ip             VARCHAR(45) NOT NULL,
    user_agent              VARCHAR(255),
    status                  VARCHAR(32) NOT NULL,
    details                 JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_security_audit_status CHECK (status IN ('SUCCESS', 'FAILURE', 'BLOCKED', 'ERROR')),
    CONSTRAINT fk_security_audit_user FOREIGN KEY (user_id) REFERENCES auth.users (user_id) ON DELETE SET NULL
);

-- ==============================================================================
-- High-Performance B-Tree and Partial Indexes
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON auth.users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_badge_hash ON auth.users (badge_hash) WHERE badge_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_sso_lookup ON auth.users (sso_provider, sso_external_id) WHERE sso_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active_lookup ON auth.users (user_id, status) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON auth.refresh_tokens (user_id) WHERE is_revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_password_history_user_recent ON auth.password_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dual_approval_resource_time ON auth.dual_approval_audit (target_resource, approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_time ON auth.security_audit_log (event_type, created_at DESC);

-- ==============================================================================
-- Initial Bootstrap Seed Data
-- ==============================================================================

-- 1. System Roles
INSERT INTO auth.roles (role_id, role_code, role_name, description, is_system_role)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'ROLE_ADMIN', 'Platform Administrator', 'Full administrative authority across security and system configurations', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'ROLE_SUPERVISOR', 'Warehouse Shift Supervisor', 'Supervisory management, order wave release, and Four-Eyes override approval', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'ROLE_OPERATOR', 'Warehouse Floor Operator', 'Shop-floor operations, pallet pick/pack, and conveyor monitoring', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'ROLE_MAINTENANCE', 'OT / Automation Engineer', 'PLC equipment diagnostics, crane calibrations, and sensor maintenance', TRUE),
    ('00000000-0000-0000-0000-000000000005', 'ROLE_AUDITOR', 'Compliance & Security Auditor', 'Read-only access to forensic audit trails and IEC 62443 logs', TRUE)
ON CONFLICT (role_code) DO NOTHING;

-- 2. Core Seed Permissions
INSERT INTO auth.permissions (permission_id, permission_code, permission_name, category, risk_tier, requires_dual_approval, description)
VALUES
    ('00000000-0000-0000-0001-000000000001', 'PAGE:DASHBOARD:VIEW', 'View Executive Operations Dashboard', 'UI_PAGE', 'MONITORING', FALSE, 'Grants access to main operations overview'),
    ('00000000-0000-0000-0001-000000000002', 'PAGE:USERS:MANAGE', 'Manage Users & Operator Badges', 'UI_PAGE', 'STANDARD', FALSE, 'User provisioning and role assignment'),
    ('00000000-0000-0000-0001-000000000003', 'PAGE:CONVEYORS:VIEW', 'View Conveyor Subsystem', 'UI_PAGE', 'MONITORING', FALSE, 'Monitor floor conveyors and diverts'),
    ('00000000-0000-0000-0001-000000000004', 'PAGE:ASRS:VIEW', 'View High-Bay ASRS Subsystem', 'UI_PAGE', 'MONITORING', FALSE, 'Monitor high-bay cranes and racks'),
    ('00000000-0000-0000-0001-000000000005', 'PAGE:FLEET:VIEW', 'View AGV / AMR Fleet', 'UI_PAGE', 'MONITORING', FALSE, 'Monitor robot positions and telemetry'),
    ('00000000-0000-0000-0001-000000000006', 'BTN:CONVEYOR:E_STOP_RESET', 'Conveyor Emergency Stop Reset', 'UI_BUTTON', 'SAFETY_CRITICAL', TRUE, 'Requires supervisor dual authorization to reset line after E-Stop'),
    ('00000000-0000-0000-0001-000000000007', 'BTN:CRANE:MANUAL_BYPASS', 'ASRS Crane Manual Kinematic Bypass', 'UI_BUTTON', 'SAFETY_CRITICAL', TRUE, 'Requires supervisor dual authorization to manually bypass crane interlocks'),
    ('00000000-0000-0000-0001-000000000008', 'API:USER:CREATE', 'Create Platform User', 'API_MUTATION', 'STANDARD', FALSE, 'Backend API mutation to create users'),
    ('00000000-0000-0000-0001-000000000009', 'API:USER:UPDATE', 'Update Platform User', 'API_MUTATION', 'STANDARD', FALSE, 'Backend API mutation to update user profiles')
ON CONFLICT (permission_code) DO NOTHING;

-- 3. Map All Permissions to ROLE_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', permission_id 
FROM auth.permissions
ON CONFLICT DO NOTHING;

-- 4. Default Bootstrap Admin User
-- Initial password is 'TempIDP@2026!' with force_password_change = TRUE (IEC 62443 compliance)
-- Hash generated using Argon2id ($argon2id$v=19$m=65536,t=3,p=4$...)
INSERT INTO auth.users (
    user_id, username, password_hash, full_name, email, sso_provider, 
    status, force_password_change, failed_login_attempts
)
VALUES (
    '00000000-0000-0000-0002-000000000001',
    'admin',
    '$argon2id$v=19$m=65536,t=3,p=4$d2FyZWhvdXNlc2FsdA$uE9PqvjU7hY/Z2nO2YtGv8hB8qL4xN9mK1sT3vW5yR0',
    'System Administrator',
    'admin@warehouse.local',
    'LOCAL',
    'ACTIVE',
    TRUE,
    0
)
ON CONFLICT (username) DO NOTHING;

-- 5. Assign ROLE_ADMIN to default admin user
INSERT INTO auth.user_roles (user_id, role_id)
VALUES (
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- 6. Assign Default Facility (FAC-BLR-01)
INSERT INTO auth.user_facility_assignments (assignment_id, user_id, facility_id, default_zone, is_primary)
VALUES (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0002-000000000001',
    'FAC-BLR-01',
    'CENTRAL_CONTROL',
    TRUE
)
ON CONFLICT DO NOTHING;
