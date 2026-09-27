-- ============================================================================
-- V18: Isolate Resource Catalog into sovereign 'wo' schema
-- Decouples resource definitions and instances from satellite execution services (WES/WMS/WCS)
-- ============================================================================

-- 1. Create sovereign platform schema
CREATE SCHEMA IF NOT EXISTS wo;

-- 2. Create isolated resource_template table in 'wo'
CREATE TABLE IF NOT EXISTS wo.resource_template (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code           VARCHAR(60) NOT NULL UNIQUE,
    template_name           VARCHAR(100) NOT NULL,
    category                VARCHAR(30) NOT NULL,            -- 'PHYSICAL', 'SOFTWARE', 'VIRTUAL', 'LOGICAL'
    resource_type           VARCHAR(50) NOT NULL,            -- 'CONVEYOR', 'AGV', 'PLC', 'SCANNER', 'BIN_LOCATION', 'WMS_GATEWAY', etc.
    communication_method    VARCHAR(50) NOT NULL,            -- 'OPC_UA', 'PLC_S7', 'MODBUS_TCP', 'SERIAL', 'MQTT/VDA5050', 'REST', 'INTERNAL'
    description             VARCHAR(500),
    documentation_url       VARCHAR(500),
    property_schema         JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
    methods_schema          JSONB NOT NULL DEFAULT '[]'::jsonb,
    supported_commands      JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    version                 INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_res_tpl_code ON wo.resource_template(template_code);
CREATE INDEX IF NOT EXISTS idx_wo_res_tpl_cat ON wo.resource_template(category, resource_type);

-- 3. Create isolated resource_shape table in 'wo'
CREATE TABLE IF NOT EXISTS wo.resource_shape (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shape_code              VARCHAR(60) NOT NULL UNIQUE,
    shape_name              VARCHAR(100) NOT NULL,
    description             VARCHAR(500),
    properties              JSONB NOT NULL DEFAULT '[]'::jsonb,
    methods                 JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    version                 INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_res_shape_code ON wo.resource_shape(shape_code);

-- 4. Create isolated resource instance table in 'wo'
CREATE TABLE IF NOT EXISTS wo.resource (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id             VARCHAR(100) NOT NULL UNIQUE,
    name                    VARCHAR(255) NOT NULL,
    type                    VARCHAR(50) NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    category                VARCHAR(30) DEFAULT 'PHYSICAL',
    template_code           VARCHAR(60),
    description             VARCHAR(500),
    application             VARCHAR(100) NOT NULL DEFAULT 'WMS',
    protocol                VARCHAR(10) NOT NULL DEFAULT 'http',
    host                    VARCHAR(255) NOT NULL DEFAULT '127.0.0.1',
    port                    INT NOT NULL DEFAULT 8080,
    documentation_url       VARCHAR(500),
    custom_properties       JSONB NOT NULL DEFAULT '{}'::jsonb,
    template_properties     JSONB NOT NULL DEFAULT '{}'::jsonb,
    methods_config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    version                 INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_resource_id ON wo.resource(resource_id);
CREATE INDEX IF NOT EXISTS idx_wo_resource_type ON wo.resource(type);
CREATE INDEX IF NOT EXISTS idx_wo_resource_status ON wo.resource(status);
CREATE INDEX IF NOT EXISTS idx_wo_resource_cat ON wo.resource(category);
CREATE INDEX IF NOT EXISTS idx_wo_resource_tpl ON wo.resource(template_code);
CREATE INDEX IF NOT EXISTS idx_wo_resource_custom_props ON wo.resource USING GIN (custom_properties jsonb_path_ops);

-- 5. Create isolated resource_relationship table in 'wo'
CREATE TABLE IF NOT EXISTS wo.resource_relationship (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_resource_id      VARCHAR(100) NOT NULL REFERENCES wo.resource(resource_id) ON DELETE CASCADE,
    target_resource_id      VARCHAR(100) NOT NULL REFERENCES wo.resource(resource_id) ON DELETE CASCADE,
    relation_category       VARCHAR(30) NOT NULL,
    relation_type           VARCHAR(50) NOT NULL,
    properties              JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    version                 INT NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wo_resource_relationship UNIQUE (source_resource_id, target_resource_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_wo_res_rel_source ON wo.resource_relationship(source_resource_id);
CREATE INDEX IF NOT EXISTS idx_wo_res_rel_target ON wo.resource_relationship(target_resource_id);
CREATE INDEX IF NOT EXISTS idx_wo_res_rel_cat ON wo.resource_relationship(relation_category);

-- 6. Migrate existing data from wes.resource_template to wo.resource_template
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wes' AND table_name = 'resource_template') THEN
        INSERT INTO wo.resource_template (
            id, template_code, template_name, category, resource_type,
            communication_method, description, documentation_url,
            property_schema, default_properties, methods_schema,
            supported_commands, is_active, version, created_at, updated_at
        )
        SELECT
            id, template_code, template_name,
            CASE 
                WHEN UPPER(category) IN ('HARDWARE', 'DEVICE') THEN 'PHYSICAL'
                WHEN UPPER(category) = 'SOFTWARE' THEN 'SOFTWARE'
                WHEN UPPER(category) = 'VIRTUAL' THEN 'VIRTUAL'
                WHEN UPPER(category) = 'LOGICAL' THEN 'LOGICAL'
                ELSE 'PHYSICAL'
            END,
            resource_type,
            COALESCE(communication_protocol, 'REST'),
            description, documentation_url,
            property_schema, default_properties, methods_schema,
            supported_commands, is_active, version, created_at, updated_at
        FROM wes.resource_template
        ON CONFLICT (template_code) DO NOTHING;
    END IF;
END $$;

-- 7. Migrate existing data from wes.resource to wo.resource
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wes' AND table_name = 'resource') THEN
        INSERT INTO wo.resource (
            id, resource_id, name, type, status, category, template_code,
            description, application, protocol, host, port, documentation_url,
            custom_properties, template_properties, methods_config,
            version, created_at, updated_at
        )
        SELECT
            id, resource_id, name, type, status,
            CASE 
                WHEN UPPER(category) IN ('HARDWARE', 'DEVICE') THEN 'PHYSICAL'
                WHEN UPPER(category) = 'SOFTWARE' THEN 'SOFTWARE'
                WHEN UPPER(category) = 'VIRTUAL' THEN 'VIRTUAL'
                WHEN UPPER(category) = 'LOGICAL' THEN 'LOGICAL'
                ELSE 'PHYSICAL'
            END,
            template_code, description, application, protocol, host, port,
            documentation_url, custom_properties, template_properties, methods_config,
            version, created_at, updated_at
        FROM wes.resource
        ON CONFLICT (resource_id) DO NOTHING;
    END IF;
END $$;

-- 8. Migrate existing data from wes.resource_relationship to wo.resource_relationship
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wes' AND table_name = 'resource_relationship') THEN
        INSERT INTO wo.resource_relationship (
            id, source_resource_id, target_resource_id, relation_category,
            relation_type, properties, is_active, version, created_at, updated_at
        )
        SELECT
            r.id, r.source_resource_id, r.target_resource_id, r.relation_category,
            r.relation_type, r.properties, r.is_active, r.version, r.created_at, r.updated_at
        FROM wes.resource_relationship r
        JOIN wo.resource s ON s.resource_id = r.source_resource_id
        JOIN wo.resource t ON t.resource_id = r.target_resource_id
        ON CONFLICT (source_resource_id, target_resource_id, relation_type) DO NOTHING;
    END IF;
END $$;
