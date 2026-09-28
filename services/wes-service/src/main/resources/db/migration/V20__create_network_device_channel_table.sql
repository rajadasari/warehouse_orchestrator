-- ============================================================================
-- V20: Create Network Device Channel Table for Multi-Protocol Connectivity Server
-- Supports Kepware-style industrial connectivity: OPC-UA, Modbus TCP, Siemens S7, MQTT
-- ============================================================================

CREATE TABLE IF NOT EXISTS wo.network_device_channel (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_code            VARCHAR(80)  NOT NULL UNIQUE,
    channel_name            VARCHAR(120) NOT NULL,
    device_type             VARCHAR(80)  NOT NULL DEFAULT 'PLC',
    protocol                VARCHAR(40)  NOT NULL,            -- 'OPC_UA', 'MODBUS_TCP', 'SIEMENS_S7', 'MQTT_SPARKPLUG', 'REST_HTTP'
    endpoint_url            VARCHAR(500) NOT NULL,            -- e.g. 'opc.tcp://192.168.1.100:4840'
    status                  VARCHAR(30)  NOT NULL DEFAULT 'ONLINE', -- 'ONLINE', 'STANDBY', 'FAULT', 'DISCONNECTED'
    security_policy         VARCHAR(100) DEFAULT 'Basic256Sha256 - Sign & Encrypt',
    auth_type               VARCHAR(50)  DEFAULT 'ANONYMOUS', -- 'ANONYMOUS', 'USERNAME_PASSWORD', 'CERTIFICATE'
    tags_count              INTEGER      DEFAULT 0,
    latency_ms              DOUBLE PRECISION DEFAULT 3.5,
    session_timeout_ms      INTEGER      DEFAULT 60000,
    reconnect_interval_ms   INTEGER      DEFAULT 3000,
    config                  JSONB        NOT NULL DEFAULT '{}'::jsonb, -- dynamic credentials, certificates, tag groups
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_net_chan_code ON wo.network_device_channel(channel_code);
CREATE INDEX IF NOT EXISTS idx_wo_net_chan_proto ON wo.network_device_channel(protocol);
CREATE INDEX IF NOT EXISTS idx_wo_net_chan_status ON wo.network_device_channel(status);

-- Seed Foundational Industrial Device Channels
INSERT INTO wo.network_device_channel (
    channel_code, channel_name, device_type, protocol, endpoint_url, status, security_policy, auth_type, tags_count, latency_ms, config
) VALUES 
(
    'SIEMENS_S7_1500_LINE_1',
    'Siemens S7-1500 Infeed PLC',
    'Conveyor & Divert Controller',
    'OPC_UA',
    'opc.tcp://192.168.1.100:4840',
    'ONLINE',
    'Basic256Sha256 - Sign & Encrypt',
    'Username / Password',
    28,
    3.4,
    '{"username": "admin", "tagPrefix": "DB100_INFEED"}'::jsonb
),
(
    'ROCKWELL_CONTROLLOGIX_OUTFEED',
    'Rockwell ControlLogix Outfeed',
    'Pallet Staging & Stretch Wrapper',
    'OPC_UA',
    'opc.tcp://192.168.1.105:4840',
    'ONLINE',
    'Basic256Sha256 - Sign & Encrypt',
    'Anonymous',
    16,
    4.1,
    '{"tagPrefix": "DB200_OUTFEED"}'::jsonb
),
(
    'BECKHOFF_TWINCAT_AGV',
    'Beckhoff TwinCAT AGV Dispatcher',
    'Autonomous Mobile Robot Fleet',
    'OPC_UA',
    'opc.tcp://192.168.1.110:4840',
    'ONLINE',
    'None',
    'Anonymous',
    42,
    2.8,
    '{"tagPrefix": "AGV_DISPATCH"}'::jsonb
),
(
    'KUKA_ROBOT_CELL_01',
    'Kuka Palletizing Robot Arm',
    '6-Axis Palletizing Cell',
    'OPC_UA',
    'opc.tcp://192.168.1.120:4840',
    'STANDBY',
    'Basic256Sha256 - Sign & Encrypt',
    'X.509 Certificate',
    12,
    6.2,
    '{"tagPrefix": "KUKA_CELL_01"}'::jsonb
)
ON CONFLICT (channel_code) DO NOTHING;
