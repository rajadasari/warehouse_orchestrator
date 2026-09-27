-- ============================================================================
-- V17: Remove seeded resource archetype templates and unlink from existing resources
-- ============================================================================

-- 1. Unlink template_code from existing resources so resources are self-contained
UPDATE wes.resource
SET template_code = NULL
WHERE template_code IS NOT NULL;

-- 2. Clear seeded archetypes from wes.resource_template
DELETE FROM wes.resource_template
WHERE template_code IN (
    'REST_API_GENERIC',
    'WMS_REST_OAUTH2',
    'CONVEYOR_SIEMENS_S7',
    'TURNTABLE_STANDARD_90',
    'TRANSFER_PORT_AMR',
    'SCALE_METTLER_TOLEDO',
    'SCANNER_INDUSTRIAL_BARCODE'
);
