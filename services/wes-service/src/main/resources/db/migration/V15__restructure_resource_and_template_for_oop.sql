-- ============================================================================
-- V15: Restructure wes.resource and wes.resource_template for OOP Architecture
--      Adds first-class host, port, protocol, application, doc_url, and methods
-- ============================================================================

-- 1. Enhance wes.resource_template with OOP Class metadata & default coordinates
ALTER TABLE wes.resource_template 
ADD COLUMN IF NOT EXISTS description VARCHAR(500),
ADD COLUMN IF NOT EXISTS application VARCHAR(100) NOT NULL DEFAULT 'GENERIC_REST_APP',
ADD COLUMN IF NOT EXISTS default_protocol VARCHAR(10) NOT NULL DEFAULT 'http',
ADD COLUMN IF NOT EXISTS default_host VARCHAR(255) DEFAULT '127.0.0.1',
ADD COLUMN IF NOT EXISTS default_port INT NOT NULL DEFAULT 8080,
ADD COLUMN IF NOT EXISTS documentation_url VARCHAR(500) DEFAULT '/docs/apps/generic-rest.html',
ADD COLUMN IF NOT EXISTS methods_schema JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_resource_template_app ON wes.resource_template(application);

-- 2. Enhance wes.resource with first-class connection coordinates, application & methods
ALTER TABLE wes.resource
ADD COLUMN IF NOT EXISTS description VARCHAR(500),
ADD COLUMN IF NOT EXISTS application VARCHAR(100) NOT NULL DEFAULT 'WMS',
ADD COLUMN IF NOT EXISTS protocol VARCHAR(10) NOT NULL DEFAULT 'http',
ADD COLUMN IF NOT EXISTS host VARCHAR(255) NOT NULL DEFAULT '127.0.0.1',
ADD COLUMN IF NOT EXISTS port INT NOT NULL DEFAULT 8080,
ADD COLUMN IF NOT EXISTS documentation_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS methods_config JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_resource_app ON wes.resource(application);
CREATE INDEX IF NOT EXISTS idx_resource_host_port ON wes.resource(host, port);

-- 3. Seed Archetype Template: REST_API_GENERIC
INSERT INTO wes.resource_template (
    template_code, template_name, description, application, category, resource_type, communication_protocol,
    default_protocol, default_host, default_port, documentation_url,
    property_schema, default_properties, methods_schema
) VALUES (
    'REST_API_GENERIC',
    'Generic HTTP/REST Software Archetype',
    'Configurable HTTP/REST interface supporting OAuth2, API Key, Basic Auth, and dynamic endpoint dispatch.',
    'GENERIC_REST_APP',
    'SOFTWARE',
    'REST_GENERIC',
    'REST',
    'http',
    '127.0.0.1',
    8080,
    '/docs/apps/generic-rest.html',
    '[
      {"key": "host", "label": "Host / IP Address", "type": "STRING", "required": true, "defaultValue": "127.0.0.1"},
      {"key": "port", "label": "Default HTTP Port", "type": "NUMBER", "required": true, "defaultValue": 8080},
      {"key": "protocol", "label": "HTTP Protocol", "type": "ENUM", "options": ["http", "https"], "defaultValue": "http"},
      {"key": "timeoutMs", "label": "Timeout (ms)", "type": "NUMBER", "defaultValue": 5000}
    ]'::jsonb,
    '{"host": "127.0.0.1", "port": 8080, "protocol": "http", "timeoutMs": 5000}'::jsonb,
    '[
      {
        "name": "AUTHENTICATE",
        "type": "AUTHENTICATION",
        "description": "Acquires and validates access credentials or authentication tokens from the server.",
        "supportedStrategies": ["OAUTH2_TOKEN_ENDPOINT", "API_KEY_HEADER", "BASIC_AUTH_HEADER", "NONE"],
        "safetyTier": "READ_ONLY"
      },
      {
        "name": "HEALTH_CHECK",
        "type": "DIAGNOSTIC",
        "description": "Tests connectivity and responsiveness of the target software endpoint.",
        "supportedStrategies": ["PING_ENDPOINT"],
        "safetyTier": "READ_ONLY"
      },
      {
        "name": "DISPATCH_API",
        "type": "EXECUTION",
        "description": "Dispatches structured payload to a specific API path with optional port override.",
        "supportedStrategies": ["HTTP_REQUEST"],
        "safetyTier": "OPERATIONAL"
      }
    ]'::jsonb
) ON CONFLICT (template_code) DO UPDATE 
SET template_name = EXCLUDED.template_name,
    description = EXCLUDED.description,
    application = EXCLUDED.application,
    property_schema = EXCLUDED.property_schema,
    default_properties = EXCLUDED.default_properties,
    methods_schema = EXCLUDED.methods_schema;

-- 4. Update LOGIQS-AMBIENT-WMS with clean coordinates from its existing custom properties
UPDATE wes.resource
SET host = COALESCE(custom_properties->>'ip', host),
    port = COALESCE((custom_properties->>'port')::int, 8089),
    protocol = COALESCE(custom_properties->>'protocol', 'http'),
    application = 'LOGIQS_WMS',
    description = 'Third-Party Ambient Warehouse Management System',
    documentation_url = '/docs/apps/wms-integration.html'
WHERE resource_id = 'LOGIQS-AMBIENT-WMS';
