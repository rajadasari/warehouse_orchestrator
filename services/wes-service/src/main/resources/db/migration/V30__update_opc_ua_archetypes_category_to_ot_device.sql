-- V30__update_opc_ua_archetypes_category_to_ot_device.sql
-- Update standard industrial OPC UA templates to OT_DEVICE category

UPDATE wo.resource_template
SET category = 'OT_DEVICE'
WHERE template_code IN ('OPC_UA_CLIENT', 'OPC_UA_SERVER');
