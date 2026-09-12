-- ============================================================================
-- V9: Update LOGIQS-AMBIENT-WMS resource with initial connection & auth properties
-- ============================================================================
UPDATE wes.resource
SET custom_properties = jsonb_set(
    jsonb_set(
        jsonb_set(
            jsonb_set(
                custom_properties,
                '{port}', '8089'::jsonb, true
            ),
            '{protocol}', '"http"'::jsonb, true
        ),
        '{clientId}', '"demo-client-id"'::jsonb, true
    ),
    '{clientSecret}', '"demo-client-secret"'::jsonb, true
)
WHERE resource_id = 'LOGIQS-AMBIENT-WMS';
