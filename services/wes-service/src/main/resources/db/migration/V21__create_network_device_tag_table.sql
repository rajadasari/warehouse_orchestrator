-- ============================================================================
-- V21: Create Network Device Tag Table for Industrial Channel Address Space
-- Stores browsed and live-monitored PLC/device tags dynamically per channel
-- ============================================================================

CREATE TABLE IF NOT EXISTS wo.network_device_tag (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id              UUID NOT NULL REFERENCES wo.network_device_channel(id) ON DELETE CASCADE,
    tag_name                VARCHAR(120) NOT NULL,
    node_id                 VARCHAR(250) NOT NULL,
    folder_path             VARCHAR(120) NOT NULL DEFAULT 'Root',
    data_type               VARCHAR(50)  NOT NULL DEFAULT 'String',
    quality                 VARCHAR(50)  NOT NULL DEFAULT 'GOOD (0x00000000)',
    current_value           TEXT,
    is_writable             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_subscribed           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_updated            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_channel_node_id UNIQUE (channel_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_wo_net_tag_chan ON wo.network_device_tag(channel_id);
CREATE INDEX IF NOT EXISTS idx_wo_net_tag_folder ON wo.network_device_tag(channel_id, folder_path);

-- Seed Initial Device Tags for Siemens S7-1500 Infeed PLC
INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'InfeedMotor_RunCmd', 'ns=3;s="DB100"."RunCmd"', 'DB100_MotorControl', 'Boolean', 'GOOD (0x00000000)', 'true', true, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'MotorSpeed_RPM', 'ns=3;s="DB100"."Speed_RPM"', 'DB100_MotorControl', 'Int16', 'GOOD (0x00000000)', '1450', true, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'TotalCartonsPassed', 'ns=3;s="DB100"."CartonCounter"', 'DB100_MotorControl', 'Int32', 'GOOD (0x00000000)', '12480', true, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'PalletAtStop_PE01', 'ns=3;s="DB101"."Pallet_AtStop_PE01"', 'DB101_PhotoEyes', 'Boolean', 'GOOD (0x00000000)', 'false', false, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'DivertClear_PE02', 'ns=3;s="DB101"."DivertClear_PE02"', 'DB101_PhotoEyes', 'Boolean', 'GOOD (0x00000000)', 'true', false, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'EmergencyStop_Active', 'ns=3;s="DB102"."EStop_Active"', 'DB102_FaultTags', 'Boolean', 'GOOD (0x00000000)', 'false', false, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'JamDetected', 'ns=3;s="DB102"."JamDetected"', 'DB102_FaultTags', 'Boolean', 'GOOD (0x00000000)', 'false', false, true
FROM wo.network_device_channel WHERE channel_code = 'SIEMENS_S7_1500_LINE_1'
ON CONFLICT (channel_id, node_id) DO NOTHING;

-- Seed Initial Device Tags for Rockwell ControlLogix Outfeed
INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'Turntable_StartCmd', 'ns=1;s=Turntable_StartCmd', 'Program:MainProgram', 'Boolean', 'GOOD (0x00000000)', 'true', true, true
FROM wo.network_device_channel WHERE channel_code = 'ROCKWELL_CONTROLLOGIX_OUTFEED'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'Turntable_Speed', 'ns=1;s=Turntable_Speed', 'Program:MainProgram', 'Float', 'GOOD (0x00000000)', '32.5', true, true
FROM wo.network_device_channel WHERE channel_code = 'ROCKWELL_CONTROLLOGIX_OUTFEED'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'FilmTension_PSI', 'ns=1;s=FilmTension_PSI', 'Program:MainProgram', 'Float', 'GOOD (0x00000000)', '18.2', true, true
FROM wo.network_device_channel WHERE channel_code = 'ROCKWELL_CONTROLLOGIX_OUTFEED'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'WrapCycle_Complete', 'ns=1;s=WrapCycle_Complete', 'Program:MainProgram', 'Boolean', 'GOOD (0x00000000)', 'false', false, true
FROM wo.network_device_channel WHERE channel_code = 'ROCKWELL_CONTROLLOGIX_OUTFEED'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'LightCurtain_Muted', 'ns=1;s=LightCurtain_Muted', 'SafetyZone1', 'Boolean', 'GOOD (0x00000000)', 'false', false, true
FROM wo.network_device_channel WHERE channel_code = 'ROCKWELL_CONTROLLOGIX_OUTFEED'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'SafetyGate_Interlock', 'ns=1;s=SafetyGate_Interlock', 'SafetyZone1', 'Boolean', 'GOOD (0x00000000)', 'true', false, true
FROM wo.network_device_channel WHERE channel_code = 'ROCKWELL_CONTROLLOGIX_OUTFEED'
ON CONFLICT (channel_id, node_id) DO NOTHING;

-- Seed Initial Device Tags for Beckhoff TwinCAT AGV
INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'TargetStation_ID', 'ns=2;s=GVL_Motion.TargetStation_ID', 'GVL_Motion', 'Int32', 'GOOD (0x00000000)', '104', true, true
FROM wo.network_device_channel WHERE channel_code = 'BECKHOFF_TWINCAT_AGV'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'VehicleSpeed_mps', 'ns=2;s=GVL_Motion.Speed_mps', 'GVL_Motion', 'Float', 'GOOD (0x00000000)', '1.8', true, true
FROM wo.network_device_channel WHERE channel_code = 'BECKHOFF_TWINCAT_AGV'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'Navigate_Execute', 'ns=2;s=GVL_Motion.Execute', 'GVL_Motion', 'Boolean', 'GOOD (0x00000000)', 'true', true, true
FROM wo.network_device_channel WHERE channel_code = 'BECKHOFF_TWINCAT_AGV'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'BatterySOC_Percent', 'ns=2;s=BatteryManagement.SOC', 'BatteryManagement', 'Float', 'GOOD (0x00000000)', '87.4', false, true
FROM wo.network_device_channel WHERE channel_code = 'BECKHOFF_TWINCAT_AGV'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'ChargingContact_Engaged', 'ns=2;s=BatteryManagement.Charging', 'BatteryManagement', 'Boolean', 'GOOD (0x00000000)', 'false', false, true
FROM wo.network_device_channel WHERE channel_code = 'BECKHOFF_TWINCAT_AGV'
ON CONFLICT (channel_id, node_id) DO NOTHING;

-- Seed Initial Device Tags for Kuka Palletizing Robot
INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'Axis1_Angle_Deg', 'ns=4;s=Robot.Axis1.Angle', 'Robot_Kinematics', 'Float', 'GOOD (0x00000000)', '45.2', false, true
FROM wo.network_device_channel WHERE channel_code = 'KUKA_ROBOT_CELL_01'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'Axis2_Angle_Deg', 'ns=4;s=Robot.Axis2.Angle', 'Robot_Kinematics', 'Float', 'GOOD (0x00000000)', '-12.8', false, true
FROM wo.network_device_channel WHERE channel_code = 'KUKA_ROBOT_CELL_01'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'ToolCenterPoint_Z', 'ns=4;s=Robot.TCP.Z', 'Robot_Kinematics', 'Float', 'GOOD (0x00000000)', '840.5', false, true
FROM wo.network_device_channel WHERE channel_code = 'KUKA_ROBOT_CELL_01'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'VacuumGrip_Engage', 'ns=4;s=Gripper.VacuumEngage', 'Gripper_IO', 'Boolean', 'GOOD (0x00000000)', 'true', true, true
FROM wo.network_device_channel WHERE channel_code = 'KUKA_ROBOT_CELL_01'
ON CONFLICT (channel_id, node_id) DO NOTHING;

INSERT INTO wo.network_device_tag (
    channel_id, tag_name, node_id, folder_path, data_type, quality, current_value, is_writable, is_subscribed
)
SELECT 
    id, 'PartSensed_PE', 'ns=4;s=Gripper.PartSensed', 'Gripper_IO', 'Boolean', 'GOOD (0x00000000)', 'true', false, true
FROM wo.network_device_channel WHERE channel_code = 'KUKA_ROBOT_CELL_01'
ON CONFLICT (channel_id, node_id) DO NOTHING;
