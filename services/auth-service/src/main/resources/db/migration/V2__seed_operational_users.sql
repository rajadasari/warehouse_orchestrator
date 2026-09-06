-- ==============================================================================
-- Migration V2: Seed Operational Warehouse Users & Facility Mappings
-- IEC 62443 Standard Identity & Access Management Demonstration Dataset
-- ==============================================================================

-- 1. Insert Operational Users
INSERT INTO auth.users (
    user_id, username, password_hash, full_name, email, operator_badge_id,
    sso_provider, status, force_password_change, failed_login_attempts
)
VALUES 
    (
        '00000000-0000-0000-0002-000000000002',
        'rkumar',
        '$argon2id$v=19$m=65536,t=3,p=4$d2FyZWhvdXNlc2FsdA$uE9PqvjU7hY/Z2nO2YtGv8hB8qL4xN9mK1sT3vW5yR0',
        'Rajesh Kumar',
        'rkumar@warehouse.local',
        'BADGE-SUP-014',
        'LOCAL',
        'ACTIVE',
        FALSE,
        0
    ),
    (
        '00000000-0000-0000-0002-000000000003',
        'anita.s',
        '$argon2id$v=19$m=65536,t=3,p=4$d2FyZWhvdXNlc2FsdA$uE9PqvjU7hY/Z2nO2YtGv8hB8qL4xN9mK1sT3vW5yR0',
        'Anita Sharma',
        'anita.s@corp.azure.com',
        'BADGE-OP-089',
        'AZURE_AD',
        'ACTIVE',
        FALSE,
        0
    ),
    (
        '00000000-0000-0000-0002-000000000004',
        'mverma',
        '$argon2id$v=19$m=65536,t=3,p=4$d2FyZWhvdXNlc2FsdA$uE9PqvjU7hY/Z2nO2YtGv8hB8qL4xN9mK1sT3vW5yR0',
        'Manoj Verma',
        'mverma@warehouse.local',
        'BADGE-MNT-003',
        'LOCAL',
        'ACTIVE',
        TRUE,
        0
    ),
    (
        '00000000-0000-0000-0002-000000000005',
        'dchen',
        '$argon2id$v=19$m=65536,t=3,p=4$d2FyZWhvdXNlc2FsdA$uE9PqvjU7hY/Z2nO2YtGv8hB8qL4xN9mK1sT3vW5yR0',
        'David Chen',
        'dchen@warehouse.local',
        'BADGE-OP-112',
        'LOCAL',
        'ACTIVE',
        FALSE,
        1
    )
ON CONFLICT (username) DO NOTHING;

-- 2. Assign Roles to Operational Users
-- rkumar -> ROLE_SUPERVISOR
INSERT INTO auth.user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- anita.s -> ROLE_OPERATOR
INSERT INTO auth.user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- mverma -> ROLE_MAINTENANCE
INSERT INTO auth.user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- dchen -> ROLE_OPERATOR
INSERT INTO auth.user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- 3. Assign Default Facilities & Zones
INSERT INTO auth.user_facility_assignments (assignment_id, user_id, facility_id, default_zone, shift_code, is_primary)
VALUES 
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000002', 'FAC-BLR-01', 'HIGH_BAY_ASRS', 'SHIFT_A', TRUE),
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000003', 'FAC-BLR-01', 'INBOUND_STAGING', 'SHIFT_A', TRUE),
    ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000004', 'FAC-BLR-01', 'CONVEYOR_MEZZANINE', 'SHIFT_B', TRUE),
    ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000005', 'FAC-BLR-01', 'OUTBOUND_DOCK', 'SHIFT_B', TRUE)
ON CONFLICT (user_id, facility_id) DO NOTHING;
