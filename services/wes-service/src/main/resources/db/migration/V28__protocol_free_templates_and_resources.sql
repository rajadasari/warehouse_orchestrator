-- V28: Protocol-Free Resource Templates and Resources
-- Decouples domain digital twin models from communication protocols.
-- Communication protocols belong exclusively to external gateway adapters (NetworkDeviceChannel, ApiIntegrationMapping).

-- 1. Make communication_method nullable in wo.resource_template
ALTER TABLE wo.resource_template ALTER COLUMN communication_method DROP NOT NULL;

-- 2. Make protocol, host, and port nullable in wo.resource
ALTER TABLE wo.resource ALTER COLUMN protocol DROP NOT NULL;
ALTER TABLE wo.resource ALTER COLUMN host DROP NOT NULL;
ALTER TABLE wo.resource ALTER COLUMN port DROP NOT NULL;
