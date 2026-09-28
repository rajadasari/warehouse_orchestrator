-- ============================================================================
-- V22: Remove Initial Hardcoded Seeded Network Device Channels and Tags
-- Allows the environment to start completely clean for real user-added devices
-- ============================================================================

DELETE FROM wo.network_device_tag 
WHERE channel_id IN (
    SELECT id FROM wo.network_device_channel 
    WHERE channel_code IN (
        'SIEMENS_S7_1500_LINE_1',
        'ROCKWELL_CONTROLLOGIX_OUTFEED',
        'BECKHOFF_TWINCAT_AGV',
        'KUKA_ROBOT_CELL_01'
    )
);

DELETE FROM wo.network_device_channel 
WHERE channel_code IN (
    'SIEMENS_S7_1500_LINE_1',
    'ROCKWELL_CONTROLLOGIX_OUTFEED',
    'BECKHOFF_TWINCAT_AGV',
    'KUKA_ROBOT_CELL_01'
);
